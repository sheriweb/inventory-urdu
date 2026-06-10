'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type InputWithAddProps = React.InputHTMLAttributes<HTMLInputElement> & {
  onAddClick?: () => void;
  showAdd?: boolean;
  addTitle?: string;
  listId?: string;
  compact?: boolean;
};

export const InputWithAdd = React.forwardRef<HTMLInputElement, InputWithAddProps>(
  (
    {
      className,
      onAddClick,
      showAdd = true,
      addTitle = 'نیا شامل کریں',
      listId,
      compact = false,
      disabled,
      ...props
    },
    ref,
  ) => {
    if (!showAdd || !onAddClick) {
      return <Input ref={ref} className={className} disabled={disabled} list={listId} {...props} />;
    }

    const btnClass = compact
      ? 'h-8 w-8'
      : 'h-11 w-11';
    const iconClass = compact ? 'h-4 w-4' : 'h-5 w-5';

    return (
      <div className="flex items-stretch gap-2">
        <Input
          ref={ref}
          className={cn('min-w-0 flex-1', className)}
          disabled={disabled}
          list={listId}
          {...props}
        />
        <button
          type="button"
          title={addTitle}
          aria-label={addTitle}
          disabled={disabled}
          onClick={onAddClick}
          className={cn(
            'inline-flex shrink-0 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700',
            btnClass,
            'transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          <Plus className={iconClass} />
        </button>
      </div>
    );
  },
);
InputWithAdd.displayName = 'InputWithAdd';
