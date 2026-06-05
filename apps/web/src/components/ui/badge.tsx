import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'muted' | 'warning';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-slate-100 text-slate-700 ring-slate-200',
    success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    muted: 'bg-slate-50 text-slate-600 ring-slate-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  };
  return (
    <span
      className={cn(
        'inline-flex min-h-[2rem] items-center justify-center rounded-full px-3 py-1 text-xs font-medium leading-7 ring-1 ring-inset',
        'whitespace-nowrap [unicode-bidi:plaintext]',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
