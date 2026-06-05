'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';
import { InlineLoader } from '@/components/ui/spinner';

type ReceiptData = {
  receiptNumber: number;
  amount: number;
  paymentType: string;
  paymentDate: string;
  note?: string | null;
  accountNumber: number;
  customerName: string;
  customerMobile?: string | null;
  customerCnic?: string | null;
  shopName: string;
};

const TYPE_LABELS: Record<string, string> = {
  INSTALLMENT: 'قسط',
  ADVANCE: 'ایڈوانس',
  DISCOUNT: 'رعایت',
};

export default function ReceiptPrintPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const auto = searchParams.get('auto') === '1';
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const { data: res } = await api.get(`/recovery/payments/${id}`);
      setData(res.data as ReceiptData);
    } catch {
      setError('رسید لوڈ نہیں ہو سکی');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (auto && data) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
  }, [auto, data]);

  if (error) {
    return <p className="p-8 text-center text-red-600">{error}</p>;
  }

  if (!data) {
    return <InlineLoader label="رسید لوڈ ہو رہی ہے…" />;
  }

  return (
    <div className="mx-auto max-w-lg p-8 text-slate-900">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold">{data.shopName}</h1>
        <p className="text-sm text-slate-600">وصولی رسید</p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-300 p-6 text-sm">
        <div className="flex justify-between">
          <span>رسید نمبر</span>
          <span dir="ltr" className="font-bold">#{data.receiptNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>تاریخ</span>
          <span>{fmtDate(data.paymentDate)}</span>
        </div>
        <div className="flex justify-between">
          <span>کھاتہ نمبر</span>
          <span dir="ltr">{data.accountNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>گاہک</span>
          <span>{data.customerName}</span>
        </div>
        {data.customerMobile ? (
          <div className="flex justify-between">
            <span>موبائل</span>
            <span dir="ltr">{data.customerMobile}</span>
          </div>
        ) : null}
        <div className="flex justify-between">
          <span>قسم</span>
          <span>{TYPE_LABELS[data.paymentType] ?? data.paymentType}</span>
        </div>
        <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold">
          <span>رقم وصول</span>
          <span dir="ltr">{fmtMoney(data.amount)}</span>
        </div>
        {data.note ? (
          <div className="border-t border-slate-200 pt-3">
            <span className="text-slate-600">نوٹ: </span>
            {data.note}
          </div>
        ) : null}
      </div>

      <p className="mt-8 text-center text-xs text-slate-500">شکریہ — {data.shopName}</p>

      <div className="no-print mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white"
        >
          پرنٹ / PDF
        </button>
      </div>
    </div>
  );
}
