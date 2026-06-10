'use client';

import Link from 'next/link';
import { Printer } from 'lucide-react';
import { owedOnInstallment } from '@/lib/lease-installments';
import { InstallmentStatus } from '@inventory-urdu/shared';

type ScheduleRow = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  dayName?: string | null;
  scheduledAmount: string | number;
  paidAmount: string | number;
  status: InstallmentStatus;
  isShort: boolean;
};

type PaymentRow = {
  id: string;
  amount: string | number;
  paymentDate: string;
  paymentType: 'INSTALLMENT' | 'ADVANCE' | 'DISCOUNT';
  receiptNumber: number;
  note?: string | null;
  schedule?: { installmentNumber: number } | null;
};

type InstallmentDetailSplitViewProps = {
  accountDate: string;
  totalAmount: string | number;
  advanceAmount: string | number;
  remainingBalance: string | number;
  installments: ScheduleRow[];
  payments: PaymentRow[];
};

function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

function fmtMoney(v: string | number): string {
  const n = parseAmount(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDateCell(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

type ReceivedRow = {
  key: string;
  serial: number;
  paymentDate: string;
  receivedAmount: number;
  detail: string;
  balanceAfter: number;
  receiptId?: string;
  receiptNumber?: number;
  highlight?: boolean;
};

function buildReceivedRows(
  accountDate: string,
  totalAmount: string | number,
  advanceAmount: string | number,
  payments: PaymentRow[],
): ReceivedRow[] {
  const total = parseAmount(totalAmount);
  const advance = parseAmount(advanceAmount);
  const rows: ReceivedRow[] = [];
  let balance = total;
  let serial = 0;

  const hasAdvancePayment = payments.some((p) => p.paymentType === 'ADVANCE');

  if (advance > 0 && !hasAdvancePayment) {
    serial += 1;
    balance = Math.round((balance - advance) * 100) / 100;
    rows.push({
      key: 'advance-synthetic',
      serial,
      paymentDate: accountDate,
      receivedAmount: advance,
      detail: 'ایڈوانس',
      balanceAfter: balance,
      highlight: true,
    });
  }

  for (const payment of payments) {
    serial += 1;
    const amount = parseAmount(payment.amount);
    balance = Math.round((balance - amount) * 100) / 100;

    let detail = 'وصولی';
    if (payment.paymentType === 'ADVANCE') detail = 'ایڈوانس';
    else if (payment.paymentType === 'DISCOUNT') detail = 'رعایت';
    else if (payment.schedule?.installmentNumber != null) {
      detail = `قسط #${payment.schedule.installmentNumber}`;
    } else if (payment.note?.trim()) detail = payment.note.trim();

    rows.push({
      key: payment.id,
      serial,
      paymentDate: payment.paymentDate,
      receivedAmount: amount,
      detail,
      balanceAfter: balance,
      receiptId: payment.id,
      receiptNumber: payment.receiptNumber,
      highlight: payment.paymentType === 'ADVANCE',
    });
  }

  return rows;
}

export function InstallmentDetailSplitView({
  accountDate,
  totalAmount,
  advanceAmount,
  remainingBalance,
  installments,
  payments,
}: InstallmentDetailSplitViewProps) {
  const receivedRows = buildReceivedRows(accountDate, totalAmount, advanceAmount, payments);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-center text-sm font-semibold text-slate-700">
        اقساط انفارمیشن — دینا ایسا تھا · دیا ایسا ہے
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-sky-50/80 px-3 py-2 text-center text-xs font-semibold text-sky-900">
            قرض کی تفصیل (دینا ایسا تھا)
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[320px] border-collapse text-xs">
              <thead className="sticky top-0 z-[1] bg-slate-100">
                <tr className="text-slate-600">
                  <th className="px-2 py-2 font-semibold">سیریل</th>
                  <th className="px-2 py-2 font-semibold">تاریخ</th>
                  <th className="px-2 py-2 font-semibold">قسط</th>
                  <th className="px-2 py-2 font-semibold">قسط بقایا</th>
                </tr>
              </thead>
              <tbody>
                {installments.map((inst, index) => {
                  const owed = owedOnInstallment(inst);
                  return (
                    <tr
                      key={inst.id}
                      className={`border-t border-slate-100 ${index % 2 === 1 ? 'bg-orange-50/30' : ''} ${inst.isShort ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-center font-medium">{inst.installmentNumber}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap" dir="ltr">
                        {fmtDateCell(inst.dueDate)}
                      </td>
                      <td className="px-2 py-1.5 text-left font-semibold" dir="ltr">
                        {fmtMoney(inst.scheduledAmount)}
                      </td>
                      <td className="px-2 py-1.5 text-left font-medium text-red-600" dir="ltr">
                        {owed > 0 ? fmtMoney(owed) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-end text-slate-600">
                    کل اقساط: {installments.length}
                  </td>
                  <td className="px-2 py-2 text-left text-slate-800" dir="ltr">
                    {fmtMoney(
                      installments.reduce((s, i) => s + parseAmount(i.scheduledAmount), 0),
                    )}
                  </td>
                  <td className="px-2 py-2 text-left text-red-600" dir="ltr">
                    {fmtMoney(remainingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 bg-emerald-50/80 px-3 py-2 text-center text-xs font-semibold text-emerald-900">
            وصولی تفصیل (دیا ایسا ہے)
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[360px] border-collapse text-xs">
              <thead className="sticky top-0 z-[1] bg-slate-100">
                <tr className="text-slate-600">
                  <th className="px-2 py-2 font-semibold">نمبر</th>
                  <th className="px-2 py-2 font-semibold">تاریخ وصولی</th>
                  <th className="px-2 py-2 font-semibold">وصول رقم</th>
                  <th className="px-2 py-2 font-semibold">تفصیل</th>
                  <th className="px-2 py-2 font-semibold">بقایا</th>
                  <th className="w-8 px-1 py-2" />
                </tr>
              </thead>
              <tbody>
                {receivedRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      ابھی کوئی وصولی نہیں — ایڈوانس یا قسط درج ہونے پر یہاں دکھے گی
                    </td>
                  </tr>
                ) : (
                  receivedRows.map((row, index) => (
                    <tr
                      key={row.key}
                      className={`border-t border-slate-100 ${row.highlight ? 'bg-orange-100/70' : index % 2 === 1 ? 'bg-slate-50/60' : ''}`}
                    >
                      <td className="px-2 py-1.5 text-center">{row.serial}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap" dir="ltr">
                        {fmtDateCell(row.paymentDate)}
                      </td>
                      <td className="px-2 py-1.5 text-left font-semibold text-emerald-800" dir="ltr">
                        {fmtMoney(row.receivedAmount)}
                      </td>
                      <td className={`px-2 py-1.5 font-medium ${row.highlight ? 'text-orange-900' : 'text-slate-800'}`}>
                        {row.detail}
                      </td>
                      <td className="px-2 py-1.5 text-left font-medium" dir="ltr">
                        {fmtMoney(row.balanceAfter)}
                      </td>
                      <td className="px-1 py-1.5">
                        {row.receiptId ? (
                          <Link
                            href={`/dashboard/print/receipt/${row.receiptId}?auto=1`}
                            target="_blank"
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-emerald-700 hover:bg-emerald-50"
                            title="رسید"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
                  <td colSpan={2} className="px-2 py-2 text-end text-slate-600">
                    کل وصولی
                  </td>
                  <td className="px-2 py-2 text-left text-emerald-800" dir="ltr">
                    {fmtMoney(receivedRows.reduce((s, r) => s + r.receivedAmount, 0))}
                  </td>
                  <td colSpan={3} className="px-2 py-2 text-left text-slate-600" dir="ltr">
                    باقی: {fmtMoney(remainingBalance)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
