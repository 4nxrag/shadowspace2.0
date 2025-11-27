import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { savePostLocally } from '../../lib/localDB';

export default function PostComposer({ onPostCreated }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const charLimit = 500;
  const charsRemaining = charLimit - content.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!content.trim()) {
      setError('Post cannot be empty');
      return;
    }
    
    if (content.length > charLimit) {
      setError('Post exceeds character limit');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-post`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ content: content.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create post');
      }

      // SUCCESS: Save locally (non-blocking)
      savePostLocally(data.post).catch(err => {
        console.warn('Local save failed, but post was created:', err);
      });

      // Clear form
      setContent('');
      
      // Notify parent
      if (onPostCreated) onPostCreated(data.post);
      
    } catch (err) {
      setError(err.message || 'Failed to create post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 md:p-6 mb-6"
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Share your thoughts anonymously..."
          className="w-full px-4 py-3 md:px-5 md:py-4 bg-zinc-900/50 border border-zinc-800 rounded-xl 
                     text-zinc-200 placeholder-zinc-500 focus:outline-none 
                     focus:border-accent focus:ring-2 focus:ring-accent/20 
                     transition-all duration-200 resize-none text-base md:text-lg"
          rows={4}
          maxLength={charLimit}
          disabled={loading}
          aria-label="Post content"
        />

        <div className="flex items-center justify-between mt-4">
          <div className="text-sm md:text-base">
            <span className={`font-medium ${
              charsRemaining < 50 ? 'text-amber-500' : 
              charsRemaining < 0 ? 'text-red-500' : 'text-zinc-500'
            }`}>
              {charsRemaining}
            </span>
            <span className="text-zinc-600 ml-1">characters remaining</span>
          </div>

          <button
            type="submit"
            disabled={loading || !content.trim() || content.length > charLimit}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Posting...
              </span>
            ) : (
              'Post'
            )}
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
          >
            {error}
          </motion.div>
        )}
      </form>
    </motion.div>
  );
}
