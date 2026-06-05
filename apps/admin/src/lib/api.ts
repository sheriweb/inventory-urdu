import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function setTokens(accessToken: string, refreshToken: string) {
  Cookies.set(TOKEN_KEY, accessToken, { expires: 1 });
  Cookies.set(REFRESH_KEY, refreshToken, { expires: 7 });
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

export function clearTokens() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(REFRESH_KEY);
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }
}

export function getAccessToken(): string | undefined {
  return Cookies.get(TOKEN_KEY) || (typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) || undefined : undefined);
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
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const refreshToken = Cookies.get(REFRESH_KEY) || localStorage.getItem(REFRESH_KEY);
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
          const tokens = data.data as { accessToken: string; refreshToken: string };
          setTokens(tokens.accessToken, tokens.refreshToken);
          if (original.headers) {
            original.headers.Authorization = `Bearer ${tokens.accessToken}`;
          }
          return api(original);
        } catch {
          clearTokens();
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
