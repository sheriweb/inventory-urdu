'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { LEASE_STATUS_LABELS } from '@/lib/labels';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';
import { LeaseStatus } from '@inventory-urdu/shared';

type SaleRow = {
  id: string;
  accountNumber: number;
  accountDate: string;
  customerName: string;
  totalAmount: number;
  advanceAmount: number;
  remainingBalance: number;
  installmentCount: number;
  status: LeaseStatus;
  itemsSummary: string;
  salesman: { id: string; name: string } | null;
  recoveryMan: { id: string; name: string } | null;
};

type SalesResponse = {
  rows: SaleRow[];
  summary: { count: number; totalSales: number };
};

const STATUS_LABELS = LEASE_STATUS_LABELS;

const columns: DataTableColumn<SaleRow>[] = [
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
  {
    id: 'items',
    header: 'اشیاء',
    cell: (row) => (
      <span className="max-w-[200px] truncate" title={row.itemsSummary}>
        {row.itemsSummary || '—'}
      </span>
    ),
  },
  { id: 'total', header: 'کل رقم', cell: (row) => <span className="font-medium">{fmtMoney(row.totalAmount)}</span> },
  { id: 'remaining', header: 'بقایا', cell: (row) => fmtMoney(row.remainingBalance) },
  {
    id: 'status',
    header: 'حالت',
    cell: (row) => (
      <Badge variant={row.status === LeaseStatus.ACTIVE ? 'success' : 'muted'}>{STATUS_LABELS[row.status]}</Badge>
    ),
  },
];

export default function SalesReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/sales', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setData(res.data as SalesResponse);
    } catch {
      setError('سیل رپورٹ لوڈ نہیں ہو سکی');
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
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-4">
            <div>
              <p className="text-sm text-slate-500">کل کھاتے</p>
              <p className="text-xl font-semibold">{data.summary.count}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">کل فروخت</p>
              <p className="text-xl font-semibold text-emerald-800">{fmtMoney(data.summary.totalSales)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        pageSize={12}
        searchKeys={(row) => `${row.accountNumber} ${row.customerName} ${row.itemsSummary}`}
        emptyTitle="اس مدت میں کوئی سیل نہیں"
        emptyDescription="تاریخ بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
