'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ReportFilters, buildReportParams } from '@/components/reports/report-filters';
import { fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type RecoveryManRow = {
  recoveryManId: string;
  recoveryManName: string;
  paymentCount: number;
  totalAmount: number;
};

type RecoveryManResponse = {
  rows: RecoveryManRow[];
  summary: { staffCount: number; totalAmount: number };
};

const columns: DataTableColumn<RecoveryManRow>[] = [
  { id: 'name', header: 'ریکوری مین', cell: (row) => <span className="font-medium">{row.recoveryManName}</span> },
  { id: 'count', header: 'وصولیاں', cell: (row) => row.paymentCount },
  {
    id: 'amount',
    header: 'کل رقم',
    cell: (row) => <span className="font-medium text-emerald-800">{fmtMoney(row.totalAmount)}</span>,
  },
];

export default function RecoveryManReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const [data, setData] = useState<RecoveryManResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/recovery-man', {
        params: buildReportParams(from, to, recoveryManId),
      });
      setData(res.data as RecoveryManResponse);
    } catch {
      setError('ریکوری مین رپورٹ لوڈ نہیں ہو سکی');
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
              <p className="text-sm text-slate-500">ریکوری مین</p>
              <p className="text-xl font-semibold">{data.summary.staffCount}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">کل وصولی</p>
              <p className="text-xl font-semibold text-emerald-800">{fmtMoney(data.summary.totalAmount)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.recoveryManId}
        loading={loading}
        pageSize={12}
        searchKeys={(row) => row.recoveryManName}
        emptyTitle="اس مدت میں کوئی وصولی نہیں"
        emptyDescription="تاریخ بدل کر دوبارہ تلاش کریں"
      />
    </div>
  );
}
