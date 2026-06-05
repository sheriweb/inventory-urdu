import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const chevronSvg =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, children, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        'form-control-select h-11 w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm transition',
        'font-sans leading-normal',
        'focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
        'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-50',
        className,
      )}
      style={{
        backgroundImage: chevronSvg,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'left 0.65rem center',
        backgroundSize: '1rem',
        paddingLeft: '2rem',
        ...props.style,
      }}
      {...props}
    >
      {children}
    </select>
  );
});
Select.displayName = 'Select';
