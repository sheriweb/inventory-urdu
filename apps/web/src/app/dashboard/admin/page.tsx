'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Shield, Store, Users } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { PlatformStatsCards, type PlatformStats } from '@/components/admin/platform-stats-cards';
import { AdminActivityFeed, type ActivityData } from '@/components/admin/admin-activity-feed';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';

type ShopPreview = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  owner: { name: string; email: string };
  _count: { customers: number; leaseAccounts: number };
};

export default function AdminHomePage() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [recentShops, setRecentShops] = useState<ShopPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, shopsRes, activityRes] = await Promise.all([
        api.get('/shops/stats'),
        api.get('/shops'),
        api.get('/shops/activity'),
      ]);
      setStats(statsRes.data.data as PlatformStats);
      setActivity(activityRes.data.data as ActivityData);
      const shops = (shopsRes.data.data as ShopPreview[]).slice(0, 5);
      setRecentShops(shops);
    } catch {
      setError('پلیٹ فارم خلاصہ لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-gradient-to-l from-violet-600/10 via-violet-50 to-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">سپر ایڈمن ڈیش بورڈ</h1>
              <p className="mt-1 text-sm text-slate-600">
                تمام دکانوں کا پلیٹ فارم خلاصہ — نئی tenant دکانیں بنائیں اور حالت دیکھیں
              </p>
            </div>
          </div>
          <Link href={`${ADMIN_ROUTE_PREFIX}/shops`}>
            <Button className="gap-1.5 bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              نئی دکان بنائیں
            </Button>
          </Link>
        </div>
      </div>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700">پلیٹ فارم اعداد و شمار</h2>
        <PlatformStatsCards stats={stats} loading={loading} />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">حالیہ دکانیں</CardTitle>
            <Link href={`${ADMIN_ROUTE_PREFIX}/shops`} className="text-xs font-medium text-violet-700 hover:underline">
              تمام دیکھیں
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-6 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
            ) : recentShops.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-500">ابھی کوئی دکان نہیں</p>
                <Link href={`${ADMIN_ROUTE_PREFIX}/shops`} className="mt-2 inline-block text-sm text-violet-700 hover:underline">
                  پہلی دکان بنائیں
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentShops.map((shop) => (
                  <li key={shop.id}>
                    <Link
                      href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}
                      className="flex items-center justify-between gap-3 py-3 transition hover:bg-slate-50/80"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium font-urdu text-slate-900">{shop.name}</p>
                        <p className="truncate text-xs text-slate-500" dir="ltr">
                          {shop.owner.email}
                        </p>
                      </div>
                      <div className="shrink-0 text-left text-xs text-slate-500">
                        <p>{shop._count.customers} گاہک</p>
                        <p>{shop._count.leaseAccounts} کھاتے</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">فوری کام</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href={`${ADMIN_ROUTE_PREFIX}/shops`}>
              <Button variant="outline" className="h-11 w-full justify-start gap-2">
                <Store className="h-4 w-4 text-violet-600" />
                دکانیں منظم کریں
              </Button>
            </Link>
            <Link href={`${ADMIN_ROUTE_PREFIX}/users`}>
              <Button variant="outline" className="h-11 w-full justify-start gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                مالکان — پاس ورڈ / بند کھولیں
              </Button>
            </Link>
            <p className="rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-xs leading-relaxed text-slate-600">
              سپر ایڈمن: دکان بنانا، فعال/غیر فعال، مالک پاس ورڈ reset، پلیٹ فارم stats
            </p>
          </CardContent>
        </Card>

        <AdminActivityFeed activity={activity} loading={loading} />
      </div>
    </div>
  );
}
