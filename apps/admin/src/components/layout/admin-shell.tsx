'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TopNavMenu, pageTitleFromNav } from '@/components/layout/top-nav-menu';
import { fetchMe, logout } from '@/lib/auth';
import type { AuthUser } from '@inventory-urdu/shared';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    fetchMe().then((u) => {
      if (!u) router.replace('/login');
      else setUser(u);
    });
  }, [router]);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  const pageTitle = pageTitleFromNav(pathname);
  const initials = user?.name?.trim().charAt(0) || 'A';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-900 text-slate-100 shadow-lg shadow-slate-900/20">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30">
              <Shield className="h-5 w-5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <Link href="/dashboard" className="block truncate text-sm font-semibold leading-tight text-white transition hover:text-emerald-300">
                Inventory Urdu
              </Link>
              <p className="truncate text-xs text-slate-400">Super Admin</p>
            </div>
          </div>

          <div className="flex flex-1 justify-center overflow-x-auto px-1">
            <TopNavMenu />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden max-w-[140px] truncate text-sm text-slate-300 md:block">{user?.name}</div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
              {initials}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5 border-slate-600 bg-transparent text-slate-200 hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200/80 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
        <div className="mx-auto flex h-12 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-base font-semibold tracking-tight text-slate-800">{pageTitle}</h2>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
