'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

export function ClientErrorReporter() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_CLIENT_MONITORING !== '1') return;

    const onError = (event: ErrorEvent) => {
      reportClientError({
        type: 'runtime',
        message: event.message || 'Unknown runtime error',
        stack: event.error?.stack,
        source: event.filename ? `${event.filename}:${event.lineno}` : undefined,
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection';
      reportClientError({
        type: 'unhandledrejection',
        message,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
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
