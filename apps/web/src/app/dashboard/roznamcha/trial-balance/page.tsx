'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import { fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type TrialAccount = { id: string; name: string; total: number };
type TrialGroup = {
  group: string;
  groupLabel: string;
  accounts: TrialAccount[];
  total: number;
};

type TrialBalanceResponse = {
  rows: TrialGroup[];
  grandTotal: number;
};

const accountColumns: DataTableColumn<TrialAccount>[] = [
  { id: 'name', header: 'اکاؤنٹ', cell: (row) => row.name },
  { id: 'total', header: 'رقم', cell: (row) => <span dir="ltr">{fmtMoney(row.total)}</span> },
];

export default function TrialBalancePage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [data, setData] = useState<TrialBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/roznamcha/trial-balance', { params: { from, to } });
      setData(res.data as TrialBalanceResponse);
    } catch {
      setError('ٹرائل بیلنس لوڈ نہیں ہو سکی');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

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

      {data ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-slate-600">
              کل خرچ:{' '}
              <span className="font-semibold text-slate-900" dir="ltr">
                {fmtMoney(data.grandTotal)}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <DataTable
          data={[]}
          columns={accountColumns}
          rowKey={(row) => row.id}
          loading
          pageSize={12}
        />
      ) : !data || data.rows.length === 0 ? (
        <DataTable
          data={[]}
          columns={accountColumns}
          rowKey={(row) => row.id}
          pageSize={12}
          emptyTitle="کوئی ڈیٹا نہیں"
        />
      ) : (
        <div className="space-y-4">
          {data.rows.map((group) => (
            <div key={group.group} className="space-y-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
                <p className="font-medium">{group.groupLabel}</p>
                <p className="text-sm text-slate-500" dir="ltr">
                  گروپ کل: {fmtMoney(group.total)}
                </p>
              </div>
              <DataTable
                data={group.accounts}
                columns={accountColumns}
                rowKey={(row) => row.id}
                pageSize={12}
                compact
                searchKeys={(row) => row.name}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
