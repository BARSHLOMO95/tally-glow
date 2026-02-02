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

      // Determine if extraction succeeded or failed
      const extractionFailed = !invoiceData;

      // Log received additional_images
      console.log('📸 Received from client:', {
        additional_images: body.additional_images,
        is_array: Array.isArray(body.additional_images),
        count: body.additional_images?.length || 0
      });

      // Build invoice record - use empty fields if extraction failed
      const additionalImages = body.additional_images || [];
      console.log('📸 Additional images received:', JSON.stringify(additionalImages), 'Type:', typeof additionalImages, 'Is Array:', Array.isArray(additionalImages));

      const invoiceToInsert = {
        user_id: userId,
        intake_date: new Date().toISOString(),
        document_date: invoiceData?.document_date || null,
        status: extractionFailed ? 'ממתין לבדיקה ידנית' : 'חדש',
        supplier_name: invoiceData?.supplier_name || null,
        document_number: invoiceData?.document_number || null,
        document_type: invoiceData?.document_type || null,
        category: invoiceData?.category || null,
        amount_before_vat: invoiceData?.amount_before_vat || null,
        vat_amount: invoiceData?.vat_amount || null,
        total_amount: invoiceData?.total_amount || null,
        business_type: invoiceData?.business_type || null,
        entry_method: invoiceData?.entry_method || 'דיגיטלי',
        image_url: imageUrlForAI,
        preview_image_url: body.preview_image_url || null,
        additional_images: additionalImages.length > 0 ? additionalImages : null,
      };

      console.log('📝 About to insert:', {
        additional_images_value: invoiceToInsert.additional_images,
        additional_images_type: typeof invoiceToInsert.additional_images,
        additional_images_is_array: Array.isArray(invoiceToInsert.additional_images)
      });

      const { data, error } = await supabase
        .from('invoices')
        .insert([invoiceToInsert])
        .select();

      console.log('💾 Insert result:', {
        success: !error,
        error: error?.message,
        saved_additional_images: data?.[0]?.additional_images,
        saved_count: data?.[0]?.additional_images?.length || 0
      });

      if (error) {
        console.error('Database error:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully inserted invoice:', data);
      if (data && data[0]) {
        console.log('📸 Saved additional_images:', data[0].additional_images, 'Count:', data[0].additional_images?.length || 0);
      }
      
      // Increment document usage
      await incrementDocumentUsage(supabase, userId, 1);
      
      // Send WhatsApp notification
      const userSettings = await getUserSettings(supabase, userId);
      if (extractionFailed) {
        await sendWhatsAppNotification(false, null, imageUrlForAI, 'המסמך נשמר אך לא ניתן היה לחלץ את הפרטים - ממתין לבדיקה ידנית', userSettings);
      } else {
        await sendWhatsAppNotification(true, invoiceData, imageUrlForAI, undefined, userSettings);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          inserted: 1, 
          data, 
          extracted: invoiceData,
          pending_manual_review: extractionFailed 
        }),
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

    // Increment document usage
    if (data && data.length > 0) {
      await incrementDocumentUsage(supabase, userId, data.length);
    }

    // Send WhatsApp notification for regular imports
    if (data && data.length > 0) {
      const userSettings = await getUserSettings(supabase, userId);
      for (const invoice of data) {
        await sendWhatsAppNotification(true, invoice, invoice.image_url, undefined, userSettings);
      }
    }

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

3. "סוג מסמך": Identify the type. ONLY these are valid accounting documents: "חשבונית מס", "חשבונית מס קבלה", "קבלה". Any other type (like "חשבונית עסקה", "הזמנה", "הצעת מחיר", etc.) should be marked as "אחר" (not a valid accounting document).

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
   - Set to "true" ONLY if "סוג מסמך" is exactly "חשבונית מס", "חשבונית מס קבלה", or "קבלה".
   - Set to "false" if "שם הספק" is "בר שלמה" or "החווה של צביקה" (Self-issued/Income).
   - Set to "false" for any other document type (חשבונית עסקה, הזמנה, הצעת מחיר, etc.).

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

    const documentType = parsed['סוג מסמך'] || null;
    let businessType = mapBusinessType(parsed['סוג עוסק']);
    
    // Validation: Tax invoices cannot be from exempt dealers
    // עוסק פטור cannot issue חשבונית מס or חשבונית מס קבלה - only קבלה
    if (businessType === 'עוסק פטור' && 
        (documentType === 'חשבונית מס' || documentType === 'חשבונית מס קבלה')) {
      console.log('Correcting business_type: Tax invoice cannot be from עוסק פטור, changing to עוסק מורשה');
      businessType = 'עוסק מורשה';
    }

    return {
      supplier_name: parsed['שם הספק'] || null,
      document_date: parseDate(parsed['תאריך מסמך']),
      document_number: parsed['מספר מסמך'] || null,
      document_type: documentType,
      amount_before_vat: parsed['סכום לפני מע"מ'] || parsed['סכום לפני מע״מ'] || null,
      vat_amount: parsed['מע"מ'] || parsed['מע״מ'] || null,
      total_amount: parsed['סכום כולל מע"מ'] || parsed['סכום כולל מע״מ'] || null,
      category: parsed['קטגוריה'] || null,
      business_type: businessType,
      entry_method: parsed['פורמט מסמך'] || 'דיגיטלי',
      is_valid_tax_document: parsed['is_valid_tax_document'] ?? true,
    };

  } catch (error) {
    console.error('Error analyzing image:', error);
    return null;
  }
}

