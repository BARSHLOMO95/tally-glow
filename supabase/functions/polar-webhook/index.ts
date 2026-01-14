import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    console.log('Polar webhook received:', JSON.stringify(body));

    const eventType = body.type;
    const data = body.data;

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
        await handleSubscriptionChange(supabase, data);
        break;
      
      case 'subscription.canceled':
        await handleSubscriptionCanceled(supabase, data);
        break;

      case 'checkout.created':
        console.log('Checkout created:', data.id);
        break;

      case 'order.paid':
        console.log('Order paid:', data.id);
        break;

      default:
        console.log('Unhandled event type:', eventType);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleSubscriptionChange(supabase: any, data: any) {
  const polarCustomerId = data.customer_id;
  const polarSubscriptionId = data.id;
  const status = mapPolarStatus(data.status);
  const polarProductId = data.product_id;

  console.log('Processing subscription change:', { polarCustomerId, polarSubscriptionId, status, polarProductId });

  // Find customer by polar_customer_id
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id')
    .eq('polar_customer_id', polarCustomerId)
    .single();

  if (customerError || !customer) {
    console.error('Customer not found for polar_customer_id:', polarCustomerId);
    return;
  }

  // Find plan by polar_product_id
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('polar_product_id', polarProductId)
    .single();

  // Check if subscription exists
  const { data: existingSubscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('polar_subscription_id', polarSubscriptionId)
    .single();

  const subscriptionData = {
    customer_id: customer.id,
    plan_id: plan?.id || null,
    polar_subscription_id: polarSubscriptionId,
    status,
    current_period_start: data.current_period_start,
    current_period_end: data.current_period_end,
    cancel_at_period_end: data.cancel_at_period_end || false,
  };

  if (existingSubscription) {
    // Update existing subscription
    const { error } = await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('id', existingSubscription.id);

    if (error) {
      console.error('Error updating subscription:', error);
    } else {
      console.log('Subscription updated:', existingSubscription.id);
    }
  } else {
    // Create new subscription
    const { error } = await supabase
      .from('subscriptions')
      .insert(subscriptionData);

    if (error) {
      console.error('Error creating subscription:', error);
    } else {
      console.log('Subscription created for customer:', customer.id);
    }
  }
}

async function handleSubscriptionCanceled(supabase: any, data: any) {
  const polarSubscriptionId = data.id;

  const { error } = await supabase
    .from('subscriptions')
    .update({ 
      status: 'canceled',
      cancel_at_period_end: true 
    })
    .eq('polar_subscription_id', polarSubscriptionId);

  if (error) {
    console.error('Error canceling subscription:', error);
  } else {
    console.log('Subscription canceled:', polarSubscriptionId);
  }
}

function mapPolarStatus(polarStatus: string): string {
  const statusMap: Record<string, string> = {
    'incomplete': 'incomplete',
    'incomplete_expired': 'canceled',
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'canceled': 'canceled',
    'unpaid': 'past_due',
  };
  return statusMap[polarStatus] || 'free';
}
