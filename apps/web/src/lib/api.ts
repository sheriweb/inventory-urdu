import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { reportClientError } from './report-client-error';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') return '/api/v1';
  if (process.env.HOSTINGER_COMBINED === '1') return '/api/v1';
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

function cookieOptions(expires: number) {
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:';
  return { expires, path: '/', sameSite: 'lax' as const, secure };
}

function safeStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing / storage blocked */
  }
}

function safeStorageRemove(key: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** ~10 years — browser mein login bar bar na ho */
const ACCESS_COOKIE_DAYS = 3650;
const REFRESH_COOKIE_DAYS = 3650;

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set(TOKEN_KEY, accessToken, cookieOptions(ACCESS_COOKIE_DAYS));
  Cookies.set(REFRESH_KEY, refreshToken, cookieOptions(REFRESH_COOKIE_DAYS));
  safeStorageSet(TOKEN_KEY, accessToken);
  safeStorageSet(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  Cookies.remove(TOKEN_KEY, { path: '/' });
  Cookies.remove(REFRESH_KEY, { path: '/' });
  safeStorageRemove(TOKEN_KEY);
  safeStorageRemove(REFRESH_KEY);
}

export function getAccessToken(): string | undefined {
  return Cookies.get(TOKEN_KEY) || safeStorageGet(TOKEN_KEY) || undefined;
}

export function getRefreshToken(): string | undefined {
  return Cookies.get(REFRESH_KEY) || safeStorageGet(REFRESH_KEY) || undefined;
}

export function hasStoredSession(): boolean {
  return Boolean(getAccessToken() || getRefreshToken());
}

function getJwtExpiryMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isAuthFailure(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        clearTokens();
        return null;
      }
      try {
        const { data } = await axios.post(`${getApiBaseUrl()}/auth/refresh-token`, {
          refreshToken,
        });
        const tokens = data.data as { accessToken: string; refreshToken: string };
        setTokens(tokens.accessToken, tokens.refreshToken);
        return tokens.accessToken;
      } catch (error) {
        if (isAuthFailure(error)) {
          clearTokens();
        }
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function ensureFreshAccessToken(): Promise<void> {
  const access = getAccessToken();
  if (!access) {
    if (getRefreshToken()) {
      await refreshAccessToken();
    }
    return;
  }
  const exp = getJwtExpiryMs(access);
  if (!exp) return;
  const daysLeft = (exp - Date.now()) / (24 * 60 * 60 * 1000);
  if (daysLeft < 7 && getRefreshToken()) {
    await refreshAccessToken();
  }
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    if (status && status >= 500 && original?.url) {
      const apiMessage =
        (error.response?.data as { message?: string } | undefined)?.message ||
        error.message ||
        'API error';
      reportClientError({
        type: 'api',
        level: 'api',
        message: `${status} ${original.method?.toUpperCase() || 'GET'} ${original.url}: ${apiMessage}`,
      });
    }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken && original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
