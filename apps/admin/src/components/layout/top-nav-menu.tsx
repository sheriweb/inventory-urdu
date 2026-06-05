'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, LayoutDashboard, Store, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type NavMenuItem = {
  label: string;
  href: string;
  enabled: boolean;
  icon: LucideIcon;
  isActive?: (pathname: string) => boolean;
};

export type NavMenuGroup = {
  id: string;
  label: string;
  enabled: boolean;
  items: NavMenuItem[];
};

function defaultIsActive(pathname: string, href: string): boolean {
  if (href === '#') return false;
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const ADMIN_NAV_GROUPS: NavMenuGroup[] = [
  {
    id: 'main',
    label: 'Main',
    enabled: true,
    items: [{ label: 'Dashboard', href: '/dashboard', enabled: true, icon: LayoutDashboard }],
  },
  {
    id: 'management',
    label: 'Management',
    enabled: true,
    items: [{ label: 'Shops', href: '/shops', enabled: true, icon: Store }],
  },
];

export function pageTitleFromNav(pathname: string, groups: NavMenuGroup[] = ADMIN_NAV_GROUPS): string {
  for (const group of groups) {
    for (const item of group.items) {
      const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
      if (item.enabled && check(pathname)) return item.label;
    }
  }
  return 'Admin';
}

type TopNavMenuProps = {
  groups?: NavMenuGroup[];
  className?: string;
};

export function TopNavMenu({ groups = ADMIN_NAV_GROUPS, className }: TopNavMenuProps) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearCloseTimer();
    closeTimer.current = setTimeout(() => setOpenId(null), 120);
  }, [clearCloseTimer]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpenId(null);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, []);

  useEffect(() => {
    setOpenId(null);
  }, [pathname]);

  function groupIsActive(group: NavMenuGroup): boolean {
    return group.items.some((item) => {
      if (!item.enabled) return false;
      const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
      return check(pathname);
    });
  }

  function toggleGroup(id: string, enabled: boolean) {
    if (!enabled) return;
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <nav ref={rootRef} className={cn('flex flex-wrap items-center justify-center gap-1', className)} aria-label="Main menu">
      {groups.map((group) => {
        const isOpen = openId === group.id;
        const active = groupIsActive(group);
        return (
          <div
            key={group.id}
            className="relative"
            onMouseEnter={() => {
              if (!group.enabled) return;
              clearCloseTimer();
              setOpenId(group.id);
            }}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              disabled={!group.enabled}
              aria-expanded={isOpen}
              aria-haspopup="true"
              onClick={() => toggleGroup(group.id, group.enabled)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                !group.enabled && 'cursor-not-allowed text-slate-500',
                group.enabled && active && 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/40',
                group.enabled && !active && 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              {group.label}
              <ChevronDown
                className={cn('h-4 w-4 shrink-0 opacity-70 transition-transform duration-200', isOpen && 'rotate-180')}
              />
            </button>

            {group.enabled && (
              <div
                className={cn(
                  'absolute top-full z-50 mt-2 min-w-[200px] origin-top rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-xl transition-all duration-200 ease-out left-0',
                  isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1 opacity-0',
                )}
                role="menu"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
                  const itemActive = item.enabled && check(pathname);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      className={cn(
                        'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                        itemActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 shrink-0', itemActive ? 'text-emerald-600' : 'text-slate-500')} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
