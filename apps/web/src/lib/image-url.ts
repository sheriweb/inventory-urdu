import { getApiBaseUrl } from './api';

const API_BASE = getApiBaseUrl();

export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  const origin = API_BASE.replace(/\/api\/v1\/?$/, '');
  if (url.startsWith('/api/')) return `${origin}${url}`;
  if (url.startsWith('/')) return `${origin}${url}`;
  return `${API_BASE}/${url.replace(/^\//, '')}`;
}
