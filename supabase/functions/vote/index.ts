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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { postId, voteType } = await req.json();

    if (!postId || !['upvote', 'downvote'].includes(voteType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid vote data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error('Invalid token');

    // Check existing vote
    const { data: existingVote } = await supabase
      .from('votes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingVote) {
      if (existingVote.vote_type === voteType) {
        // Remove vote
        await supabase.from('votes').delete().eq('id', existingVote.id);
        
        const field = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        await supabase.rpc('decrement_vote', { post_id: postId, field });
      } else {
        // Change vote
        await supabase
          .from('votes')
          .update({ vote_type: voteType })
          .eq('id', existingVote.id);

        const oldField = existingVote.vote_type === 'upvote' ? 'upvotes' : 'downvotes';
        const newField = voteType === 'upvote' ? 'upvotes' : 'downvotes';
        
        await supabase.rpc('decrement_vote', { post_id: postId, field: oldField });
        await supabase.rpc('increment_vote', { post_id: postId, field: newField });
      }
    } else {
      // New vote
      await supabase.from('votes').insert({
        post_id: postId,
        user_id: user.id,
        vote_type: voteType,
      });

      const field = voteType === 'upvote' ? 'upvotes' : 'downvotes';
      await supabase.rpc('increment_vote', { post_id: postId, field });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
