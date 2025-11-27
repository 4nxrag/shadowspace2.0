import { useEffect, useState } from 'react';
import { getLocalPostCount } from '../lib/localDB';

export default function LocalStorageWarning() {
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    // Check post count on mount
    getLocalPostCount().then(setPostCount);

    // Warn before page unload if posts exist
    const handleBeforeUnload = (e) => {
      if (postCount > 0) {
        e.preventDefault();
        // Modern browsers ignore custom messages, but preventDefault still works
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [postCount]);

  return null; // No UI, just side effects
}
