import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('Missing Google OAuth credentials: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
      return new Response(JSON.stringify({ error: 'חסרים פרטי OAuth של Google - יש להגדיר GOOGLE_CLIENT_ID ו-GOOGLE_CLIENT_SECRET בהגדרות Supabase' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase credentials: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set');
      return new Response(JSON.stringify({ error: 'חסרים פרטי Supabase - יש להגדיר SUPABASE_URL ו-SUPABASE_SERVICE_ROLE_KEY' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get('Authorization');
    
    // Parse body
    const body = await req.json().catch(() => ({}));
    const { redirectUrl, code, accountLabel } = body;

    // Determine action based on body content
    // - If code is present: exchange code for tokens
    // - If redirectUrl only: get auth URL
    // - If neither: disconnect

    // Get user for authenticated actions
    const token = authHeader?.replace('Bearer ', '');
    let user = null;
    
    if (token) {
      const { data, error: userError } = await supabaseAdmin.auth.getUser(token);
      if (!userError && data.user) {
        user = data.user;
      }
    }

    // Exchange code for tokens (OAuth callback)
    if (code && redirectUrl) {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Exchanging code for tokens with redirect_uri:', redirectUrl);

      // Exchange code for tokens
      let tokenResponse;
      try {
        tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            redirect_uri: redirectUrl,
            grant_type: 'authorization_code',
          }),
        });
      } catch (fetchErr) {
        console.error('Failed to reach Google token endpoint:', fetchErr);
        return new Response(JSON.stringify({ error: 'שגיאת רשת בעת החלפת קוד אימות - לא ניתן להתחבר לשרתי Google' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const tokens = await tokenResponse.json();
      console.log('Token exchange response status:', tokenResponse.status, 'has refresh_token:', !!tokens.refresh_token);

      if (tokens.error) {
        console.error('Token exchange error:', JSON.stringify(tokens));
        return new Response(JSON.stringify({ error: `שגיאת Google OAuth: ${tokens.error_description || tokens.error}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!tokens.refresh_token) {
        console.error('No refresh_token received from Google. User may need to revoke app access and re-authorize.');
        return new Response(JSON.stringify({ error: 'לא התקבל refresh token מגוגל. נסה להסיר את ההרשאה מחשבון הגוגל ולחבר מחדש.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get user email from Google
      let userInfoResponse;
      try {
        userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
      } catch (fetchErr) {
        console.error('Failed to reach Google userinfo endpoint:', fetchErr);
        return new Response(JSON.stringify({ error: 'שגיאת רשת בעת קבלת פרטי המשתמש מ-Google' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const userInfo = await userInfoResponse.json();

      console.log('Got user info:', userInfo.email);

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));
      const label = accountLabel || 'תיבת מייל חדשה';

      // Check if connection already exists for this user + email combo
      const { data: existing } = await supabaseAdmin
        .from('gmail_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', userInfo.email)
        .maybeSingle();

      // Build the connection data - only include account_label if column exists
      const baseData: Record<string, unknown> = {
        user_id: user.id,
        email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: expiresAt.toISOString(),
        is_active: true,
      };

      // Try with account_label first, fall back without it
      let result;
      if (existing) {
        // Update existing connection
        console.log('Updating existing connection:', existing.id);
        result = await supabaseAdmin
          .from('gmail_connections')
          .update({ ...baseData, account_label: label })
          .eq('id', existing.id)
          .select()
          .single();

        // If update failed (possibly because account_label column doesn't exist), retry without it
        if (result.error) {
          console.log('Update with account_label failed, retrying without it:', result.error.message);
          result = await supabaseAdmin
            .from('gmail_connections')
            .update(baseData)
            .eq('id', existing.id)
            .select()
            .single();
        }
      } else {
        // Insert new connection
        console.log('Inserting new connection for user:', user.id);
        result = await supabaseAdmin
          .from('gmail_connections')
          .insert({ ...baseData, account_label: label })
          .select()
          .single();

        // If insert failed (possibly because account_label column doesn't exist), retry without it
        if (result.error) {
          console.log('Insert with account_label failed, retrying without it:', result.error.message);
          result = await supabaseAdmin
            .from('gmail_connections')
            .insert(baseData)
            .select()
            .single();
        }
      }

      if (result.error) {
        console.error('Database save error:', JSON.stringify(result.error));
        return new Response(JSON.stringify({ error: `שגיאה בשמירת החיבור: ${result.error.message}` }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Gmail connection saved successfully:', result.data.id);

      // Register Gmail Pub/Sub watch for real-time notifications
      try {
        const watchResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            topicName: 'projects/lnvy-483613/topics/gmail-notifications',
            labelIds: ['INBOX'],
          }),
        });
        const watchResult = await watchResponse.json();
        console.log('Gmail watch registered:', JSON.stringify(watchResult));
        
        if (watchResult.historyId) {
          // Save the initial historyId
          await supabaseAdmin
            .from('gmail_connections')
            .update({ last_history_id: watchResult.historyId })
            .eq('id', result.data.id);
        }
      } catch (watchError) {
        console.error('Failed to register Gmail watch (non-blocking):', watchError);
        // Non-blocking - the connection still works, just without real-time sync
      }

      return new Response(JSON.stringify({
        success: true,
        email: userInfo.email,
        connectionId: result.data.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get auth URL (start OAuth flow)
    if (redirectUrl && !code) {
      console.log('Generating OAuth URL for redirect:', redirectUrl);
      
      const scopes = [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ].join(' ');

      const state = crypto.randomUUID();
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', redirectUrl);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ authUrl: authUrl.toString(), state }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Disconnect (no redirectUrl, no code - empty body or action: disconnect)
    if (!redirectUrl && !code) {
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Disconnecting Gmail for user:', user.id);

      // Delete connection
      const { error } = await supabaseAdmin
        .from('gmail_connections')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Delete error:', error);
        return new Response(JSON.stringify({ error: 'Failed to disconnect' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : '';
    console.error('Gmail auth error:', errMsg, errStack);
    return new Response(JSON.stringify({ error: `שגיאה פנימית: ${errMsg}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
