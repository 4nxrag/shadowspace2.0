import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Anonymous name generator
const adjectives = ['Shadow', 'Silent', 'Mystic', 'Neon', 'Dark', 'Phantom', 'Ghost', 'Void'];
const nouns = ['Raven', 'Wolf', 'Phoenix', 'Storm', 'Blade', 'Echo', 'Cipher', 'Wraith'];

function generateAnonymousName() {
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000);
  return `${adj}_${noun}_${num}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password || password.length < 6 || username.length < 3) {
      return new Response(
        JSON.stringify({ error: 'Username must be 3+ chars, password 6+ chars' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if username exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Username already exists' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase auth user (Supabase handles password hashing)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${username}@shadowspace.local`,
      password: password,
      email_confirm: true,
    });

    if (authError) throw authError;

    const anonymousName = generateAnonymousName();

    // Store user metadata - NO password_hash field!
    const { error: dbError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        username,
        anonymous_name: anonymousName,
        // REMOVED: password_hash line
      });

    if (dbError) throw dbError;

    // Sign in to get session token
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${username}@shadowspace.local`,
      password: password,
    });

    if (signInError) throw signInError;

    return new Response(
      JSON.stringify({
        user: {
          id: authData.user.id,
          username: username,
          anonymousName: anonymousName,
        },
        token: sessionData.session.access_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
