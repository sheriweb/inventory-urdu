import * as React from 'react';
import { cn } from '@/lib/utils';

type FormSectionProps = {
  step?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
};

export function FormSection({ step, title, description, children, className, headerAction }: FormSectionProps) {
  return (
    <section className={cn('overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-l from-emerald-50/80 via-white to-white px-5 py-4">
        <div className="flex items-start gap-3">
          {step != null ? (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white shadow-sm">
              {step}
            </div>
          ) : null}
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
          </div>
        </div>
        {headerAction ? <div className="shrink-0">{headerAction}</div> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function FormField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
