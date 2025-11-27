import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import PostCard from './PostCard';

export default function FeedContainer({ newPost }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  // Fetch initial posts on mount
  useEffect(() => {
    fetchPosts();
  }, []);

  // Real-time subscription for new posts from OTHER users
  useEffect(() => {
    const channel = supabase
      .channel('posts-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          // Add new post to top of feed if not already there
          setPosts((prev) => {
            const exists = prev.some(p => p.id === payload.new.id);
            if (exists) return prev; // Prevent duplicates
            return [payload.new, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          // Update existing post (for vote counts, impressions)
          setPosts((prev) =>
            prev.map((post) =>
              post.id === payload.new.id ? payload.new : post
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handle new post from composer (optimistic update)
  useEffect(() => {
    if (newPost) {
      setPosts((prev) => {
        // Check if post already exists
        const exists = prev.some(p => p.id === newPost.id);
        if (exists) return prev;
        return [newPost, ...prev];
      });
    }
  }, [newPost]);

const fetchPosts = async () => {
  setLoading(true);
  setError(null);

  try {
    // Supabase client now has auth from context
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log('Fetched posts:', data?.length || 0); // Debug log
    console.log('Fetch error:', fetchError); // Debug log

    if (fetchError) {
      console.error('Supabase error:', fetchError);
      throw fetchError;
    }

    setPosts(data || []);
  } catch (err) {
    console.error('Fetch posts error:', err);
    setError('Failed to load posts. Please try again.');
  } finally {
    setLoading(false);
  }
};

  const handleImpression = async (postId) => {
    try {
      // Get current impression count
      const currentPost = posts.find((p) => p.id === postId);
      if (!currentPost) return;

      // Optimistically update local state
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, impressions: post.impressions + 1 }
            : post
        )
      );

      // Update in database
      const { error } = await supabase
        .from('posts')
        .update({ impressions: currentPost.impressions + 1 })
        .eq('id', postId);

      if (error) {
        // Rollback on error
        console.error('Impression update failed:', error);
        setPosts((prev) =>
          prev.map((post) =>
            post.id === postId
              ? { ...post, impressions: currentPost.impressions }
              : post
          )
        );
      }
    } catch (err) {
      console.error('Impression error:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        <p className="text-zinc-500 mt-4 text-sm md:text-base">Loading posts...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-8 text-center"
      >
        <svg className="w-12 h-12 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchPosts}
          className="btn-primary"
        >
          Try Again
        </button>
      </motion.div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass-card p-12 text-center"
      >
        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-zinc-500 mb-2 text-base md:text-lg">No posts yet</p>
        <p className="text-sm text-zinc-600">Be the first to share your thoughts!</p>
      </motion.div>
    );
  }

  // Posts feed
  return (
    <div>
      <AnimatePresence mode="popLayout">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onImpression={handleImpression}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
