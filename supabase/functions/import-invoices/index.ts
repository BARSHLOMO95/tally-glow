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

    const invoicesToInsert = invoicesData.map((invoice: any) => ({
      user_id: userId,
      intake_date: invoice.intake_date || new Date().toISOString().split('T')[0],
      document_date: invoice.document_date,
      status: invoice.status || 'חדש',
      supplier_name: invoice.supplier_name,
      document_number: invoice.document_number,
      category: invoice.category,
      amount_before_vat: parseFloat(invoice.amount_before_vat),
      vat_amount: invoice.vat_amount ? parseFloat(invoice.vat_amount) : parseFloat(invoice.amount_before_vat) * 0.18,
      total_amount: invoice.total_amount ? parseFloat(invoice.total_amount) : parseFloat(invoice.amount_before_vat) * 1.18,
      business_type: invoice.business_type || 'עוסק מורשה',
      image_url: invoice.image_url || null,
    }));

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
