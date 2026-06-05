'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SegmentTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

type SegmentTabsProps = {
  tabs: SegmentTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
};

export function SegmentTabs({ tabs, active, onChange, className, ariaLabel = 'صفحے کے tabs' }: SegmentTabsProps) {
  return (
    <div className={cn('relative', className)}>
      <div
        className="flex overflow-x-auto scrollbar-none"
        role="tablist"
        aria-label={ariaLabel}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                'group relative flex min-w-[7.5rem] flex-1 flex-col items-center gap-2 px-3 py-4 transition-all duration-200 sm:min-w-0 sm:flex-row sm:justify-center sm:gap-3 sm:px-5',
                isActive ? 'text-[var(--shop-brand)]' : 'text-slate-500 hover:text-slate-800',
              )}
            >
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-[rgba(var(--shop-brand-rgb),0.14)] shadow-sm ring-1 ring-[rgba(var(--shop-brand-rgb),0.25)]'
                    : 'bg-slate-100 group-hover:bg-slate-200/80',
                )}
              >
                <Icon className={cn('h-[1.125rem] w-[1.125rem]', isActive ? 'text-[var(--shop-brand)]' : 'text-slate-500')} />
              </span>
              <span className="text-center text-xs font-bold leading-tight sm:text-sm">{tab.label}</span>
              {isActive ? (
                <span
                  className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full"
                  style={{ backgroundColor: 'var(--shop-brand)' }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-px bg-slate-200/90" aria-hidden />
    </div>
  );
}

export function TabPanel({
  title,
  description,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('animate-in fade-in duration-300', className)}>
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-slate-100 bg-gradient-to-l from-slate-50/90 to-white px-4 py-3.5 sm:px-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(var(--shop-brand-rgb),0.1)] text-[var(--shop-brand)] ring-1 ring-[rgba(var(--shop-brand-rgb),0.15)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}
