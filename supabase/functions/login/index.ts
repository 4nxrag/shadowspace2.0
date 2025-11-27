import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: 'Username and password required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Supabase handles password verification automatically
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: `${username}@shadowspace.local`,
      password: password,
    });

    if (signInError) {
      console.error('Sign in error:', signInError);
      return new Response(
        JSON.stringify({ error: 'Invalid username or password' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user metadata from our users table
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use maybeSingle() instead of single() to handle no results gracefully
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('username, anonymous_name')
      .eq('id', sessionData.user.id)
      .maybeSingle(); // Changed from .single() to .maybeSingle()

    if (userError) {
      console.error('User fetch error:', userError);
      throw userError;
    }

    if (!userData) {
      return new Response(
        JSON.stringify({ error: 'User data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        user: {
          id: sessionData.user.id,
          username: userData.username,
          anonymousName: userData.anonymous_name,
        },
        token: sessionData.session.access_token,
        refreshToken: sessionData.session.refresh_token,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Login failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
