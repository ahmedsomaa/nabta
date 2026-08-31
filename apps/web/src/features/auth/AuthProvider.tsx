import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthUser } from '@nabta/types';
import { apiFetch, setStoredTokens } from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (schoolName: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>('/auth/me');
      setUser(me);
    } catch {
      setUser(null);
      setStoredTokens(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const raw = localStorage.getItem('nabta.tokens');
      if (!raw) {
        setLoading(false);
        return;
      }
      await refreshMe();
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(async (schoolName: string, email: string, password: string) => {
    const result = await apiFetch<{
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ schoolName, email, password }),
    });
    setStoredTokens({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    const raw = localStorage.getItem('nabta.tokens');
    if (raw) {
      try {
        const tokens = JSON.parse(raw) as { refreshToken?: string };
        if (tokens.refreshToken) {
          await apiFetch('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken: tokens.refreshToken }),
          });
        }
      } catch {
        // ignore
      }
    }
    setStoredTokens(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function roleHome(role: AuthUser['role']) {
  if (role === 'SYSTEM_ADMIN') return '/login';
  if (role === 'TEACHER') return '/teacher/dashboard';
  if (role === 'ADMIN') return '/admin/dashboard';
  return '/student/dashboard';
}
