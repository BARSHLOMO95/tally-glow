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
      const rawTotalAmount = invoice['סכום כולל מע"מ'] || invoice['סכום כולל מע״מ'] || invoice.total_amount || invoice['סהכ'] || invoice['סה"כ'];
      const category = invoice['קטגוריה'] || invoice.category || null;
      const entryMethod = invoice['פורמט מסמך'] || invoice.entry_method || null;
      const businessType = invoice['סוג עוסק'] || invoice.business_type || null;
      const imageUrl = invoice['קישור לתמונה'] || invoice['תמונה'] || invoice.image_url || null;

      // Parse total amount - this is the only required amount field
      const parsedTotal = parseFloat(rawTotalAmount) || 0;

      // Always calculate VAT at 18% from total
      // total = before_vat + vat = before_vat * 1.18
      // before_vat = total / 1.18
      // vat = total - before_vat = total * 0.18 / 1.18
      const finalAmountBeforeVat = Math.round((parsedTotal / 1.18) * 100) / 100;
      const finalVatAmount = Math.round((parsedTotal - finalAmountBeforeVat) * 100) / 100;
      const finalTotalAmount = parsedTotal;

      console.log(`VAT Calculation - Total: ${parsedTotal} => Before VAT: ${finalAmountBeforeVat}, VAT: ${finalVatAmount}`);

      return {
        user_id: userId,
        intake_date: invoice.intake_date || new Date().toISOString(),
        document_date: documentDate ? parseDate(documentDate) : null,
        status: invoice.status || 'חדש',
        supplier_name: supplierName,
        document_number: documentNumber,
        document_type: documentType,
        category: category,
        amount_before_vat: finalAmountBeforeVat || null,
        vat_amount: finalVatAmount || null,
        total_amount: finalTotalAmount || null,
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
