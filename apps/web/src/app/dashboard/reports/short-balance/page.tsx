'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type ShortBalanceRow = {
  leaseAccountId: string;
  accountNumber: number;
  customerName: string;
  recoveryMan: { id: string; name: string } | null;
  shortInstallmentCount: number;
  totalShortfall: number;
};

type ShortBalanceResponse = {
  rows: ShortBalanceRow[];
  summary: { accountCount: number; totalShortfall: number };
};

const columns: DataTableColumn<ShortBalanceRow>[] = [
  {
    id: 'account',
    header: 'کھاتہ',
    cell: (row) => (
      <Link href={`/dashboard/leases/${row.leaseAccountId}`} className="font-medium text-emerald-700 hover:underline">
        {row.accountNumber}
      </Link>
    ),
  },
  { id: 'customer', header: 'گاہک', cell: (row) => row.customerName },
  { id: 'count', header: 'شارٹ قسطیں', cell: (row) => row.shortInstallmentCount },
  {
    id: 'shortfall',
    header: 'کل کمی',
    cell: (row) => <span className="font-medium text-amber-800">{fmtMoney(row.totalShortfall)}</span>,
  },
  { id: 'recoveryMan', header: 'ریکوری مین', cell: (row) => row.recoveryMan?.name ?? '—' },
];

export default function ShortBalanceReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [data, setData] = useState<ShortBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/short-balance', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setData(res.data as ShortBalanceResponse);
    } catch {
      setError('شارٹ بیلنس رپورٹ لوڈ نہیں ہو سکی');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, recoveryManId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">

      <ReportFilters
        from={from}
        to={to}
        recoveryManId={recoveryManId}
        onFromChange={setFrom}
        onToChange={setTo}
        onRecoveryManChange={setRecoveryManId}
        onSearch={load}
        searching={loading}
      />

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {data?.summary ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">کل کھاتے</p>
              <p className="text-2xl font-semibold text-slate-900">{data.summary.accountCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">کل کمی</p>
              <p className="text-2xl font-semibold text-amber-800">{fmtMoney(data.summary.totalShortfall)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.leaseAccountId}
        loading={loading}
        pageSize={12}
        searchKeys={(row) => `${row.accountNumber} ${row.customerName} ${row.recoveryMan?.name ?? ''}`}
        emptyTitle="کوئی شارٹ بیلنس نہیں"
        emptyDescription="تمام کھاتے بیلنس پر ہیں یا فلٹر بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
