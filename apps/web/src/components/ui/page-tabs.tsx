'use client';

import { cn } from '@/lib/utils';

export type PageTab = {
  id: string;
  label: string;
};

type PageTabsProps = {
  tabs: PageTab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

export function PageTabs({ tabs, active, onChange, className }: PageTabsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            active === tab.id
              ? 'bg-white shadow-sm ring-1 ring-slate-200'
              : 'text-slate-600 hover:bg-white/60 hover:text-slate-900',
            active === tab.id && 'text-[var(--shop-brand)]',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
