'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'qistpro-chunk-reload';

function isChunkLoadFailure(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('chunkloaderror') ||
    m.includes('loading chunk') ||
    m.includes('failed to fetch dynamically imported module') ||
    m.includes('importing a module script failed')
  );
}

function reloadOnce(reason: string) {
  if (!isChunkLoadFailure(reason)) return;
  const last = sessionStorage.getItem(RELOAD_KEY);
  const now = Date.now();
  if (last && now - Number(last) < 15_000) return;
  sessionStorage.setItem(RELOAD_KEY, String(now));
  window.location.reload();
}

/** Auto-reload when browser has stale HTML after a deploy (missing _next/static chunks). */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reloadOnce(event.message || String(event.error ?? ''));
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : typeof reason === 'string' ? reason : String(reason ?? '');
      reloadOnce(message);
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
