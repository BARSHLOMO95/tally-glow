import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

const TOPIC_NAME = 'projects/lnvy-483613/topics/gmail-notifications';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get all active Gmail connections
    const { data: connections, error } = await supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('is_active', true);

    if (error || !connections || connections.length === 0) {
      console.log('No active Gmail connections to renew');
      return new Response(JSON.stringify({ ok: true, renewed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Renewing watch for ${connections.length} connections`);

    let renewed = 0;
    let failed = 0;

    for (const connection of connections) {
      try {
        // Refresh token if expired
        let accessToken = connection.access_token;
        if (new Date(connection.token_expires_at) <= new Date()) {
          const refreshResult = await refreshAccessToken(connection.refresh_token);
          if (refreshResult.error) {
            console.error(`Token refresh failed for ${connection.email}:`, refreshResult.error);
            await supabaseAdmin
              .from('gmail_connections')
              .update({ is_active: false })
              .eq('id', connection.id);
            failed++;
            continue;
          }
          accessToken = refreshResult.access_token;
          const expiresAt = new Date(Date.now() + (refreshResult.expires_in * 1000));
          await supabaseAdmin
            .from('gmail_connections')
            .update({
              access_token: accessToken,
              token_expires_at: expiresAt.toISOString(),
            })
            .eq('id', connection.id);
        }

        // Re-register watch
        const watchResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicName: TOPIC_NAME,
            labelIds: ['INBOX'],
          }),
        });

        const watchResult = await watchResponse.json();

        if (watchResult.historyId) {
          console.log(`Watch renewed for ${connection.email}, historyId: ${watchResult.historyId}`);
          await supabaseAdmin
            .from('gmail_connections')
            .update({ last_history_id: watchResult.historyId })
            .eq('id', connection.id);
          renewed++;
        } else {
          console.error(`Watch renewal failed for ${connection.email}:`, JSON.stringify(watchResult));
          failed++;
        }
      } catch (err) {
        console.error(`Error renewing watch for ${connection.email}:`, err);
        failed++;
      }
    }

    console.log(`Watch renewal complete: ${renewed} renewed, ${failed} failed`);

    return new Response(JSON.stringify({ ok: true, renewed, failed }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Watch renewal error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });
  return response.json();
}
