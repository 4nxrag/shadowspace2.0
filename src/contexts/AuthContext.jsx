import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage for existing session
    const storedUser = localStorage.getItem('shadowspace_user');
    const storedToken = localStorage.getItem('shadowspace_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
      
      // Set Supabase auth session
      supabase.auth.setSession({
        access_token: storedToken,
        refresh_token: storedToken,
      }).catch(err => {
        console.error('Failed to set session:', err);
        // Don't logout on error, just log it
      });
    }
    setLoading(false);
  }, []);

  // Auto-refresh token when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && token) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error || !session) {
            console.log('Session expired, please login again');
            // Optionally logout user
            // logout();
          }
        } catch (err) {
          console.error('Token verification failed:', err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('shadowspace_user', JSON.stringify(userData));
    localStorage.setItem('shadowspace_token', authToken);
    
    // Set Supabase session
    supabase.auth.setSession({
      access_token: authToken,
      refresh_token: authToken,
    }).catch(err => {
      console.error('Failed to set session:', err);
    });
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('shadowspace_user');
    localStorage.removeItem('shadowspace_token');
    supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
