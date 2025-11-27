import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

export default function PostCard({ post, onImpression }) {
  const [vote, setVote] = useState(null);
  const [upvotes, setUpvotes] = useState(post.upvotes);
  const [downvotes, setDownvotes] = useState(post.downvotes);
  const [isVoting, setIsVoting] = useState(false); // Prevent double-click
  const [impressionCounted, setImpressionCounted] = useState(false);
  const cardRef = useRef(null);
  const impressionTimerRef = useRef(null);
  const { token } = useAuth();

  // Impression tracking (3+ seconds in viewport)
  useEffect(() => {
    if (impressionCounted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !impressionCounted) {
            // Start 3-second timer
            impressionTimerRef.current = setTimeout(() => {
              setImpressionCounted(true);
              if (onImpression) onImpression(post.id);
            }, 3000);
          } else {
            // Clear timer if element leaves viewport
            if (impressionTimerRef.current) {
              clearTimeout(impressionTimerRef.current);
              impressionTimerRef.current = null;
            }
          }
        });
      },
      { threshold: 0.5 } // At least 50% visible
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
      }
      observer.disconnect();
    };
  }, [impressionCounted, post.id, onImpression]);

  const handleVote = async (voteType) => {
    // Prevent double-clicking
    if (isVoting) return;
    setIsVoting(true);

    // Store previous state for rollback on error
    const prevVote = vote;
    const prevUpvotes = upvotes;
    const prevDownvotes = downvotes;

    try {
      // Optimistic update
      if (vote === voteType) {
        // Remove vote
        setVote(null);
        if (voteType === 'upvote') setUpvotes(prev => prev - 1);
        else setDownvotes(prev => prev - 1);
      } else {
        // Change or add vote
        if (vote === 'upvote') setUpvotes(prev => prev - 1);
        if (vote === 'downvote') setDownvotes(prev => prev - 1);
        
        setVote(voteType);
        if (voteType === 'upvote') setUpvotes(prev => prev + 1);
        else setDownvotes(prev => prev + 1);
      }

      // Send to server
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ postId: post.id, voteType }),
        }
      );

      if (!response.ok) {
        throw new Error('Vote failed');
      }
    } catch (err) {
      console.error('Vote error:', err);
      
      // Rollback on error
      setVote(prevVote);
      setUpvotes(prevUpvotes);
      setDownvotes(prevDownvotes);
    } finally {
      setIsVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-5 md:p-6 mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 md:px-4 md:py-1.5 bg-accent/10 border border-accent/20 
                         rounded-full text-xs md:text-sm text-accent font-medium">
            {post.fake_region}
          </span>
        </div>
        <span className="text-xs md:text-sm text-zinc-600">
          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
        </span>
      </div>

      {/* Content */}
      <p className="text-zinc-300 text-base md:text-lg leading-relaxed mb-4 md:mb-5 whitespace-pre-wrap break-words">
        {post.content}
      </p>

      {/* Actions */}
      <div className="flex items-center gap-4 md:gap-6">
        {/* Upvote */}
        <button
          onClick={() => handleVote('upvote')}
          disabled={isVoting}
          className={`icon-btn flex items-center gap-2 transition-colors ${
            vote === 'upvote' ? 'text-accent' : 'text-zinc-500 hover:text-accent'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Upvote"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          <span className="text-sm md:text-base font-medium">{upvotes}</span>
        </button>

        {/* Downvote */}
        <button
          onClick={() => handleVote('downvote')}
          disabled={isVoting}
          className={`icon-btn flex items-center gap-2 transition-colors ${
            vote === 'downvote' ? 'text-red-500' : 'text-zinc-500 hover:text-red-500'
          } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Downvote"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm md:text-base font-medium">{downvotes}</span>
        </button>

        {/* Score */}
        <div className="text-sm md:text-base text-zinc-600">
          Score: <span className={`font-medium ${score >= 0 ? 'text-accent' : 'text-red-500'}`}>{score}</span>
        </div>

        {/* Impressions */}
        <div className="flex items-center gap-1.5 text-zinc-600 ml-auto">
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-xs md:text-sm font-medium">{post.impressions}</span>
        </div>
      </div>
    </motion.div>
  );
}
