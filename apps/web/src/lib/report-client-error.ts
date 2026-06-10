type ClientErrorPayload = {
  type: string;
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  userEmail?: string;
  source?: string;
  level?: 'error' | 'warn' | 'api';
};

const reported = new Set<string>();

function fingerprint(payload: ClientErrorPayload): string {
  return `${payload.type}|${payload.message}|${payload.url || ''}`.slice(0, 240);
}

function currentUserEmail(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem('accessToken');
    if (!raw) return undefined;
    const part = raw.split('.')[1];
    if (!part) return undefined;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.email === 'string' ? json.email : undefined;
  } catch {
    return undefined;
  }
}

export function reportClientError(payload: ClientErrorPayload) {
  if (typeof window === 'undefined') return;
  if (process.env.NEXT_PUBLIC_CLIENT_MONITORING !== '1') return;

  const key = fingerprint(payload);
  if (reported.has(key)) return;
  reported.add(key);
  if (reported.size > 100) reported.clear();

  const body: ClientErrorPayload = {
    ...payload,
    url: payload.url || window.location.href,
    userAgent: payload.userAgent || navigator.userAgent,
    userEmail: payload.userEmail || currentUserEmail(),
  };

  void fetch('/api/v1/monitoring/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {
    /* monitoring must not break the app */
  });
}
