'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Boxes, LogOut, Menu, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopNavMenu, navGroupsForRole } from '@/components/layout/top-nav-menu';
import { NavHistoryProvider } from '@/components/layout/nav-history-context';
import { PageHistoryTabs } from '@/components/layout/page-history-tabs';
import { MobileNavDrawer } from '@/components/layout/mobile-nav-drawer';
import { OfflineBanner } from '@/components/layout/offline-banner';
import { PwaRegister } from '@/components/pwa/pwa-register';
import { OfflineSyncBanner } from '@/components/pwa/offline-sync-banner';
import { fetchMe, getAuthCacheState, logout, scheduleSessionKeepAlive } from '@/lib/auth';
import { hasStoredSession } from '@/lib/api';
import { applyShopBranding } from '@/lib/shop-branding';
import { resolveImageUrl } from '@/lib/image-url';
import { isSuperAdmin, isAdminRoute, resolveRouteForUser, ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { AdminSubnav } from '@/components/admin/admin-subnav';
import type { AuthUser } from '@inventory-urdu/shared';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const cached = getAuthCacheState();
  const [user, setUser] = useState<AuthUser | null>(() => cached ?? null);
  const [authPending, setAuthPending] = useState(() => cached === undefined);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => scheduleSessionKeepAlive(), []);

  useEffect(() => {
    let active = true;
    fetchMe().then((u) => {
      if (!active) return;
      if (!u) {
        if (!hasStoredSession()) {
          router.replace('/login');
        } else {
          setAuthPending(false);
        }
        return;
      }
      setUser(u);
      setAuthPending(false);
    });
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    applyShopBranding(isSuperAdmin(user) ? undefined : user?.shop?.brandColor);
  }, [user]);

  useEffect(() => {
    if (!user || authPending) return;
    const target = resolveRouteForUser(pathname, user);
    if (target && target !== pathname) {
      router.replace(target);
    }
  }, [user, pathname, authPending, router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const navGroups = useMemo(
    () => (user ? navGroupsForRole(user.role) : []),
    [user],
  );
  const initials = user?.name?.trim().charAt(0) || '?';
  const superAdmin = isSuperAdmin(user);
  const shopName = superAdmin ? 'سپر ایڈمن' : user?.shop?.name || 'انوینٹری اردو';
  const shopSubtitle = superAdmin ? 'پلیٹ فارم انتظامیہ' : 'قسط مینجمنٹ';
  const headerHref = superAdmin ? ADMIN_ROUTE_PREFIX : '/dashboard/settings';
  const shopLogo = !superAdmin && user?.shop?.logoUrl ? resolveImageUrl(user.shop.logoUrl) : '';
  const isPrintRoute = pathname.startsWith('/dashboard/print');

  if (isPrintRoute) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  if (authPending && !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm text-slate-600">سائن ان چیک…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      <header className="no-print sticky top-0 z-[100] overflow-visible border-b border-slate-700/80 bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100 shadow-lg shadow-black/25">
        <div className="mx-auto flex min-h-[4.25rem] max-w-[90rem] items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <Link href={headerHref} prefetch={false} className="flex min-w-0 items-center gap-3">
              {shopLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={shopLogo}
                  alt={shopName}
                  className="h-10 w-10 rounded-xl object-cover ring-1 ring-emerald-500/40"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white ring-1 ring-white/20">
                  {superAdmin ? (
                    <Shield className="h-5 w-5 text-violet-300" />
                  ) : (
                    <Boxes className="h-5 w-5" style={{ color: 'var(--shop-brand)' }} />
                  )}
                </div>
              )}
              <div className="hidden min-w-0 sm:block">
                <span className="block truncate text-[15px] font-semibold leading-tight text-white transition hover:opacity-90">
                  {shopName}
                </span>
                <p className="truncate text-[11px] text-slate-400">{shopSubtitle}</p>
              </div>
            </Link>
          </div>

          <div className="relative z-[110] hidden min-w-0 flex-1 justify-center overflow-visible px-1 lg:flex">
            <TopNavMenu groups={navGroups} />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setMobileNavOpen(true)}
            className="shrink-0 gap-1.5 text-slate-200 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="مینو کھولیں"
          >
            <Menu className="h-5 w-5" />
            <span className="text-sm font-medium">مینو</span>
          </Button>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden max-w-[120px] truncate text-sm text-slate-300 lg:block">{user?.name}</div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ring-1 ring-white/20"
              style={{ backgroundColor: 'rgba(var(--shop-brand-rgb), 0.25)', color: 'var(--shop-brand)' }}
              title={user?.name ?? ''}
            >
              {initials}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 border-slate-600/80 bg-slate-800/50 text-slate-200 hover:border-slate-500 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">لاگ آؤٹ</span>
            </Button>
          </div>
        </div>
      </header>

      {superAdmin && isAdminRoute(pathname) ? <AdminSubnav /> : null}

      <Suspense fallback={null}>
        <NavHistoryProvider navGroups={navGroups}>
          <PageHistoryTabs />
          <main className="relative z-10 mx-auto w-full max-w-[90rem] flex-1 p-4 sm:p-6 lg:p-8 pb-12">
            {children}
          </main>
        </NavHistoryProvider>
      </Suspense>

      <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} groups={navGroups} />
      <OfflineBanner />
      <OfflineSyncBanner />
      <PwaRegister />
    </div>
  );
}
