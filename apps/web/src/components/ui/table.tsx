import * as React from 'react';
import { cn } from '@/lib/utils';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      dir="rtl"
      className={cn('w-full table-fixed border-collapse caption-bottom text-sm', className)}
      {...props}
    />
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        'border-b border-slate-100/90 transition-colors duration-150 even:bg-slate-50/60 hover:bg-emerald-50/50 data-[state=selected]:bg-emerald-50',
        className,
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'h-11 whitespace-nowrap px-4 text-start align-middle text-xs font-bold text-slate-600',
        'border-b border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80',
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn(
        'px-4 py-3.5 text-start align-middle text-sm leading-7 text-slate-700',
        className,
      )}
      {...props}
    />
  );
}

/** Mixed Urdu/Latin cell text — use on name/area columns when needed */
export function tableMixedTextClassName(className?: string) {
  return cn('[unicode-bidi:plaintext]', className);
}
