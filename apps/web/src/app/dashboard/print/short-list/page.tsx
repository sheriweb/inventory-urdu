'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';

type ShortRow = {
  accountNumber: number;
  customerName: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
  paidAmount: number;
  shortfall: number;
};

function ShortListPrintContent() {
  const searchParams = useSearchParams();
  const from = searchParams.get('from') ?? '';
  const to = searchParams.get('to') ?? '';
  const recoveryManId = searchParams.get('recoveryManId') ?? '';
  const auto = searchParams.get('auto') === '1';
  const [rows, setRows] = useState<ShortRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const params: Record<string, string> = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (recoveryManId) params.recoveryManId = recoveryManId;
    const { data } = await api.get('/reports/short-list', { params });
    setRows(data.data as ShortRow[]);
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
        <h1 className="text-2xl font-bold">شارٹ لسٹ رپورٹ</h1>
        <p className="mt-1 text-sm text-slate-600">
          {from ? fmtDate(from) : '—'} تا {to ? fmtDate(to) : '—'}
        </p>
      </div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="p-2 text-right">کھاتہ</th>
            <th className="p-2 text-right">گاہک</th>
            <th className="p-2 text-right">قسط</th>
            <th className="p-2 text-right">تاریخ</th>
            <th className="p-2 text-right">اصل</th>
            <th className="p-2 text-right">ادا</th>
            <th className="p-2 text-right">کمی</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-200">
              <td className="p-2">{row.accountNumber}</td>
              <td className="p-2">{row.customerName}</td>
              <td className="p-2">{row.installmentNumber}</td>
              <td className="p-2">{fmtDate(row.dueDate)}</td>
              <td className="p-2">{fmtMoney(row.scheduledAmount)}</td>
              <td className="p-2">{fmtMoney(row.paidAmount)}</td>
              <td className="p-2">{fmtMoney(row.shortfall)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ShortListPrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">لوڈ…</p>}>
      <ShortListPrintContent />
    </Suspense>
  );
}
