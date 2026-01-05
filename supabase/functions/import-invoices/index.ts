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
      // Support both Hebrew and English field names
      const supplierName = invoice['שם הספק'] || invoice.supplier_name;
      const documentDate = invoice['תאריך מסמך'] || invoice.document_date;
      const documentType = invoice['סוג מסמך'] || invoice.document_type || 'חשבונית מס';
      const documentNumber = invoice['מספר מסמך'] || invoice.document_number;
      const amountBeforeVat = invoice['סכום לפני מע"מ'] || invoice.amount_before_vat;
      const vatAmount = invoice['מע"מ'] || invoice.vat_amount;
      const totalAmount = invoice['סכום כולל מע"מ'] || invoice.total_amount;
      const category = invoice['קטגוריה'] || invoice.category;
      const entryMethod = invoice['פורמט מסמך'] || invoice.entry_method || 'דיגיטלי';
      const businessType = invoice['סוג עוסק'] || invoice.business_type || 'עוסק מורשה';
      const imageUrl = invoice['קישור לתמונה'] || invoice.image_url || null;

      return {
        user_id: userId,
        intake_date: invoice.intake_date || new Date().toISOString().split('T')[0],
        document_date: parseDate(documentDate),
        status: invoice.status || 'חדש',
        supplier_name: supplierName,
        document_number: documentNumber,
        document_type: documentType,
        category: category,
        amount_before_vat: parseFloat(amountBeforeVat),
        vat_amount: vatAmount ? parseFloat(vatAmount) : parseFloat(amountBeforeVat) * 0.18,
        total_amount: totalAmount ? parseFloat(totalAmount) : parseFloat(amountBeforeVat) * 1.18,
        business_type: businessType,
        entry_method: mapEntryMethod(entryMethod),
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
