import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-900/[0.04] sm:flex-row sm:items-center sm:justify-between sm:p-6',
        className,
      )}
    >
      <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-emerald-400 to-emerald-600" />
      <div className="pr-3">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1.5 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 flex-wrap items-center gap-2 pr-3">{children}</div> : null}
    </div>
  );
}
