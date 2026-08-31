import type { AuthTokens, AuthUser } from '@nabta/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

type ApiResult<T> = { data: T } | { error: { code: string; message: string; details?: unknown } };

function getStoredTokens(): AuthTokens | null {
  const raw = localStorage.getItem('nabta.tokens');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens | null) {
  if (!tokens) {
    localStorage.removeItem('nabta.tokens');
    return;
  }
  localStorage.setItem('nabta.tokens', JSON.stringify(tokens));
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const tokens = getStoredTokens();
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const res = await fetch(`${API_URL}/api/v1${path}`, { ...init, headers });
  const json = (await res.json()) as ApiResult<T>;

  if (!res.ok || 'error' in json) {
    if (res.status === 401 && retry && tokens?.refreshToken && path !== '/auth/refresh') {
      const refreshed = await apiFetch<{ accessToken: string; refreshToken: string; user: AuthUser }>(
        '/auth/refresh',
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        },
        false,
      );
      setStoredTokens({
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
      });
      return apiFetch<T>(path, init, false);
    }
    const message =
      'error' in json ? json.error.message : `Request failed (${res.status})`;
    throw new Error(message);
  }

  return json.data;
}
