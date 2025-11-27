import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`User ${outcome === 'accepted' ? 'accepted' : 'dismissed'} the install prompt`);
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-zinc-200 mb-1">
                  Install ShadowSpace
                </h3>
                <p className="text-xs text-zinc-500 mb-3">
                  Add to your home screen for quick access and offline support
                </p>
                
                <div className="flex gap-2">
                  <button
                    onClick={handleInstall}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm rounded-lg transition-colors"
                  >
                    Install
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm rounded-lg transition-colors"
                  >
                    Not now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
