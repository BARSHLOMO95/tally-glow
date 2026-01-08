import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received request:', JSON.stringify(body));

    const userId = body.user_id;
    if (!userId) {
      console.error('Missing user_id in request');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is an image URL request (AI analysis mode)
    // Support both direct image_url and invoices array with image_url only
    let imageUrlForAI: string | null = null;
    
    if (body.image_url) {
      imageUrlForAI = body.image_url;
    } else if (Array.isArray(body.invoices) && body.invoices.length === 1) {
      const firstInvoice = body.invoices[0];
      // If invoice only has image_url (and no other meaningful data), use AI mode
      const hasOnlyImageUrl = firstInvoice.image_url && 
        !firstInvoice.supplier_name && !firstInvoice['שם הספק'] &&
        !firstInvoice.total_amount && !firstInvoice['סכום כולל מע"מ'] && !firstInvoice['סכום כולל מע״מ'];
      if (hasOnlyImageUrl) {
        imageUrlForAI = firstInvoice.image_url;
      }
    }

    if (imageUrlForAI && openaiApiKey) {
      console.log('AI Analysis mode - analyzing image:', imageUrlForAI);
      
      const invoiceData = await analyzeInvoiceImage(imageUrlForAI, openaiApiKey);
      console.log('AI extracted data:', JSON.stringify(invoiceData));

      if (!invoiceData) {
        return new Response(
          JSON.stringify({ error: 'Failed to extract invoice data from image' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Insert the extracted invoice
      const invoiceToInsert = {
        user_id: userId,
        intake_date: new Date().toISOString(),
        document_date: invoiceData.document_date || null,
        status: 'חדש',
        supplier_name: invoiceData.supplier_name || null,
        document_number: invoiceData.document_number || null,
        document_type: invoiceData.document_type || null,
        category: invoiceData.category || null,
        amount_before_vat: invoiceData.amount_before_vat || null,
        vat_amount: invoiceData.vat_amount || null,
        total_amount: invoiceData.total_amount || null,
        business_type: invoiceData.business_type || null,
        entry_method: invoiceData.entry_method || 'דיגיטלי',
        image_url: imageUrlForAI,
      };

      console.log('Inserting AI-extracted invoice:', JSON.stringify(invoiceToInsert));

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceToInsert])
        .select();

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully inserted AI-extracted invoice:', data);
      return new Response(
        JSON.stringify({ success: true, inserted: 1, data, extracted: invoiceData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Original mode: receive invoice data directly
    const invoicesData = Array.isArray(body.invoices) ? body.invoices : [body];

    const parseDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return new Date().toISOString().split('T')[0];
    };

    const mapBusinessType = (type: string | null): string | null => {
      if (!type) return null;
      if (type === 'ספק חול' || type === 'ספק חו"ל' || type === 'ספק חו״ל') return 'ספק חו"ל';
      if (type === 'עוסק מורשה') return 'עוסק מורשה';
      if (type === 'עוסק פטור') return 'עוסק פטור';
      if (type === 'חברה בע"מ' || type === 'חברה בע״מ') return 'חברה בע"מ';
      return type;
    };

    const invoicesToInsert = invoicesData.map((invoice: any) => {
      const supplierName = invoice['שם הספק'] || invoice.supplier_name || null;
      const documentDate = invoice['תאריך מסמך'] || invoice.document_date;
      const documentType = invoice['סוג מסמך'] || invoice.document_type || null;
      const documentNumber = invoice['מספר מסמך'] || invoice.document_number || null;
      const rawTotalAmount = invoice['סכום כולל מע"מ'] || invoice['סכום כולל מע״מ'] || invoice.total_amount || invoice['סהכ'] || invoice['סה"כ'];
      const category = invoice['קטגוריה'] || invoice.category || null;
      const entryMethod = invoice['פורמט מסמך'] || invoice.entry_method || null;
      const businessType = invoice['סוג עוסק'] || invoice.business_type || null;
      const imageUrl = invoice['קישור לתמונה'] || invoice['תמונה'] || invoice.image_url || null;

      const parsedTotal = parseFloat(rawTotalAmount) || 0;

      return {
        user_id: userId,
        intake_date: invoice.intake_date || new Date().toISOString(),
        document_date: documentDate ? parseDate(documentDate) : null,
        status: invoice.status || 'חדש',
        supplier_name: supplierName,
        document_number: documentNumber,
        document_type: documentType,
        category: category,
        total_amount: parsedTotal || null,
        business_type: mapBusinessType(businessType),
        entry_method: entryMethod,
        image_url: imageUrl,
      };
    });

    console.log('Inserting invoices:', JSON.stringify(invoicesToInsert));

    const { data, error } = await supabase
      .from('invoices')
      .insert(invoicesToInsert)
      .select();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully inserted:', data?.length, 'invoices');

    return new Response(
      JSON.stringify({ success: true, inserted: data?.length || 0, data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Webhook error:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeInvoiceImage(imageUrl: string, apiKey: string): Promise<any> {
  const systemPrompt = `You are an expert Israeli accountant. Analyze the attached image for "החווה של צביקה" (a group hosting farm) and extract the details into a strict JSON format.

The keys MUST be in Hebrew as specified:

1. "שם הספק": Extract the supplier's name. Remove any double quotes (") from the name (e.g., change בע"מ to בעמ) to ensure valid JSON.

2. "תאריך מסמך": Format as DD/MM/YYYY.

3. "סוג מסמך": Identify the type: "חשבונית מס", "חשבונית מס קבלה", "קבלה", "חשבונית עסקה", "חשבונית (Invoice)", or "אחר".

4. "מספר מסמך": The invoice/receipt number. (Look for: מס' חשבונית / מספר מסמך / Invoice #. DO NOT confuse with the Supplier's ID/H.P).

5. "סכום לפני מע"מ": Number only.
   - If the invoice is in USD ($), convert the TOTAL amount to ILS by multiplying by 3.2.
   - Round to the nearest integer (no decimals).
   - For Exempt Dealers or Foreign Invoices, this is equal to the "סכום כולל מע"מ".

6. "מע"מ": The VAT amount.
   - If it is a Foreign Invoice (USD), return 0 (no Israeli VAT).
   - Otherwise, round to the nearest integer (no decimals).

7. "סכום כולל מע"מ": The final total amount (Number only).
   - If the invoice is in USD ($), convert to ILS by multiplying by 3.2.
   - Round to the nearest integer (no decimals).

8. "קטגוריה": Choose ONLY from this list:
   - "תחזוקה" (Repairs, supplies)
   - "סופרים (מזון)" (Food from Rami Levy, Shufersal, etc.)
   - "ספקים (פעילויות)" (Yoga, Paintball, Jeeps, Instructors)
   - "הנהלה וכלליות" (Office, Legal, Insurance)
   - "חשמל" (Electricity)
   - "ניקיון" (Cleaning products or services)
   - "תקשורת" (Internet, Phone)
   - "טכנולוגיה" (Software, CRM, Website)
   - "שיווק" (Facebook/Google Ads, Design)
   - "רכב" (Fuel, Garage, Licensing, Repairs)

9. "is_valid_tax_document": Boolean (true/false).
   - Set to "false" if "שם הספק" is "בר שלמה" or "החווה של צביקה" (Self-issued/Income).
   - Set to "true" if it is a "חשבונית מס", "חשבונית מס קבלה", "קבלה" (Exempt Dealer), OR a foreign "Invoice" (e.g., Google, Facebook, Render).
   - Set to "false" only for orders, price quotes, or non-invoices.

10. "פורמט מסמך": "דיגיטלי" (computer-printed) or "ידני" (handwritten).

11. "סוג עוסק":
    - "חברה בעמ" (If name includes בע"מ / Ltd or HP starts with 51).
    - "עוסק מורשה" (If VAT is 18% but not a company).
    - "עוסק פטור" (If it's a "קבלה" and VAT is 0).
    - "ספק חול" (If it is a foreign company like Google/Render).

Return ONLY a clean JSON object. No markdown, no notes.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'נתח את החשבונית הזו וחלץ את הנתונים:' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('No content in OpenAI response');
      return null;
    }

    console.log('OpenAI raw response:', content);

    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonStr.trim());
    
    // Map Hebrew keys to database fields
    const parseDate = (dateStr: string): string | null => {
      if (!dateStr) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return null;
    };

    const mapBusinessType = (type: string | null): string | null => {
      if (!type) return null;
      if (type === 'ספק חול' || type === 'ספק חו"ל' || type === 'ספק חו״ל') return 'ספק חו"ל';
      if (type === 'עוסק מורשה') return 'עוסק מורשה';
      if (type === 'עוסק פטור') return 'עוסק פטור';
      if (type === 'חברה בעמ' || type === 'חברה בע"מ' || type === 'חברה בע״מ') return 'חברה בע"מ';
      return type;
    };

    return {
      supplier_name: parsed['שם הספק'] || null,
      document_date: parseDate(parsed['תאריך מסמך']),
      document_number: parsed['מספר מסמך'] || null,
      document_type: parsed['סוג מסמך'] || null,
      amount_before_vat: parsed['סכום לפני מע"מ'] || parsed['סכום לפני מע״מ'] || null,
      vat_amount: parsed['מע"מ'] || parsed['מע״מ'] || null,
      total_amount: parsed['סכום כולל מע"מ'] || parsed['סכום כולל מע״מ'] || null,
      category: parsed['קטגוריה'] || null,
      business_type: mapBusinessType(parsed['סוג עוסק']),
      entry_method: parsed['פורמט מסמך'] || 'דיגיטלי',
      is_valid_tax_document: parsed['is_valid_tax_document'] ?? true,
    };

  } catch (error) {
    console.error('Error analyzing image:', error);
    return null;
  }
}
