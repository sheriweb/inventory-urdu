'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Settings2, Store, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';

const LINKS = [
  { href: ADMIN_ROUTE_PREFIX, label: 'خلاصہ', icon: LayoutDashboard, exact: true },
  { href: `${ADMIN_ROUTE_PREFIX}/shops`, label: 'دکانیں', icon: Store, exact: false },
  { href: `${ADMIN_ROUTE_PREFIX}/users`, label: 'مالکان', icon: Users, exact: false },
  { href: `${ADMIN_ROUTE_PREFIX}/settings`, label: 'SMS/بلنگ', icon: Settings2, exact: false },
] as const;

function isLinkActive(pathname: string, href: string, exact: boolean): boolean {
  if (exact) return pathname === href || pathname === `${href}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSubnav() {
  const pathname = usePathname();

  return (
    <nav
      className="no-print flex flex-wrap gap-2 border-b border-violet-100 bg-gradient-to-l from-violet-50/90 to-white px-4 py-3 sm:px-6 lg:px-8"
      aria-label="سپر ایڈمن مینو"
    >
      <div className="mx-auto flex w-full max-w-[90rem] flex-wrap gap-2">
        {LINKS.map(({ href, label, icon: Icon, exact }) => {
          const active = isLinkActive(pathname, href, exact);
          return (
            <Link
              key={href}
              href={href}
              prefetch={false}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition',
                active
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 ring-1 ring-violet-100 hover:bg-violet-50 hover:text-violet-900',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
