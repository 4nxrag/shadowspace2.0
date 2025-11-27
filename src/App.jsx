import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/Auth/AuthPage';
import PostComposer from './components/Feed/PostComposer';
import FeedContainer from './components/Feed/FeedContainer';
import LocalStorageWarning from './components/LocalStorageWarning';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';

function App() {
  const { user, loading, logout } = useAuth();
  const [newPost, setNewPost] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-zinc-200">
      {/* Add local storage warning */}
      <LocalStorageWarning />
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
      
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-lg bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 py-4 md:py-5 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-accent">ShadowSpace</h1>
            <p className="text-xs md:text-sm text-zinc-500">{user.anonymousName}</p>
          </div>
          <button onClick={logout} className="btn-secondary text-sm md:text-base">
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6">
        <PostComposer onPostCreated={setNewPost} />
        <FeedContainer newPost={newPost} />
      </main>
    </div>
  );
}

export default App;
