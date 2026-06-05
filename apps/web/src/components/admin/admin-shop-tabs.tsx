'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';

type AdminShopTabsProps = {
  shopId: string;
  shopName?: string;
};

export function AdminShopTabs({ shopId, shopName }: AdminShopTabsProps) {
  const pathname = usePathname();
  const base = `${ADMIN_ROUTE_PREFIX}/shops/${shopId}`;

  const tabs = [
    { href: base, label: 'تفصیل', match: (p: string) => p === base },
    {
      href: `${base}/customers`,
      label: 'گاہک',
      match: (p: string) => p.startsWith(`${base}/customers`),
    },
    {
      href: `${base}/accounts`,
      label: 'کھاتے / قسط',
      match: (p: string) => p.startsWith(`${base}/accounts`),
    },
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {shopName ? (
        <p className="mb-2 text-sm font-semibold font-urdu text-slate-800">{shopName}</p>
      ) : null}
      <nav className="flex flex-wrap gap-2" aria-label="دکان ڈیٹا">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            prefetch={false}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition',
              tab.match(pathname)
                ? 'bg-violet-600 text-white'
                : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-violet-50',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
