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

const TOKEN_KEY = 'nabta.system.tokens';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiFetch<AuthUser>('/auth/me');
      if (me.role !== 'SYSTEM_ADMIN') {
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        setStoredTokens(null);
        return;
      }
      setUser(me);
    } catch {
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      setStoredTokens(null);
    }
  }, []);

  useEffect(() => {
    // Prefer system-admin token namespace; fall back to shared nabta.tokens for api.ts
    const systemRaw = localStorage.getItem(TOKEN_KEY);
    if (systemRaw) {
      localStorage.setItem('nabta.tokens', systemRaw);
    }
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
    if (result.user.role !== 'SYSTEM_ADMIN') {
      setStoredTokens(null);
      throw new Error('SYSTEM_ADMIN_REQUIRED');
    }
    const tokens = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    };
    setStoredTokens(tokens);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
    setUser(result.user);
    return result.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {
      /* ignore */
    }
    setStoredTokens(null);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