// Increment document usage for user
async function incrementDocumentUsage(supabase: any, userId: string, count: number): Promise<void> {
  try {
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Get current usage
    const { data: existing } = await supabase
      .from('document_usage')
      .select('document_count')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .maybeSingle();
    
    const currentCount = existing?.document_count || 0;
    
    // Upsert usage
    const { error } = await supabase
      .from('document_usage')
      .upsert({
        user_id: userId,
        month_year: monthYear,
        document_count: currentCount + count,
      }, {
        onConflict: 'user_id,month_year',
      });

    if (error) {
      console.error('Error incrementing document usage:', error);
    } else {
      console.log(`Document usage incremented: ${currentCount} -> ${currentCount + count} for user ${userId}`);
    }
  } catch (error) {
    console.error('Error incrementing document usage:', error);
  }
}

// Get user settings from database
async function getUserSettings(supabase: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('whatsapp_number, whatsapp_group_id, phone_number, company_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user settings:', error);
      return null;
    }
    return data;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return null;
  }
}

// WhatsApp notification function - using Green-API
async function sendWhatsAppNotification(
  success: boolean, 
  invoiceData?: any, 
  imageUrl?: string,
  errorMessage?: string,
  userSettings?: any
): Promise<void> {
  // Green-API credentials (hardcoded as specified)
  const INSTANCE_ID = '7103131302';
  const API_TOKEN = '7df3b4758f35446bab49f8200939bc9982cd8015603d4526b0';
  
  // Get user's phone number from settings
  const userPhoneNumber = userSettings?.phone_number;
  
  if (!userPhoneNumber) {
    console.log('WhatsApp notification skipped - no phone_number configured in user settings');
    return;
  }
  
  // Format phone for WhatsApp chatId: phone@c.us
  // Remove any non-numeric characters and ensure proper format
  const cleanPhone = userPhoneNumber.replace(/\D/g, '');
  const chatId = `${cleanPhone}@c.us`;
  
  const companyName = userSettings?.company_name || 'המערכת';
  
  // Build message with available fields, marking missing ones
  const getFieldValue = (value: any, fieldName: string): string => {
    if (value === null || value === undefined || value === '' || value === 0) {
      return `חסר מידע: ${fieldName}`;
    }
    return String(value);
  };
  
  let message: string;
  
  if (success && invoiceData) {
    const docNumber = getFieldValue(invoiceData.document_number, 'מספר מסמך');
    const supplier = getFieldValue(invoiceData.supplier_name, 'שם ספק');
    const docType = getFieldValue(invoiceData.document_type, 'סוג מסמך');
    const category = getFieldValue(invoiceData.category, 'קטגוריה');
    const totalAmount = invoiceData.total_amount ? `${invoiceData.total_amount} ₪` : 'חסר מידע: סכום';
    const docDate = getFieldValue(invoiceData.document_date, 'תאריך מסמך');
    const businessType = getFieldValue(invoiceData.business_type, 'סוג עוסק');
    
    message = `📄 מסמך נקלט בהצלחה - ${companyName}

📋 פרטי המסמך:
• מספר מסמך: ${docNumber}
• ספק: ${supplier}
• תאריך: ${docDate}
• סוג מסמך: ${docType}
• סוג עוסק: ${businessType}
• קטגוריה: ${category}
• סכום כולל מע״מ: ${totalAmount}

🔗 לצפייה במסמך:
${imageUrl || 'לא זמין'}`;
  } else {
    message = `📄 מסמך התקבל - ${companyName}

${errorMessage || 'המסמך נשמר בהצלחה וממתין לבדיקה ידנית.'}

🔗 לצפייה במסמך:
${imageUrl || 'לא זמין'}`;
  }

  try {
    // Green-API endpoint
    const apiUrl = `https://api.green-api.com/waInstance${INSTANCE_ID}/sendMessage/${API_TOKEN}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId: chatId,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp API error:', response.status, errorText);
    } else {
      const result = await response.json();
      console.log('WhatsApp notification sent successfully to', chatId, 'Response:', JSON.stringify(result));
    }
  } catch (error) {
    console.error('Error sending WhatsApp notification:', error);
  }
}
