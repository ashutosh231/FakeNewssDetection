import { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, logoutUser as apiLogout } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Initialize from localStorage for instant hydration (no flash)
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem('truthscan_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Persist user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('truthscan_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('truthscan_user');
    }
  }, [user]);

  // Validate session with backend on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const profile = await getProfile();
        setUser(profile);
      } catch {
        // Session expired or invalid — clear everything
        setUser(null);
        localStorage.removeItem('truthscan_user');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = (userData) => {
    setUser(userData);
    // Immediately refresh to get full profile data (createdAt, totalScans, etc.)
    getProfile().then(profile => setUser(profile)).catch(() => {});
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch { /* ignore */ }
    setUser(null);
    localStorage.removeItem('truthscan_user');
  };

  const refreshUser = async () => {
    try {
      const profile = await getProfile();
      setUser(profile);
    } catch { /* ignore */ }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
