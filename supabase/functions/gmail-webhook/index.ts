import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // Google Pub/Sub sends messages in this format
    const message = body.message;
    if (!message || !message.data) {
      console.log('No message data received');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Decode base64 data from Pub/Sub
    const decodedData = atob(message.data);
    const notification = JSON.parse(decodedData);
    
    console.log('Gmail Pub/Sub notification:', JSON.stringify(notification));
    
    const { emailAddress, historyId } = notification;
    
    if (!emailAddress || !historyId) {
      console.log('Missing emailAddress or historyId in notification');
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find the Gmail connection for this email
    const { data: connections, error: connError } = await supabaseAdmin
      .from('gmail_connections')
      .select('*')
      .eq('email', emailAddress)
      .eq('is_active', true);

    if (connError || !connections || connections.length === 0) {
      console.log(`No active connection found for ${emailAddress}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each connection (usually one per email, but could be multiple users)
    for (const connection of connections) {
      console.log(`Processing webhook for user ${connection.user_id}, email ${emailAddress}`);
      
      // Check if this historyId is newer than what we've seen
      const lastHistoryId = connection.last_history_id;
      if (lastHistoryId && BigInt(historyId) <= BigInt(lastHistoryId)) {
        console.log(`Skipping - historyId ${historyId} <= last seen ${lastHistoryId}`);
        continue;
      }

      // Refresh token if expired
      let accessToken = connection.access_token;
      if (new Date(connection.token_expires_at) <= new Date()) {
        console.log(`Token expired for ${emailAddress}, refreshing...`);
        const refreshResult = await refreshAccessToken(connection.refresh_token);
        if (refreshResult.error) {
          console.error(`Token refresh failed for ${emailAddress}:`, refreshResult.error);
          await supabaseAdmin
            .from('gmail_connections')
            .update({ is_active: false })
            .eq('id', connection.id);
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

      // Use history.list to get only new changes since last historyId
      const startHistoryId = lastHistoryId || historyId;
      const newMessageIds = await getNewMessageIds(accessToken, startHistoryId);
      
      console.log(`Found ${newMessageIds.length} new messages for ${emailAddress}`);

      if (newMessageIds.length > 0) {
        // Call gmail-sync function internally to process these messages
        // We trigger sync with a short time range since we know there are new messages
        const syncUrl = `${SUPABASE_URL}/functions/v1/gmail-sync`;
        
        // Create a service-level token for the user
        const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(connection.user_id);
        
        if (userError || !user) {
          console.error(`Failed to get user ${connection.user_id}:`, userError);
          continue;
        }

        // Generate a temporary session for the user to call gmail-sync
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'magiclink',
          email: user.email!,
        });

        // Instead of generating a session, call gmail-sync directly with service role
        // by invoking the sync logic for this specific connection
        try {
          const response = await fetch(syncUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              timeRange: 'week',
              connectionId: connection.id,
            }),
          });
          
          const result = await response.json();
          console.log(`Sync result for ${emailAddress}:`, JSON.stringify(result));
        } catch (syncError) {
          console.error(`Failed to trigger sync for ${emailAddress}:`, syncError);
        }
      }

      // Update the last_history_id
      await supabaseAdmin
        .from('gmail_connections')
        .update({ 
          last_history_id: historyId.toString(),
          last_sync_at: new Date().toISOString(),
        })
        .eq('id', connection.id);
    }

    // Always return 200 to acknowledge the Pub/Sub message
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Gmail webhook error:', error);
    // Still return 200 to prevent Pub/Sub retries on processing errors
    return new Response(JSON.stringify({ ok: true, error: String(error) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============= HELPER FUNCTIONS =============

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

async function getNewMessageIds(accessToken: string, startHistoryId: string): Promise<string[]> {
  const messageIds: string[] = [];
  
  try {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/history');
    url.searchParams.set('startHistoryId', startHistoryId);
    url.searchParams.set('historyTypes', 'messageAdded');
    url.searchParams.set('maxResults', '50');

    const response = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error(`History list failed: ${response.status}`);
      // If 404, the historyId is too old - we'll do a full sync
      if (response.status === 404) {
        console.log('History expired, will trigger full sync');
      }
      return messageIds;
    }

    const data = await response.json();
    
    if (data.history) {
      for (const entry of data.history) {
        if (entry.messagesAdded) {
          for (const added of entry.messagesAdded) {
            messageIds.push(added.message.id);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error fetching history:', error);
  }

  return messageIds;
}
