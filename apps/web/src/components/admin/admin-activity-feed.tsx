'use client';

import Link from 'next/link';
import { Clock, LogIn, Store } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';

export type ActivityData = {
  recentShops: {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: string;
    owner: { name: string; email: string };
  }[];
  recentLogins: {
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
    ownedShop: { id: string; name: string } | null;
  }[];
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminActivityFeed({
  activity,
  loading,
}: {
  activity: ActivityData | null;
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-violet-600" />
          حالیہ سرگرمی
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <Store className="h-3.5 w-3.5" />
            نئی دکانیں
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">لوڈ…</p>
          ) : !activity?.recentShops.length ? (
            <p className="text-sm text-slate-500">ابھی کوئی دکان نہیں</p>
          ) : (
            <ul className="space-y-2">
              {activity.recentShops.map((shop) => (
                <li key={shop.id}>
                  <Link
                    href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-violet-50"
                  >
                    <span className="truncate font-urdu font-medium">{shop.name}</span>
                    <span className="shrink-0 text-xs text-slate-500">{fmtDate(shop.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <LogIn className="h-3.5 w-3.5" />
            آخری login (مالک)
          </p>
          {loading ? (
            <p className="text-sm text-slate-500">لوڈ…</p>
          ) : !activity?.recentLogins.length ? (
            <p className="text-sm text-slate-500">ابھی login نہیں</p>
          ) : (
            <ul className="space-y-2">
              {activity.recentLogins.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm"
                >
                  <div className="min-w-0">
                    {user.ownedShop ? (
                      <Link
                        href={`${ADMIN_ROUTE_PREFIX}/shops/${user.ownedShop.id}`}
                        className="font-urdu font-medium text-violet-800 hover:underline"
                      >
                        {user.ownedShop.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{user.name}</span>
                    )}
                    <p className="truncate text-xs text-slate-500" dir="ltr">
                      {user.email}
                    </p>
                  </div>
                  <Badge variant="muted" className="shrink-0 text-[10px]">
                    {fmtDate(user.lastLoginAt)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
