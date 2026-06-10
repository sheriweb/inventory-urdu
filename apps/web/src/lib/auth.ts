import axios from 'axios';
import api, {
  clearTokens,
  ensureFreshAccessToken,
  hasStoredSession,
  refreshAccessToken,
  setTokens,
} from './api';
import type { AuthUser } from '@inventory-urdu/shared';

let cachedUser: AuthUser | null | undefined;

export function getAuthCacheState(): AuthUser | null | undefined {
  return cachedUser;
}

export function clearAuthCache() {
  cachedUser = undefined;
}

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  const { user, tokens } = data.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  setTokens(tokens.accessToken, tokens.refreshToken);
  cachedUser = user;
  return user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
  clearTokens();
  clearAuthCache();
}

const SESSION_REFRESH_MS = 6 * 60 * 60 * 1000;

export function scheduleSessionKeepAlive(): () => void {
  if (typeof window === 'undefined') return () => {};

  const refresh = () => {
    if (document.visibilityState === 'visible') {
      void ensureFreshAccessToken().then(() => fetchMe(true));
    }
  };

  void ensureFreshAccessToken();
  const intervalId = window.setInterval(() => {
    void ensureFreshAccessToken();
  }, SESSION_REFRESH_MS);

  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);

  return () => {
    window.clearInterval(intervalId);
    document.removeEventListener('visibilitychange', refresh);
    window.removeEventListener('focus', refresh);
  };
}

export async function fetchMe(force = false): Promise<AuthUser | null> {
  if (!force && cachedUser !== undefined) {
    return cachedUser;
  }

  if (!hasStoredSession()) {
    cachedUser = null;
    return null;
  }

  await ensureFreshAccessToken();

  try {
    const { data } = await api.get('/auth/me');
    cachedUser = data.data as AuthUser;
    return cachedUser;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const refreshed = await refreshAccessToken();
      if (refreshed) {
        try {
          const { data } = await api.get('/auth/me');
          cachedUser = data.data as AuthUser;
          return cachedUser;
        } catch {
          /* fall through */
        }
      }
      cachedUser = null;
      return null;
    }

    if (cachedUser) {
      return cachedUser;
    }

    return null;
  }
}
