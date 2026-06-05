import * as React from 'react';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function AlertBanner({
  variant = 'error',
  children,
  className,
  onRetry,
  retryLabel = 'دوبارہ کوشش',
}: {
  variant?: 'error' | 'success' | 'info';
  children: React.ReactNode;
  className?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    info: 'border-sky-200 bg-sky-50 text-sky-800',
  };

  return (
    <div className={cn('rounded-xl border px-4 py-3 text-sm shadow-sm', styles[variant], className)}>
      <div className={cn('flex gap-3', onRetry ? 'flex-col sm:flex-row sm:items-center sm:justify-between' : '')}>
        <div className="flex-1">{children}</div>
        {onRetry ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onRetry}
            className="shrink-0 gap-1.5 border-current/25 bg-white/70 hover:bg-white"
          >
            <RefreshCw className="h-4 w-4" />
            {retryLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
