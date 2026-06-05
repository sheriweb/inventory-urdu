'use client';

import Link from 'next/link';
import {
  Building2,
  CreditCard,
  Store,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';

export type PlatformStats = {
  totalShops: number;
  activeShops: number;
  inactiveShops: number;
  totalCustomers: number;
  totalLeases: number;
  activeLeases: number;
  totalPayments: number;
  shopOwners: number;
};

type StatCard = {
  label: string;
  value: keyof PlatformStats;
  icon: typeof Store;
  tone: string;
  href?: string;
};

const CARDS: StatCard[] = [
  {
    label: 'کل دکانیں',
    value: 'totalShops',
    icon: Store,
    tone: 'bg-violet-100 text-violet-800',
    href: `${ADMIN_ROUTE_PREFIX}/shops`,
  },
  {
    label: 'فعال دکانیں',
    value: 'activeShops',
    icon: Building2,
    tone: 'bg-emerald-100 text-emerald-800',
    href: `${ADMIN_ROUTE_PREFIX}/shops`,
  },
  {
    label: 'غیر فعال',
    value: 'inactiveShops',
    icon: Building2,
    tone: 'bg-slate-100 text-slate-700',
    href: `${ADMIN_ROUTE_PREFIX}/shops`,
  },
  {
    label: 'دکان مالک',
    value: 'shopOwners',
    icon: Users,
    tone: 'bg-sky-100 text-sky-800',
  },
  {
    label: 'کل گاہک (تمام دکانیں)',
    value: 'totalCustomers',
    icon: UserCircle,
    tone: 'bg-amber-100 text-amber-900',
  },
  {
    label: 'کل کھاتے',
    value: 'totalLeases',
    icon: CreditCard,
    tone: 'bg-rose-100 text-rose-800',
  },
  {
    label: 'فعال کھاتے',
    value: 'activeLeases',
    icon: CreditCard,
    tone: 'bg-emerald-100 text-emerald-800',
  },
  {
    label: 'کل ادائیگیاں',
    value: 'totalPayments',
    icon: Wallet,
    tone: 'bg-indigo-100 text-indigo-800',
  },
];

export function PlatformStatsCards({
  stats,
  loading,
}: {
  stats: PlatformStats | null;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(({ label, value, icon: Icon, tone, href }) => {
        const content = (
          <Card className={href ? 'transition hover:border-violet-200 hover:shadow-md' : undefined}>
            <CardContent className="flex items-start gap-3 p-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-2xl font-bold text-slate-900">{loading ? '…' : (stats?.[value] ?? 0)}</p>
              </div>
            </CardContent>
          </Card>
        );

        return href ? (
          <Link key={value} href={href} className="block">
            {content}
          </Link>
        ) : (
          <div key={value}>{content}</div>
        );
      })}
    </div>
  );
}
