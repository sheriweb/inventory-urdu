'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Banknote,
  Building2,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  ListOrdered,
  MapPin,
  Truck,
  AlertTriangle,
  Package,
  Percent,
  PieChart,
  Receipt,
  TrendingUp,
  UserCircle,
  Users,
  Warehouse,
  Wallet,
  BookOpen,
  Scale,
  Settings,
  ListFilter,
  ShoppingCart,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { UserRole } from '@inventory-urdu/shared';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
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
  if (href === '/dashboard/leases/new') return pathname === '/dashboard/leases/new';
  if (href === '/dashboard/leases') {
    return (
      pathname === '/dashboard/leases' ||
      (pathname.startsWith('/dashboard/leases/') && pathname !== '/dashboard/leases/new')
    );
  }
  if (href === '/dashboard/roznamcha') {
    return pathname === '/dashboard/roznamcha';
  }
  if (href === '/dashboard/recovery') {
    return pathname === '/dashboard/recovery' || pathname.startsWith('/dashboard/recovery/');
  }
  if (href === '/dashboard/load-mgmt') {
    return pathname === '/dashboard/load-mgmt' || pathname.startsWith('/dashboard/load-mgmt/');
  }
  if (href === '/dashboard/installments') {
    return pathname === '/dashboard/installments' || pathname.startsWith('/dashboard/installments/');
  }
  if (href === '/dashboard/accounts') {
    return (
      pathname === '/dashboard/accounts' ||
      pathname === '/dashboard/leases/new' ||
      (pathname.startsWith('/dashboard/leases/') && pathname !== '/dashboard/leases/new')
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const WEB_NAV_GROUPS: NavMenuGroup[] = [
  {
    id: 'central',
    label: 'مرکزی',
    enabled: true,
    items: [{ label: 'ڈیش بورڈ', href: '/dashboard', enabled: true, icon: LayoutDashboard }],
  },
  {
    id: 'setup',
    label: 'سیٹ اپ',
    enabled: true,
    items: [
      { label: 'علاقے', href: '/dashboard/areas', enabled: true, icon: MapPin },
      { label: 'عملہ', href: '/dashboard/staff', enabled: true, icon: Users },
      { label: 'کمپنیاں', href: '/dashboard/companies', enabled: true, icon: Building2 },
      { label: 'دکان کی ترتیبات', href: '/dashboard/settings', enabled: true, icon: Settings },
    ],
  },
  {
    id: 'items',
    label: 'آئٹمز',
    enabled: true,
    items: [
      { label: 'آئٹمز', href: '/dashboard/items', enabled: true, icon: Package },
      { label: 'اسٹاک', href: '/dashboard/stock', enabled: true, icon: Warehouse },
    ],
  },
  {
    id: 'sales',
    label: 'فروخت',
    enabled: true,
    items: [
      {
        label: 'نئی فروخت',
        href: '/dashboard/leases/new',
        enabled: true,
        icon: ShoppingCart,
        isActive: (pathname) => pathname === '/dashboard/leases/new',
      },
    ],
  },
  {
    id: 'accounts',
    label: 'کھاتے',
    enabled: true,
    items: [
      { label: 'گاہک', href: '/dashboard/customers', enabled: true, icon: UserCircle },
      { label: 'کھاتے', href: '/dashboard/accounts', enabled: true, icon: CreditCard },
    ],
  },
  {
    id: 'installments',
    label: 'قسطیں',
    enabled: true,
    items: [{ label: 'قسطیں', href: '/dashboard/installments', enabled: true, icon: ListOrdered }],
  },
  {
    id: 'recovery',
    label: 'وصولی',
    enabled: true,
    items: [{ label: 'وصولی', href: '/dashboard/recovery', enabled: true, icon: Wallet }],
  },
  {
    id: 'loading',
    label: 'لوڈنگ',
    enabled: true,
    items: [
      { label: 'لوڈنگ', href: '/dashboard/load-mgmt', enabled: true, icon: Truck },
      { label: 'کلیم', href: '/dashboard/claims', enabled: true, icon: AlertTriangle },
    ],
  },
  {
    id: 'reports',
    label: 'رپورٹس',
    enabled: true,
    items: [
      { label: 'شارٹ بیلنس', href: '/dashboard/reports/short-balance', enabled: true, icon: PieChart },
      { label: 'شارٹ لسٹ', href: '/dashboard/reports/short-list', enabled: true, icon: ListFilter },
      { label: 'ریکوری تفصیل', href: '/dashboard/reports/recovery-detail', enabled: true, icon: Receipt },
      { label: 'ریکوری مین', href: '/dashboard/reports/recovery-man', enabled: true, icon: Users },
      { label: 'ایڈوانس تفصیل', href: '/dashboard/reports/advance', enabled: true, icon: Banknote },
      { label: 'سیل رپورٹ', href: '/dashboard/reports/sales', enabled: true, icon: TrendingUp },
      { label: 'بل منافع', href: '/dashboard/reports/bill-profit', enabled: true, icon: Percent },
    ],
  },
  {
    id: 'roznamcha',
    label: 'روزنامچہ',
    enabled: true,
    items: [
      { label: 'روزنامچہ', href: '/dashboard/roznamcha', enabled: true, icon: BookOpen },
      { label: 'کیش بک', href: '/dashboard/roznamcha/cash-book', enabled: true, icon: Wallet },
      { label: 'ٹرائل بیلنس', href: '/dashboard/roznamcha/trial-balance', enabled: true, icon: Scale },
    ],
  },
];

export const SUPER_ADMIN_NAV_GROUPS: NavMenuGroup[] = [
  {
    id: 'admin-home',
    label: 'مرکزی',
    enabled: true,
    items: [
      {
        label: 'خلاصہ',
        href: ADMIN_ROUTE_PREFIX,
        enabled: true,
        icon: LayoutDashboard,
        isActive: (pathname) =>
          pathname === ADMIN_ROUTE_PREFIX || pathname === `${ADMIN_ROUTE_PREFIX}/`,
      },
    ],
  },
  {
    id: 'platform',
    label: 'دکانیں',
    enabled: true,
    items: [
      {
        label: 'تمام دکانیں',
        href: `${ADMIN_ROUTE_PREFIX}/shops`,
        enabled: true,
        icon: Store,
        isActive: (pathname) => pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/shops`),
      },
      {
        label: 'مالکان',
        href: `${ADMIN_ROUTE_PREFIX}/users`,
        enabled: true,
        icon: Users,
        isActive: (pathname) => pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/users`),
      },
      {
        label: 'SMS/بلنگ',
        href: `${ADMIN_ROUTE_PREFIX}/settings`,
        enabled: true,
        icon: Settings,
        isActive: (pathname) => pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/settings`),
      },
    ],
  },
];

export function navGroupsForRole(role: UserRole): NavMenuGroup[] {
  if (role === UserRole.SUPER_ADMIN) return SUPER_ADMIN_NAV_GROUPS;
  return WEB_NAV_GROUPS;
}

export function pageTitleFromNav(pathname: string, groups: NavMenuGroup[] = WEB_NAV_GROUPS): string {
  if (pathname === ADMIN_ROUTE_PREFIX || pathname === `${ADMIN_ROUTE_PREFIX}/`) {
    return 'سپر ایڈمن خلاصہ';
  }
  if (/^\/dashboard\/admin\/shops\/[^/]+\/customers$/.test(pathname)) {
    return 'دکان — گاہک';
  }
  if (/^\/dashboard\/admin\/shops\/[^/]+\/accounts$/.test(pathname)) {
    return 'دکان — کھاتے';
  }
  if (/^\/dashboard\/admin\/shops\/[^/]+$/.test(pathname)) {
    return 'دکان تفصیل';
  }
  if (pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/settings`)) return 'SMS/بلنگ';
  if (pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/shops`)) return 'دکانیں';
  if (pathname.startsWith(`${ADMIN_ROUTE_PREFIX}/users`)) return 'مالکان';
  if (pathname === '/dashboard/settings') return 'دکان کی ترتیبات';
  if (pathname === '/dashboard/leases/new') return 'نیا کھاتہ';
  const leaseDetail = pathname.match(/^\/dashboard\/leases\/([^/]+)$/);
  if (leaseDetail && leaseDetail[1] !== 'new') return 'کھاتہ تفصیل';
  if (pathname.endsWith('/edit')) return 'کھاتہ ترمیم';
  if (pathname.endsWith('/discount')) return 'رعایت';

  for (const group of groups) {
    for (const item of group.items) {
      const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
      if (item.enabled && check(pathname)) return item.label;
    }
  }
  return 'ڈیش بورڈ';
}

type MenuPosition = { top: number; left: number; minWidth: number };

type TopNavMenuProps = {
  groups?: NavMenuGroup[];
  className?: string;
};

export function TopNavMenu({ groups = WEB_NAV_GROUPS, className }: TopNavMenuProps) {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<MenuPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const updateMenuPosition = useCallback((id: string) => {
    const trigger = triggerRefs.current.get(id);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const minWidth = 240;
    let left = rect.right - minWidth;
    left = Math.max(8, Math.min(left, window.innerWidth - minWidth - 8));
    setMenuPos({ top: rect.bottom + 6, left, minWidth });
  }, []);

  const openGroup = useCallback(
    (id: string) => {
      clearCloseTimer();
      setOpenId(id);
      updateMenuPosition(id);
    },
    [clearCloseTimer, updateMenuPosition],
  );

  const closeMenu = useCallback(() => {
    clearCloseTimer();
    setOpenId(null);
    setMenuPos(null);
  }, [clearCloseTimer]);

  const toggleGroup = useCallback(
    (id: string) => {
      clearCloseTimer();
      if (openId === id) {
        closeMenu();
      } else {
        openGroup(id);
      }
    },
    [clearCloseTimer, closeMenu, openGroup, openId],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMenu();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (!openId) return;
    const id = openId;
    function reposition() {
      updateMenuPosition(id);
    }
    window.addEventListener('resize', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
    };
  }, [openId, updateMenuPosition]);

  useEffect(() => {
    if (!openId) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      const portal = document.getElementById('top-nav-dropdown-portal');
      if (portal?.contains(target)) return;
      closeMenu();
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [openId, closeMenu]);

  function groupIsActive(group: NavMenuGroup): boolean {
    return group.items.some((item) => {
      if (!item.enabled) return false;
      const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
      return check(pathname);
    });
  }

  const openGroupData = groups.find((g) => g.id === openId);

  const dropdownPortal =
    mounted && openId && menuPos && openGroupData && openGroupData.items.length > 1
      ? createPortal(
          <div
            id="top-nav-dropdown-portal"
            className="fixed z-[9999]"
            style={{ top: menuPos.top, left: menuPos.left, minWidth: menuPos.minWidth }}
          >
            <div
              className="max-h-[min(70vh,360px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl shadow-black/25 ring-1 ring-black/5"
              role="menu"
            >
              {openGroupData.items.map((item) => {
                const Icon = item.icon;
                const check = item.isActive ?? ((p) => defaultIsActive(p, item.href));
                const itemActive = item.enabled && check(pathname);

                if (!item.enabled) {
                  return (
                    <span
                      key={item.label}
                      className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-400"
                      role="menuitem"
                    >
                      <Icon className="h-4 w-4 shrink-0 opacity-40" />
                      {item.label}
                    </span>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    prefetch={false}
                    role="menuitem"
                    onClick={closeMenu}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150',
                      itemActive
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        itemActive ? 'text-emerald-600' : 'text-slate-500',
                      )}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <nav
        ref={rootRef}
        className={cn('flex flex-nowrap items-center justify-center gap-1 overflow-x-auto sm:gap-1.5', className)}
        aria-label="مین مینو"
      >
        {groups.map((group) => {
          if (!group.enabled) return null;

          const isOpen = openId === group.id;
          const active = groupIsActive(group);
          const singleItem = group.items.length === 1 && group.items[0]?.enabled;
          const singleHref = singleItem ? group.items[0].href : null;

          const triggerClass = cn(
            'inline-flex min-h-[40px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 select-none',
            active
              ? 'bg-emerald-500/20 text-emerald-200 shadow-sm ring-1 ring-emerald-400/50'
              : 'text-slate-300 hover:bg-white/10 hover:text-white',
            isOpen && !active && 'bg-white/10 text-white',
          );

          return (
            <div key={group.id} className="relative shrink-0">
              {singleHref ? (
                <Link href={singleHref} prefetch={false} className={triggerClass}>
                  {group.label}
                </Link>
              ) : (
                <button
                  ref={(el) => {
                    if (el) triggerRefs.current.set(group.id, el);
                    else triggerRefs.current.delete(group.id);
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(group.id);
                  }}
                  className={triggerClass}
                >
                  {group.label}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 opacity-80 transition-transform duration-200',
                      isOpen && 'rotate-180',
                    )}
                  />
                </button>
              )}
            </div>
          );
        })}
      </nav>
      {dropdownPortal}
    </>
  );
}
