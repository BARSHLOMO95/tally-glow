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
    if (body.image_url && openaiApiKey) {
      console.log('AI Analysis mode - analyzing image:', body.image_url);
      
      const invoiceData = await analyzeInvoiceImage(body.image_url, openaiApiKey);
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
        total_amount: invoiceData.total_amount || null,
        business_type: invoiceData.business_type || null,
        entry_method: 'דיגיטלי',
        image_url: body.image_url,
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
  const systemPrompt = `אתה מומחה לניתוח חשבוניות ומסמכים פיננסיים. 
נתח את התמונה וחלץ את הנתונים הבאים בפורמט JSON בלבד:

{
  "supplier_name": "שם הספק",
  "document_date": "YYYY-MM-DD",
  "document_number": "מספר המסמך",
  "document_type": "חשבונית/קבלה/חשבונית מס/אחר",
  "total_amount": 123.45,
  "category": "קטגוריה מתאימה",
  "business_type": "עוסק מורשה/עוסק פטור/חברה בע״מ/ספק חו״ל"
}

כללים:
- total_amount חייב להיות מספר בלבד (ללא סימני מטבע)
- document_date בפורמט YYYY-MM-DD
- אם לא ניתן לזהות ערך, החזר null
- אם המסמך באנגלית או מספק זר, סמן business_type כ"ספק חו״ל"
- החזר רק JSON תקין, ללא טקסט נוסף`;

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
    return parsed;

  } catch (error) {
    console.error('Error analyzing image:', error);
    return null;
  }
}
