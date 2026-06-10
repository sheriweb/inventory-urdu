import type { NavMenuGroup } from '@/components/layout/top-nav-menu';
import { pageTitleFromNav } from '@/components/layout/top-nav-menu';

export type NavHistoryTab = {
  key: string;
  pathname: string;
  search: string;
  label: string;
  openedAt: number;
};

const STORAGE_KEY = 'inventory-nav-history';
export const MAX_NAV_TABS = 12;

export function navTabKey(pathname: string, search = ''): string {
  return search ? `${pathname}?${search}` : pathname;
}

export function shouldTrackNavPath(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  if (pathname.startsWith('/dashboard/print')) return false;
  if (pathname === '/dashboard') return false;
  return true;
}

export function tabLabelFromPath(
  pathname: string,
  search: string,
  groups: NavMenuGroup[],
): string {
  const base = pageTitleFromNav(pathname, groups);

  const customerEdit = pathname.match(/^\/dashboard\/customers\/([^/]+)\/edit$/);
  if (customerEdit) return 'گاہک ترمیم';

  const leaseEdit = pathname.match(/^\/dashboard\/leases\/([^/]+)\/edit$/);
  if (leaseEdit) return 'کھاتہ ترمیم';

  const leaseDiscount = pathname.match(/^\/dashboard\/leases\/([^/]+)\/discount$/);
  if (leaseDiscount) return 'رعایت';

  const leaseDetail = pathname.match(/^\/dashboard\/leases\/([^/]+)$/);
  if (leaseDetail && leaseDetail[1] !== 'new') return base;

  const adminShop = pathname.match(/^\/dashboard\/admin\/shops\/([^/]+)$/);
  if (adminShop) return 'دکان تفصیل';

  if (search) {
    const params = new URLSearchParams(search);
    const customerId = params.get('customerId');
    if (customerId && pathname === '/dashboard/leases/new') {
      return 'نیا کھاتہ (گاہک)';
    }
  }

  return base;
}

export function loadNavHistoryTabs(): NavHistoryTab[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as NavHistoryTab[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((t) => t && typeof t.key === 'string' && typeof t.pathname === 'string')
      .slice(0, MAX_NAV_TABS);
  } catch {
    return [];
  }
}

export function saveNavHistoryTabs(tabs: NavHistoryTab[]): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.slice(0, MAX_NAV_TABS)));
  } catch {
    /* storage blocked */
  }
}

export function upsertNavTab(tabs: NavHistoryTab[], tab: NavHistoryTab): NavHistoryTab[] {
  const without = tabs.filter((t) => t.key !== tab.key);
  return [tab, ...without].slice(0, MAX_NAV_TABS);
}

export function removeNavTab(tabs: NavHistoryTab[], key: string): NavHistoryTab[] {
  return tabs.filter((t) => t.key !== key);
}
