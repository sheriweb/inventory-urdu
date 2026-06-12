'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import {
  InstallmentFrequency,
  InstallmentStatus,
  getDisplayFieldsFromUnit,
  type LeaseItemUnitDetail,
} from '@inventory-urdu/shared';
import { fmtDate, fmtMoney } from '@/lib/format';
import { parseAdditionalMobiles } from '@/lib/customer-mobiles';

const FREQUENCY_LABELS: Record<InstallmentFrequency, string> = {
  [InstallmentFrequency.DAILY]: 'روزانہ',
  [InstallmentFrequency.WEEKLY]: 'ہفتہ وار',
  [InstallmentFrequency.FIFTEEN_DAYS]: '15 دن',
  [InstallmentFrequency.MONTHLY]: 'ماہانہ',
};

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

type LeasePrintCustomer = {
  name: string;
  fatherOrHusbandName?: string | null;
  mobile?: string | null;
  additionalMobiles?: unknown;
  cnic?: string | null;
  caste?: string | null;
  profession?: string | null;
  city?: string | null;
  presentAddress?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  area?: { name?: string | null; city?: string | null } | null;
};

type LeasePrint = {
  accountNumber: number;
  accountDate: string;
  totalAmount: string | number;
  advanceAmount: string | number;
  remainingBalance: string | number;
  currentInstallmentAmount: string | number;
  frequency: InstallmentFrequency;
  customer: LeasePrintCustomer;
  salesman?: { name: string } | null;
  recoveryMan?: { name: string } | null;
  leaseItems: {
    itemName: string;
    quantity: number;
    rate: string | number;
    totalAmount: string | number;
    unitDetails?: LeaseItemUnitDetail[] | null;
  }[];
  installments: {
    installmentNumber: number;
    dueDate: string;
    scheduledAmount: string | number;
    paidAmount: string | number;
    status: InstallmentStatus;
  }[];
};

function customerPrintLines(customer: LeasePrintCustomer): string[] {
  const lines: string[] = [];
  if (customer.fatherOrHusbandName) lines.push(`والد/شوہر: ${customer.fatherOrHusbandName}`);
  if (customer.cnic) lines.push(`شناختی کارڈ: ${customer.cnic}`);
  if (customer.mobile) lines.push(`موبائل: ${customer.mobile}`);
  const extras = parseAdditionalMobiles(customer.additionalMobiles);
  if (extras.length > 0) lines.push(`اضافی موبائل: ${extras.join('، ')}`);
  if (customer.caste) lines.push(`ذات: ${customer.caste}`);
  if (customer.profession) lines.push(`پیشہ: ${customer.profession}`);
  if (customer.city) lines.push(`شہر: ${customer.city}`);
  if (customer.area?.name) lines.push(`علاقہ: ${customer.area.name}`);
  if (customer.presentAddress) lines.push(`پتہ: ${customer.presentAddress}`);
  if (customer.bankName) lines.push(`بینک: ${customer.bankName}`);
  if (customer.chequeNumber) lines.push(`چیک نمبر: ${customer.chequeNumber}`);
  return lines;
}

function KhataPrintContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const auto = searchParams.get('auto') === '1';
  const [lease, setLease] = useState<LeasePrint | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await api.get(`/leases/${id}`);
    setLease(data.data as LeasePrint);
    setLoaded(true);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loaded && auto) {
      window.print();
    }
  }, [loaded, auto]);

  if (!lease) {
    return <p className="p-8 text-center">لوڈ…</p>;
  }

  const customerLines = customerPrintLines(lease.customer);

  return (
    <div className="p-8 font-urdu" dir="rtl">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">کھاتہ #{lease.accountNumber}</h1>
        <p className="mt-1 text-sm text-slate-600">{lease.customer.name} — {fmtDate(lease.accountDate)}</p>
      </div>

      <div className="mb-6 rounded border border-slate-200 p-4 text-sm">
        <h2 className="mb-2 font-semibold">گاہک کی تفصیل</h2>
        <div className="grid gap-1 sm:grid-cols-2">
          {customerLines.map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        {lease.salesman?.name ? <div className="mt-2 text-slate-600">سیلز مین: {lease.salesman.name}</div> : null}
        {lease.recoveryMan?.name ? (
          <div className="text-slate-600">ریکوری مین: {lease.recoveryMan.name}</div>
        ) : null}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><span className="text-slate-500">کل:</span> {fmtMoney(lease.totalAmount)}</div>
        <div><span className="text-slate-500">پیشگی:</span> {fmtMoney(lease.advanceAmount)}</div>
        <div><span className="text-slate-500">بقایا:</span> {fmtMoney(lease.remainingBalance)}</div>
        <div><span className="text-slate-500">قسط:</span> {fmtMoney(lease.currentInstallmentAmount)} ({FREQUENCY_LABELS[lease.frequency]})</div>
      </div>

      <h2 className="mb-2 font-semibold">اشیاء</h2>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="p-2 text-right">نام</th>
            <th className="p-2 text-right">مقدار</th>
            <th className="p-2 text-right">ریٹ</th>
            <th className="p-2 text-right">کل</th>
          </tr>
        </thead>
        <tbody>
          {lease.leaseItems.map((item, i) => (
            <tr key={i} className="border-b border-slate-200 align-top">
              <td className="p-2">
                <div className="font-medium">{item.itemName}</div>
                {(item.unitDetails ?? []).map((unit) => {
                  const fields = getDisplayFieldsFromUnit(unit);
                  if (fields.length === 0) return null;
                  return (
                    <div key={unit.unitIndex} className="mt-2 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-700">
                      {(item.unitDetails ?? []).length > 1 ? (
                        <p className="mb-1 font-semibold">یونٹ #{unit.unitIndex}</p>
                      ) : null}
                      <ul className="space-y-0.5">
                        {fields.map((field) => (
                          <li key={`${unit.unitIndex}-${field.label}`}>
                            <span className="text-slate-500">{field.label}:</span> {field.value}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </td>
              <td className="p-2">{item.quantity}</td>
              <td className="p-2">{fmtMoney(item.rate)}</td>
              <td className="p-2">{fmtMoney(item.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 font-semibold">قسط شیڈول</h2>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="p-2 text-right">#</th>
            <th className="p-2 text-right">تاریخ</th>
            <th className="p-2 text-right">اصل</th>
            <th className="p-2 text-right">ادا</th>
            <th className="p-2 text-right">حالت</th>
          </tr>
        </thead>
        <tbody>
          {lease.installments.map((row) => (
            <tr key={row.installmentNumber} className="border-b border-slate-200">
              <td className="p-2">{row.installmentNumber}</td>
              <td className="p-2">{fmtDate(row.dueDate)}</td>
              <td className="p-2">{fmtMoney(row.scheduledAmount)}</td>
              <td className="p-2">{fmtMoney(row.paidAmount)}</td>
              <td className="p-2">{STATUS_LABELS[row.status]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function KhataPrintPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">لوڈ…</p>}>
      <KhataPrintContent />
    </Suspense>
  );
}
