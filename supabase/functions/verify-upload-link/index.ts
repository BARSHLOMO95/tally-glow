import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple password hashing function (for comparison)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
    const { link_code, password } = body;

    if (!link_code || !password) {
      return new Response(
        JSON.stringify({ error: 'נדרש קוד לינק וסיסמה' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the upload link
    const { data: linkData, error: linkError } = await supabase
      .from('upload_links')
      .select('*')
      .eq('link_code', link_code)
      .eq('is_active', true)
      .single();

    if (linkError || !linkData) {
      console.log('Link not found:', link_code);
      return new Response(
        JSON.stringify({ error: 'לינק לא נמצא או לא פעיל' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify password
    const hashedPassword = await hashPassword(password);
    
    if (hashedPassword !== linkData.password_hash) {
      return new Response(
        JSON.stringify({ error: 'סיסמה שגויה' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return link data (without sensitive info)
    return new Response(
      JSON.stringify({
        user_id: linkData.user_id,
        name: linkData.name,
        link_code: linkData.link_code,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Verification error:', error);
    const message = error instanceof Error ? error.message : 'שגיאה לא ידועה';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
