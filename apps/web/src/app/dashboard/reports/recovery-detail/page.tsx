'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type RecoveryRow = {
  id: string;
  receiptNumber: number;
  paymentDate: string;
  accountNumber: number;
  customerName: string;
  amount: number;
  recoveryMan: { id: string; name: string } | null;
  note?: string | null;
};

type RecoveryResponse = {
  rows: RecoveryRow[];
  summary: { count: number; totalAmount: number };
};

const columns: DataTableColumn<RecoveryRow>[] = [
  { id: 'receipt', header: 'رسید', cell: (row) => row.receiptNumber },
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.paymentDate) },
  { id: 'account', header: 'کھاتہ', cell: (row) => row.accountNumber },
  { id: 'customer', header: 'گاہک', cell: (row) => row.customerName },
  {
    id: 'amount',
    header: 'رقم',
    cell: (row) => <span className="font-medium text-emerald-800">{fmtMoney(row.amount)}</span>,
  },
  { id: 'recoveryMan', header: 'ریکوری مین', cell: (row) => row.recoveryMan?.name ?? '—' },
];

export default function RecoveryDetailReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/recovery-detail', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setData(res.data as RecoveryResponse);
    } catch {
      setError('ریکوری تفصیل لوڈ نہیں ہو سکی');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, recoveryManId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows ?? [];
  const printHref = `/dashboard/print/recovery-list?from=${from}&to=${to}${recoveryManId ? `&recoveryManId=${recoveryManId}` : ''}`;

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

      {data?.summary ? (
        <Card>
          <CardContent className="flex flex-wrap gap-6 p-4">
            <div>
              <p className="text-sm text-slate-500">کل وصولیاں</p>
              <p className="text-xl font-semibold">{data.summary.count}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">کل رقم</p>
              <p className="text-xl font-semibold text-emerald-800">{fmtMoney(data.summary.totalAmount)}</p>
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
        searchKeys={(row) =>
          `${row.receiptNumber} ${row.accountNumber} ${row.customerName} ${row.recoveryMan?.name ?? ''}`
        }
        emptyTitle="اس مدت میں کوئی وصولی نہیں"
        emptyDescription="تاریخ یا ریکوری مین بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
