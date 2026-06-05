'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, type SelectProps } from '@/components/ui/select';

type SelectWithAddProps = SelectProps & {
  onAddClick?: () => void;
  showAdd?: boolean;
  addTitle?: string;
};

export const SelectWithAdd = React.forwardRef<HTMLSelectElement, SelectWithAddProps>(
  ({ className, onAddClick, showAdd = true, addTitle = 'نیا شامل کریں', children, disabled, ...props }, ref) => {
    if (!showAdd || !onAddClick) {
      return (
        <Select ref={ref} className={className} disabled={disabled} {...props}>
          {children}
        </Select>
      );
    }

    return (
      <div className="flex items-stretch gap-2">
        <Select ref={ref} className={cn('min-w-0 flex-1', className)} disabled={disabled} {...props}>
          {children}
        </Select>
        <button
          type="button"
          title={addTitle}
          aria-label={addTitle}
          disabled={disabled}
          onClick={onAddClick}
          className={cn(
            'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700',
            'transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    );
  },
);
SelectWithAdd.displayName = 'SelectWithAdd';
