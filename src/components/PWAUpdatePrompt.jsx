import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState(null);

  useEffect(() => {
    // Check for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              setShowUpdate(true);
              setRegistration(reg);
            }
          });
        });
      });

      // Check for updates every 60 seconds
      setInterval(() => {
        navigator.serviceWorker.ready.then((reg) => {
          reg.update();
        });
      }, 60000);
    }
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell service worker to skip waiting
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Reload page to activate new version
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {showUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
        >
          <div className="glass-card p-4 border-accent/30">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  Update Available
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  A new version of ShadowSpace is available
                </p>
                
                <button
                  onClick={handleUpdate}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors w-full"
                >
                  Update Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
