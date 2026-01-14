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
    const polarAccessToken = Deno.env.get('POLAR_ACCESS_TOKEN')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { product_id, success_url, cancel_url } = body;

    if (!product_id) {
      return new Response(
        JSON.stringify({ error: 'product_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      // Create customer in Polar
      const polarCustomerResponse = await fetch('https://api.polar.sh/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${polarAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0],
          external_id: user.id,
        }),
      });

      if (!polarCustomerResponse.ok) {
        const errorData = await polarCustomerResponse.json();
        console.error('Failed to create Polar customer:', errorData);
        return new Response(
          JSON.stringify({ error: 'Failed to create customer in Polar' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const polarCustomer = await polarCustomerResponse.json();

      // Save customer to database
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          user_id: user.id,
          polar_customer_id: polarCustomer.id,
          email: user.email,
          name: polarCustomer.name,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to save customer:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to save customer' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customer = newCustomer;

      // Create free subscription for new customer
      await supabase
        .from('subscriptions')
        .insert({
          customer_id: customer.id,
          status: 'free',
        });
    }

    // Create checkout session in Polar
    const checkoutResponse = await fetch('https://api.polar.sh/v1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${polarAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id,
        customer_id: customer.polar_customer_id,
        success_url: success_url || `${req.headers.get('origin')}/settings?checkout=success`,
        cancel_url: cancel_url || `${req.headers.get('origin')}/settings?checkout=canceled`,
        metadata: {
          user_id: user.id,
        },
      }),
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      console.error('Failed to create checkout:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkout = await checkoutResponse.json();

    return new Response(
      JSON.stringify({ checkout_url: checkout.url }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Checkout error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
