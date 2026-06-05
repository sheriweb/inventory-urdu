import api, { clearTokens, setTokens } from './api';
import type { AuthUser } from '@inventory-urdu/shared';

export async function login(email: string, password: string) {
  const { data } = await api.post('/auth/login', { email, password });
  const payload = data.data as { user: AuthUser; tokens: { accessToken: string; refreshToken: string } };
  if (payload.user.role !== 'SUPER_ADMIN') {
    clearTokens();
    throw new Error('Super admin only');
  }
  setTokens(payload.tokens.accessToken, payload.tokens.refreshToken);
  return payload.user;
}

export async function logout() {
  try {
    await api.post('/auth/logout');
  } catch {
    /* ignore */
  }
  clearTokens();
}

export async function fetchMe(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get('/auth/me');
    const user = data.data as AuthUser;
    if (user.role !== 'SUPER_ADMIN') return null;
    return user;
  } catch {
    return null;
  }
}
