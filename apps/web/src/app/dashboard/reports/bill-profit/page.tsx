'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type ProfitRow = {
  id: string;
  accountNumber: number;
  accountDate: string;
  customerName: string;
  saleTotal: number;
  costTotal: number;
  profit: number;
  profitPercent: number;
};

type ProfitResponse = {
  rows: ProfitRow[];
  summary: { count: number; totalSales: number; totalProfit: number };
};

const columns: DataTableColumn<ProfitRow>[] = [
  {
    id: 'account',
    header: 'کھاتہ',
    cell: (row) => (
      <Link href={`/dashboard/leases/${row.id}`} className="font-medium text-emerald-700 hover:underline">
        {row.accountNumber}
      </Link>
    ),
  },
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.accountDate) },
  { id: 'customer', header: 'گاہک', cell: (row) => row.customerName },
  { id: 'sale', header: 'فروخت', cell: (row) => fmtMoney(row.saleTotal) },
  { id: 'cost', header: 'لاگت', cell: (row) => fmtMoney(row.costTotal) },
  {
    id: 'profit',
    header: 'منافع',
    cell: (row) => (
      <span className={`font-medium ${row.profit >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
        {fmtMoney(row.profit)}
      </span>
    ),
  },
  { id: 'percent', header: '%', cell: (row) => `${row.profitPercent.toFixed(1)}%` },
];

export default function BillProfitReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [data, setData] = useState<ProfitResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/bill-profit', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setData(res.data as ProfitResponse);
    } catch {
      setError('بل منافع رپورٹ لوڈ نہیں ہو سکی');
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">کل بل</p>
              <p className="text-xl font-semibold">{data.summary.count}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">کل فروخت</p>
              <p className="text-xl font-semibold">{fmtMoney(data.summary.totalSales)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-slate-500">کل منافع</p>
              <p className="text-xl font-semibold text-emerald-800">{fmtMoney(data.summary.totalProfit)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        pageSize={12}
        searchKeys={(row) => `${row.accountNumber} ${row.customerName}`}
        emptyTitle="اس مدت میں کوئی کھاتہ نہیں"
        emptyDescription="تاریخ بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
