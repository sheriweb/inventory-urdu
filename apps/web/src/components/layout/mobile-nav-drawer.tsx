'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { WEB_NAV_GROUPS, type NavMenuGroup } from '@/components/layout/top-nav-menu';

type MobileNavDrawerProps = {
  open: boolean;
  onClose: () => void;
  groups?: NavMenuGroup[];
};

function isItemActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  if (href === '/dashboard/leases/new') return pathname === '/dashboard/leases/new';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavDrawer({ open, onClose, groups = WEB_NAV_GROUPS }: MobileNavDrawerProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="مینو بند کریں"
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[210] flex w-[min(100vw-2rem,320px)] flex-col bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in"
        aria-label="موبائل مینو"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
          <p className="text-base font-bold text-slate-900">مینو</p>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-9 w-9 p-0">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          {groups.map((group) => {
            if (!group.enabled) return null;
            return (
              <div key={group.id} className="mb-4">
                <p className="mb-1.5 px-2 text-xs font-semibold text-slate-400">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    if (!item.enabled) return null;
                    const Icon = item.icon;
                    const active = isItemActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          prefetch={false}
                          onClick={onClose}
                          className={cn(
                            'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                            active
                              ? 'bg-[rgba(var(--shop-brand-rgb),0.12)] text-[var(--shop-brand)] ring-1 ring-[rgba(var(--shop-brand-rgb),0.2)]'
                              : 'text-slate-700 hover:bg-slate-50',
                          )}
                        >
                          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-[var(--shop-brand)]' : 'text-slate-500')} />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
