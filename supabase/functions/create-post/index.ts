import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BLOCKED_KEYWORDS = ['gun', 'bomb', 'kill', 'suicide', 'rape'];
const FAKE_REGIONS = [
  'Northern Lights', 'Desert Storm', 'Shadow Valley',
  'Neon City', 'Silent Peak', 'Mystic Shore', 'Void Plains'
];

function containsBlockedKeyword(text: string): boolean {
  const lowerText = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function getFakeRegion(): string {
  return FAKE_REGIONS[Math.floor(Math.random() * FAKE_REGIONS.length)];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { content } = await req.json();

    // Validate content
    if (!content || content.length > 500 || content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Content must be 1-500 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Keyword filter
    if (containsBlockedKeyword(content)) {
      return new Response(
        JSON.stringify({ error: 'Post contains blocked keywords' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with SERVICE_ROLE_KEY for auth verification
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create post
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content: content.trim(),
        fake_region: getFakeRegion(),
      })
      .select()
      .single();

    if (postError) {
      console.error('Post creation error:', postError);
      throw postError;
    }

    return new Response(
      JSON.stringify({ post }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Create post error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
