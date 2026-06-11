'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { AxiosError } from 'axios';
import { AlertTriangle, Banknote, Bell, CalendarClock, ShieldAlert, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { asArray, recordFromResponse } from '@/lib/api-response';
import { fmtMoney } from '@/lib/format';
import { Card, CardContent } from '@/components/ui/card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Button } from '@/components/ui/button';
import { DailySummaryCard } from '@/components/dashboard/daily-summary-card';

type DashboardStats = {
  todayCollectionCount: number;
  todayCollectionAmount: number;
  todayDueCount: number;
  overdueCount: number;
  defaultedAccountsCount?: number;
  pendingReminderCount?: number;
  newSalesCount?: number;
  newSalesAmount?: number;
  tomorrowDueCount?: number;
  tomorrowDueAmount?: number;
};

type DailySummaryResponse = {
  date: string;
  shopName: string;
  stats: DashboardStats;
  paragraphUrdu: string;
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Fallback when /reports/daily-summary is unavailable (older API build). */
async function loadStatsFromLegacyApis(): Promise<{ stats: DashboardStats; paragraphUrdu: string }> {
  const iso = todayIsoDate();
  const dayStart = startOfToday();

  const [paymentsRes, listRes] = await Promise.all([
    api.get('/recovery/payments', { params: { from: iso, to: iso } }),
    api.get('/recovery/list', { params: { date: iso } }),
  ]);

  type PaymentRow = { amount: string | number; paymentType: string };
  type ListRow = { nextDueInstallment?: { dueDate: string } | null };

  const payments = asArray<PaymentRow>(paymentsRes.data?.data);
  const installmentPayments = payments.filter((p) => p.paymentType === 'INSTALLMENT');
  const todayCollectionCount = installmentPayments.length;
  const todayCollectionAmount = installmentPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const listRaw = listRes.data?.data;
  const list = Array.isArray(listRaw)
    ? (listRaw as ListRow[])
    : asArray<ListRow>((listRaw as { rows?: ListRow[] } | null)?.rows);
  let todayDueCount = 0;
  let overdueCount = 0;

  for (const row of list) {
    const due = row.nextDueInstallment?.dueDate ? new Date(row.nextDueInstallment.dueDate) : null;
    if (!due) continue;
    if (due < dayStart) {
      overdueCount += 1;
    } else {
      todayDueCount += 1;
    }
  }

  const stats: DashboardStats = {
    todayCollectionCount,
    todayCollectionAmount,
    todayDueCount,
    overdueCount,
    defaultedAccountsCount: 0,
    pendingReminderCount: 0,
  };

  const paragraphUrdu = [
    'روزانہ خلاصہ (محدود — API اپڈیٹ کریں)',
    `وصولی: ${todayCollectionCount} — Rs ${fmtMoney(todayCollectionAmount)}`,
    `واجب: ${todayDueCount} | تاخیر: ${overdueCount}`,
  ].join('\n');

  return { stats, paragraphUrdu };
}

export function DashboardOverview() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [paragraphUrdu, setParagraphUrdu] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/reports/daily-summary');
      const summary = recordFromResponse<DailySummaryResponse>({ data });
      if (summary?.stats) {
        setStats(summary.stats);
        setParagraphUrdu(summary.paragraphUrdu ?? '');
        return;
      }
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 404) {
        try {
          const { data } = await api.get('/recovery/dashboard-stats');
          const legacyStats = recordFromResponse<DashboardStats>({ data });
          if (legacyStats) setStats(legacyStats);
          const legacy = await loadStatsFromLegacyApis();
          setParagraphUrdu(legacy.paragraphUrdu);
          return;
        } catch {
          setError('آج کا خلاصہ لوڈ نہیں ہو سکا — API دوبارہ شروع کریں');
          return;
        }
      }
      setError('آج کا خلاصہ لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-600">آج کا خلاصہ</h2>
          <p className="text-xs text-slate-500">وصولی، واجب قسطیں اور تاخیر</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/recovery">
            <Button size="sm" variant="outline" className="gap-1.5">
              <Wallet className="h-4 w-4" />
              قسط وصولی
            </Button>
          </Link>
          <Link href="/dashboard/leases/new">
            <Button size="sm" className="gap-1.5">
              <Banknote className="h-4 w-4" />
              نئی فروخت
            </Button>
          </Link>
        </div>
      </div>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DailySummaryCard paragraph={paragraphUrdu} loading={loading} onRefresh={load} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">آج وصولی</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : (stats?.todayCollectionCount ?? 0)}</p>
              <p className="text-xs text-emerald-700" dir="ltr">
                {loading ? '…' : fmtMoney(stats?.todayCollectionAmount ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Banknote className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">نئی فروخت</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : (stats?.newSalesCount ?? 0)}</p>
              <p className="text-xs text-indigo-700" dir="ltr">
                {loading ? '…' : fmtMoney(stats?.newSalesAmount ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">آج واجب قسطیں</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : (stats?.todayDueCount ?? 0)}</p>
              <Link href="/dashboard/recovery" className="text-xs text-sky-700 hover:underline">
                وصولی کھولیں
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">کل واجب</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : (stats?.tomorrowDueCount ?? 0)}</p>
              <p className="text-xs text-violet-700" dir="ltr">
                {loading ? '…' : fmtMoney(stats?.tomorrowDueAmount ?? 0)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">تاخیر</p>
              <p className="text-xl font-bold text-amber-900">{loading ? '…' : (stats?.overdueCount ?? 0)}</p>
              <Link href="/dashboard/installments" className="text-xs text-amber-800 hover:underline">
                قسطیں دیکھیں
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">2 دن بعد یاد دہانی</p>
              <p className="text-xl font-bold text-slate-900">{loading ? '…' : (stats?.pendingReminderCount ?? 0)}</p>
              <Link href="/dashboard/recovery?tab=reminders" className="text-xs text-violet-700 hover:underline">
                یاد دہانیاں بھیجیں
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-800">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-500">ڈیفالٹ کھاتے</p>
              <p className="text-xl font-bold text-rose-900">{loading ? '…' : (stats?.defaultedAccountsCount ?? 0)}</p>
              <Link href="/dashboard/accounts?status=DEFAULTED" className="text-xs text-rose-800 hover:underline">
                کھاتے دیکھیں
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
