import api, { clearTokens, setTokens } from './api';
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

export async function fetchMe(force = false): Promise<AuthUser | null> {
  if (!force && cachedUser !== undefined) {
    return cachedUser;
  }
  try {
    const { data } = await api.get('/auth/me');
    cachedUser = data.data as AuthUser;
    return cachedUser;
  } catch {
    cachedUser = null;
    return null;
  }
}
