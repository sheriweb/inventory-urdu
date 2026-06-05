'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';

type RecoveryRow = {
  receiptNumber: number;
  paymentDate: string;
  accountNumber: number;
  customerName: string;
  amount: number;
  recoveryMan: { name: string } | null;
};

function RecoveryListPrintContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const recoveryManId = searchParams.get('recoveryManId') ?? '';
  const auto = searchParams.get('auto') === '1';
  const [rows, setRows] = useState<RecoveryRow[]>([]);
  const [summary, setSummary] = useState<{ count: number; totalAmount: number } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (recoveryManId) params.recoveryManId = recoveryManId;
    const { data } = await api.get('/reports/recovery-detail', { params });
    const payload = data.data as { rows: RecoveryRow[]; summary: { count: number; totalAmount: number } };
    setRows(payload.rows);
    setSummary(payload.summary);
    setLoaded(true);
  }, [from, to, recoveryManId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loaded && auto) {
      window.print();
    }
  }, [loaded, auto]);

  return (
    <div className="p-8 font-urdu" dir="rtl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">ریکوری تفصیل</h1>
        <p className="mt-1 text-sm text-slate-600">
          {from ? fmtDate(from) : '—'} تا {to ? fmtDate(to) : '—'}
        </p>
      </div>
      {summary ? (
        <p className="mb-4 text-sm">
          کل وصولیاں: {summary.count} — کل رقم: {fmtMoney(summary.totalAmount)}
        </p>
      ) : null}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="p-2 text-right">رسید</th>
            <th className="p-2 text-right">تاریخ</th>
            <th className="p-2 text-right">کھاتہ</th>
            <th className="p-2 text-right">گاہک</th>
            <th className="p-2 text-right">رقم</th>
            <th className="p-2 text-right">ریکوری مین</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.receiptNumber}-${row.paymentDate}`} className="border-b border-slate-200">
              <td className="p-2">{row.receiptNumber}</td>
              <td className="p-2">{fmtDate(row.paymentDate)}</td>
              <td className="p-2">{row.accountNumber}</td>
              <td className="p-2">{row.customerName}</td>
              <td className="p-2">{fmtMoney(row.amount)}</td>
              <td className="p-2">{row.recoveryMan?.name ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RecoveryListPrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">لوڈ…</p>}>
      <RecoveryListPrintContent />
    </Suspense>
  );
}
