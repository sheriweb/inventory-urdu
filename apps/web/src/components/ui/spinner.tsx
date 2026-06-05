'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
};

const sizeClass = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-[3px]',
  lg: 'h-12 w-12 border-4',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <span className={cn('inline-flex items-center justify-center gap-2', className)} role="status">
      <span
        className={cn(
          'animate-spin rounded-full border-emerald-600 border-t-transparent',
          sizeClass[size],
        )}
        aria-hidden
      />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
      <span className="sr-only">{label ?? 'لوڈ ہو رہا ہے'}</span>
    </span>
  );
}

export function PageSpinner({ label = 'لوڈ ہو رہا ہے…' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 py-16">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-slate-600">{label}</p>
    </div>
  );
}

export function InlineLoader({ label = 'لوڈ ہو رہا ہے…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12">
      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

export function TableLoading({ colSpan = 1 }: { colSpan?: number }) {
  return (
    <tr className="hover:bg-transparent even:bg-transparent">
      <td colSpan={colSpan} className="py-16">
        <InlineLoader />
      </td>
    </tr>
  );
}
