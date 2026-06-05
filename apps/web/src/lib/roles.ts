import { AuthUser, UserRole } from '@inventory-urdu/shared';

export const ADMIN_ROUTE_PREFIX = '/dashboard/admin';

export function isSuperAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === UserRole.SUPER_ADMIN;
}

export function isShopUser(user: AuthUser | null | undefined): boolean {
  return Boolean(user?.shopId);
}

export function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith(ADMIN_ROUTE_PREFIX);
}

/** Shop dashboard routes (not platform admin). */
export function isShopDashboardRoute(pathname: string): boolean {
  if (!pathname.startsWith('/dashboard')) return false;
  if (isAdminRoute(pathname)) return false;
  if (pathname.startsWith('/dashboard/print')) return false;
  return true;
}

export function defaultPathAfterLogin(user: AuthUser): string {
  if (isSuperAdmin(user)) return ADMIN_ROUTE_PREFIX;
  return '/dashboard';
}

export function resolveRouteForUser(pathname: string, user: AuthUser): string | null {
  if (isSuperAdmin(user)) {
    if (pathname === '/dashboard' || isShopDashboardRoute(pathname)) {
      return ADMIN_ROUTE_PREFIX;
    }
    return null;
  }
  if (isAdminRoute(pathname)) {
    return '/dashboard';
  }
  return null;
}
