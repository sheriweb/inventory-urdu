'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavHistory } from '@/components/layout/nav-history-context';

export function PageHistoryTabs() {
  const { tabs, activeKey, closeTab } = useNavHistory();

  if (tabs.length === 0) return null;

  return (
    <div className="no-print relative z-30 border-b border-slate-300/90 bg-gradient-to-b from-sky-100/90 to-sky-50/80 shadow-sm">
      <div className="mx-auto max-w-[90rem] px-2 sm:px-4 lg:px-6">
        <div
          className="flex items-end gap-0.5 overflow-x-auto pb-0 pt-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="کھلی صفحات"
        >
          {tabs.map((tab) => {
            const href = tab.search ? `${tab.pathname}?${tab.search}` : tab.pathname;
            const isActive = tab.key === activeKey;

            return (
              <div
                key={tab.key}
                role="presentation"
                className={cn(
                  'group relative flex shrink-0 items-stretch rounded-t-lg border border-b-0 transition-colors',
                  isActive
                    ? 'z-[2] border-sky-300/80 bg-white shadow-sm'
                    : 'z-[1] border-transparent bg-sky-200/50 hover:bg-sky-100/80',
                )}
              >
                <Link
                  href={href}
                  prefetch={false}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    'flex max-w-[11rem] items-center px-3 py-2 text-xs font-semibold sm:max-w-[13rem] sm:text-sm',
                    isActive ? 'text-slate-800' : 'text-slate-600 hover:text-slate-800',
                  )}
                  title={tab.label}
                >
                  <span className="truncate">{tab.label}</span>
                </Link>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeTab(tab.key);
                  }}
                  className={cn(
                    'flex w-7 shrink-0 items-center justify-center rounded-tr-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600',
                    isActive ? 'text-slate-500' : 'opacity-70 group-hover:opacity-100',
                  )}
                  aria-label={`${tab.label} بند کریں`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
