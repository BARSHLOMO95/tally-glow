import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Received webhook payload:', JSON.stringify(body));

    // Extract user_id from the request - required field
    const userId = body.user_id;
    if (!userId) {
      console.error('Missing user_id in request');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle both single invoice and array of invoices
    const invoicesData = Array.isArray(body.invoices) ? body.invoices : [body];

    // Helper to parse date from DD/MM/YYYY format
    const parseDate = (dateStr: string): string => {
      if (!dateStr) return new Date().toISOString().split('T')[0];
      // Check if already in YYYY-MM-DD format
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
      // Parse DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return new Date().toISOString().split('T')[0];
    };

    // Map entry method from Hebrew
    const mapEntryMethod = (format: string): string => {
      if (format === 'דיגיטלי') return 'דיגיטלי';
      if (format === 'ידני') return 'ידני';
      return 'דיגיטלי';
    };

    const invoicesToInsert = invoicesData.map((invoice: any) => {
      // Support both Hebrew and English field names - keep empty values as null
      const supplierName = invoice['שם הספק'] || invoice.supplier_name || null;
      const documentDate = invoice['תאריך מסמך'] || invoice.document_date;
      const documentType = invoice['סוג מסמך'] || invoice.document_type || null;
      const documentNumber = invoice['מספר מסמך'] || invoice.document_number || null;
      const rawAmountBeforeVat = invoice['סכום לפני מע"מ'] || invoice['סכום לפני מע״מ'] || invoice.amount_before_vat;
      const rawVatAmount = invoice['מע"מ'] || invoice['מע״מ'] || invoice.vat_amount;
      const rawTotalAmount = invoice['סכום כולל מע"מ'] || invoice['סכום כולל מע״מ'] || invoice.total_amount;
      const category = invoice['קטגוריה'] || invoice.category || null;
      const entryMethod = invoice['פורמט מסמך'] || invoice.entry_method || null;
      const businessType = invoice['סוג עוסק'] || invoice.business_type || null;
      const imageUrl = invoice['קישור לתמונה'] || invoice['תמונה'] || invoice.image_url || null;

      // Parse raw amounts
      const parsedBeforeVat = parseFloat(rawAmountBeforeVat) || 0;
      const parsedTotal = parseFloat(rawTotalAmount) || 0;
      const parsedVat = rawVatAmount !== undefined && rawVatAmount !== '' && rawVatAmount !== 0 ? parseFloat(rawVatAmount) : null;

      // Calculate VAT based on business type
      // עוסק פטור and ספק חו"ל = 0% VAT
      // עוסק מורשה and חברה בע"מ = 18% VAT
      const isVatExempt = businessType === 'עוסק פטור' || businessType === 'ספק חו"ל';
      
      let finalAmountBeforeVat = parsedBeforeVat;
      let finalVatAmount = parsedVat;
      let finalTotalAmount = parsedTotal;

      if (isVatExempt) {
        // No VAT for exempt businesses
        finalVatAmount = 0;
        if (parsedTotal > 0) {
          finalAmountBeforeVat = parsedTotal;
          finalTotalAmount = parsedTotal;
        } else {
          finalTotalAmount = parsedBeforeVat;
        }
      } else {
        // 18% VAT for עוסק מורשה and חברה בע"מ
        if (parsedVat !== null && parsedVat > 0) {
          // VAT was provided explicitly
          finalVatAmount = parsedVat;
          if (parsedTotal > 0) {
            finalTotalAmount = parsedTotal;
            finalAmountBeforeVat = parsedBeforeVat > 0 ? parsedBeforeVat : parsedTotal - parsedVat;
          } else {
            finalTotalAmount = parsedBeforeVat + parsedVat;
          }
        } else if (parsedBeforeVat > 0 && parsedTotal > 0 && parsedBeforeVat === parsedTotal) {
          // Same amount before and after VAT - need to extract 18% from total
          // total = before_vat * 1.18, so before_vat = total / 1.18
          finalAmountBeforeVat = Math.round((parsedTotal / 1.18) * 100) / 100;
          finalVatAmount = Math.round((parsedTotal - finalAmountBeforeVat) * 100) / 100;
          finalTotalAmount = parsedTotal;
        } else if (parsedTotal > 0 && parsedBeforeVat === 0) {
          // Only total provided - extract VAT
          finalAmountBeforeVat = Math.round((parsedTotal / 1.18) * 100) / 100;
          finalVatAmount = Math.round((parsedTotal - finalAmountBeforeVat) * 100) / 100;
          finalTotalAmount = parsedTotal;
        } else if (parsedBeforeVat > 0 && parsedTotal === 0) {
          // Only before VAT provided - calculate total
          finalVatAmount = Math.round((parsedBeforeVat * 0.18) * 100) / 100;
          finalTotalAmount = Math.round((parsedBeforeVat + finalVatAmount) * 100) / 100;
        } else if (parsedBeforeVat > 0 && parsedTotal > 0) {
          // Both provided and different - calculate VAT as difference
          finalVatAmount = Math.round((parsedTotal - parsedBeforeVat) * 100) / 100;
        }
      }

      console.log(`VAT Calculation - Business: ${businessType}, Before: ${parsedBeforeVat}, Total: ${parsedTotal}, Raw VAT: ${parsedVat} => Final Before: ${finalAmountBeforeVat}, Final VAT: ${finalVatAmount}, Final Total: ${finalTotalAmount}`);

      return {
        user_id: userId,
        intake_date: invoice.intake_date || new Date().toISOString().split('T')[0],
        document_date: documentDate ? parseDate(documentDate) : null,
        status: invoice.status || 'חדש',
        supplier_name: supplierName,
        document_number: documentNumber,
        document_type: documentType,
        category: category,
        amount_before_vat: finalAmountBeforeVat,
        vat_amount: finalVatAmount,
        total_amount: finalTotalAmount || finalAmountBeforeVat,
        business_type: businessType,
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
