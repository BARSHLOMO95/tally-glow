import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')!;
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

      console.log('Exchanging code for tokens...');

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        console.error('Token exchange error:', tokens);
        return new Response(JSON.stringify({ error: tokens.error_description || tokens.error }), {
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
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoResponse.json();

      console.log('Got user info:', userInfo.email);

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      // Check if this email is already connected for this user
      const { data: existingConnection } = await supabaseAdmin
        .from('gmail_connections')
        .select('id')
        .eq('user_id', user.id)
        .eq('email', userInfo.email)
        .maybeSingle();

      if (existingConnection) {
        return new Response(JSON.stringify({ error: 'חשבון זה כבר מחובר' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user already has 3 connections
      const { count } = await supabaseAdmin
        .from('gmail_connections')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (count && count >= 3) {
        return new Response(JSON.stringify({ error: 'ניתן לחבר עד 3 חשבונות Gmail בלבד' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save new connection to database
      const label = accountLabel || `תיבת מייל ${(count || 0) + 1}`;

      const { data: newConnection, error: insertError } = await supabaseAdmin
        .from('gmail_connections')
        .insert({
          user_id: user.id,
          email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: expiresAt.toISOString(),
          is_active: true,
          account_label: label,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Database error:', insertError);
        return new Response(JSON.stringify({ error: 'Failed to save connection' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Gmail connection saved successfully:', newConnection.id);

      return new Response(JSON.stringify({
        success: true,
        email: userInfo.email,
        connectionId: newConnection.id
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
    console.error('Gmail auth error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
