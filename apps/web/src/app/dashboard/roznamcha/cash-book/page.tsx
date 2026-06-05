'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type CashDay = {
  date: string;
  expenseOut: number;
  rozRecoveryIn: number;
  leaseRecoveryIn: number;
  totalIn: number;
  totalOut: number;
  net: number;
};

type CashBookResponse = {
  days: CashDay[];
  totals: CashDay & { expenseOut: number };
};

const columns: DataTableColumn<CashDay>[] = [
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.date) },
  { id: 'lease', header: 'قسط وصولی', cell: (row) => <span dir="ltr">{fmtMoney(row.leaseRecoveryIn)}</span> },
  { id: 'roz', header: 'روزنامچہ وصولی', cell: (row) => <span dir="ltr">{fmtMoney(row.rozRecoveryIn)}</span> },
  {
    id: 'in',
    header: 'کل آمدنی',
    cell: (row) => (
      <span dir="ltr" className="text-emerald-800">
        {fmtMoney(row.totalIn)}
      </span>
    ),
  },
  {
    id: 'out',
    header: 'خرچ',
    cell: (row) => (
      <span dir="ltr" className="text-red-700">
        {fmtMoney(row.totalOut)}
      </span>
    ),
  },
  {
    id: 'net',
    header: 'خالص',
    cell: (row) => (
      <span dir="ltr" className="font-medium">
        {fmtMoney(row.net)}
      </span>
    ),
  },
];

export default function CashBookPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [data, setData] = useState<CashBookResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/roznamcha/cash-book', { params: { from, to } });
      setData(res.data as CashBookResponse);
    } catch {
      setError('کیش بک لوڈ نہیں ہو سکی');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const days = data?.days ?? [];

  return (
    <div className="space-y-6">

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">سے</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">تک</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />
          </div>
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? 'تلاش…' : 'تلاش'}
          </Button>
        </CardContent>
      </Card>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {data?.totals ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل آمدنی</p>
              <p className="text-xl font-semibold text-emerald-800" dir="ltr">
                {fmtMoney(data.totals.totalIn)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل اخراجات</p>
              <p className="text-xl font-semibold text-red-700" dir="ltr">
                {fmtMoney(data.totals.totalOut)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">خالص</p>
              <p className="text-xl font-semibold" dir="ltr">
                {fmtMoney(data.totals.net)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTable
        data={days}
        columns={columns}
        rowKey={(row) => row.date}
        loading={loading}
        pageSize={12}
        emptyTitle="کوئی ریکارڈ نہیں"
        emptyDescription="تاریخ بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
