'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type ShortRow = {
  id: string;
  leaseAccountId: string;
  accountNumber: number;
  customerName: string;
  recoveryMan: { id: string; name: string } | null;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
  paidAmount: number;
  shortfall: number;
  status: string;
};

const columns: DataTableColumn<ShortRow>[] = [
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
  { id: 'installment', header: 'قسط #', cell: (row) => row.installmentNumber },
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.dueDate) },
  { id: 'scheduled', header: 'اصل قسط', cell: (row) => fmtMoney(row.scheduledAmount) },
  { id: 'paid', header: 'ادا شدہ', cell: (row) => fmtMoney(row.paidAmount) },
  {
    id: 'shortfall',
    header: 'کمی',
    cell: (row) => <span className="font-medium text-amber-800">{fmtMoney(row.shortfall)}</span>,
  },
  { id: 'recoveryMan', header: 'ریکوری مین', cell: (row) => row.recoveryMan?.name ?? '—' },
];

export default function ShortListReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [rows, setRows] = useState<ShortRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/reports/short-list', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setRows(data.data as ShortRow[]);
    } catch {
      setError('شارٹ لسٹ رپورٹ لوڈ نہیں ہو سکی');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [from, to, recoveryManId]);

  useEffect(() => {
    load();
  }, [load]);

  const printHref = `/dashboard/print/short-list?from=${from}&to=${to}${recoveryManId ? `&recoveryManId=${recoveryManId}` : ''}`;

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
        printHref={printHref}
      />

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        pageSize={12}
        searchKeys={(row) =>
          `${row.accountNumber} ${row.customerName} ${row.recoveryMan?.name ?? ''} ${row.installmentNumber}`
        }
        emptyTitle="اس مدت میں کوئی شارٹ قسط نہیں"
        emptyDescription="تاریخ بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
