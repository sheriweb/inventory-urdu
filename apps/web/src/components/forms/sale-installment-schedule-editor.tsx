'use client';

import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InstallmentFrequency,
  addFrequencyToDate,
  buildDraftInstallmentRows,
  formatScheduleDate,
  renumberDraftInstallments,
  sumDraftInstallmentAmounts,
  urduDayName,
  MAX_INSTALLMENT_COUNT,
  type DraftInstallmentRow,
} from '@inventory-urdu/shared';

type Props = {
  rows: DraftInstallmentRow[];
  onChange: (rows: DraftInstallmentRow[]) => void;
  remainingAmount: number;
  frequency: InstallmentFrequency;
  onFrequencyChange: (frequency: InstallmentFrequency) => void;
  startDate: string;
  onRegenerate: () => void;
};

const FREQUENCY_OPTIONS: { value: InstallmentFrequency; label: string }[] = [
  { value: InstallmentFrequency.DAILY, label: 'یومیہ' },
  { value: InstallmentFrequency.WEEKLY, label: 'ہفتہ وار' },
  { value: InstallmentFrequency.FIFTEEN_DAYS, label: '15 دن' },
  { value: InstallmentFrequency.MONTHLY, label: 'ماہانہ' },
];

function fmtMoney(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function SaleInstallmentScheduleEditor({
  rows,
  onChange,
  remainingAmount,
  frequency,
  onFrequencyChange,
  startDate,
  onRegenerate,
}: Props) {
  const scheduleTotal = sumDraftInstallmentAmounts(rows);
  const mismatch = rows.length > 0 && Math.abs(scheduleTotal - remainingAmount) > 0.02;

  function updateRow(key: string, patch: Partial<DraftInstallmentRow>) {
    onChange(rows.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function removeRow(key: string) {
    if (rows.length <= 1) return;
    onChange(renumberDraftInstallments(rows.filter((row) => row.key !== key)));
  }

  function addRow() {
    if (rows.length >= MAX_INSTALLMENT_COUNT) return;
    const last = rows[rows.length - 1];
    const lastDate = last?.dueDate ?? startDate;
    const nextDate = addFrequencyToDate(lastDate, frequency, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, '0');
    const d = String(nextDate.getDate()).padStart(2, '0');
    onChange(
      renumberDraftInstallments([
        ...rows,
        {
          key: `inst_new_${Date.now()}`,
          installmentNumber: rows.length + 1,
          dueDate: `${y}-${m}-${d}`,
          amount: last?.amount ?? '',
        },
      ]),
    );
  }

  return (
    <div className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-center text-sm font-semibold text-slate-700">
        اقساط انفارمیشن
      </div>

      <div className="px-4">
        <p className="mb-2 text-xs font-medium text-slate-600">قسط کی مدت منتخب کریں — شیڈول فوراً ظاہر ہوگا</p>
        <div className="flex flex-wrap gap-4">
          {FREQUENCY_OPTIONS.map((opt) => (
            <label key={opt.value} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="installment-frequency"
                value={opt.value}
                checked={frequency === opt.value}
                onChange={() => onFrequencyChange(opt.value)}
                className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4">
        <p className="text-sm font-semibold text-slate-800">قسطوں کا شیڈول</p>
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={onRegenerate}>
          <RefreshCw className="h-4 w-4" />
          دوبارہ بنائیں
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-amber-700">ایڈوانس، قسط رقم اور تعداد درج کریں — پھر شیڈول خود بنے گا</p>
      ) : (
        <div className="overflow-x-auto px-2 pb-2">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-600">
                <th className="px-3 py-2 text-right font-medium">سیریل</th>
                <th className="px-3 py-2 text-right font-medium">تاریخ</th>
                <th className="px-3 py-2 text-right font-medium">دن</th>
                <th className="px-3 py-2 text-right font-medium">قسط</th>
                <th className="w-10 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={row.key}
                  className={`border-b border-slate-100 ${index % 2 === 1 ? 'bg-orange-50/40' : 'bg-white'}`}
                >
                  <td className="px-3 py-2 text-center font-medium text-slate-800">{row.installmentNumber}</td>
                  <td className="px-2 py-1.5">
                    <div className="space-y-0.5">
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updateRow(row.key, { dueDate: e.target.value })}
                        dir="ltr"
                        className="h-8 min-w-[8.5rem] text-left text-xs"
                      />
                      <p className="text-[10px] text-slate-400" dir="ltr">
                        {formatScheduleDate(row.dueDate)}
                      </p>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-700">{urduDayName(row.dueDate)}</td>
                  <td className="px-2 py-1.5">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(row.key, { amount: e.target.value })}
                      dir="ltr"
                      className="h-8 min-w-[5.5rem] text-left font-semibold"
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length <= 1}
                      className="h-7 w-7 p-0 text-red-600"
                      aria-label="قسط حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td colSpan={2} className="px-3 py-2 text-right text-sm font-medium text-slate-600">
                  ٹوٹل اقساط: <span className="font-bold text-slate-900">{rows.length}</span>
                </td>
                <td className="px-3 py-2" />
                <td className="px-3 py-2 text-left font-bold text-red-600" dir="ltr">
                  {fmtMoney(scheduleTotal)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3 text-sm">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={addRow}
          disabled={rows.length >= MAX_INSTALLMENT_COUNT}
        >
          <Plus className="h-4 w-4" />
          قسط شامل
        </Button>
        <p className={mismatch ? 'text-red-600' : 'text-emerald-700'}>
          {mismatch
            ? `کل (${fmtMoney(scheduleTotal)}) باقی (${fmtMoney(remainingAmount)}) کے برابر ہونا چاہیے`
            : `باقی رقم: ${fmtMoney(remainingAmount)} — تاریخ یا رقم تبدیل کر سکتے ہیں`}
        </p>
      </div>
    </div>
  );
}

export function generateInstallmentDraft(params: {
  remainingAmount: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
  startDate: string;
}): DraftInstallmentRow[] {
  if (params.remainingAmount <= 0) return [];
  return buildDraftInstallmentRows({
    remainingAmount: params.remainingAmount,
    installmentCount: params.installmentCount,
    frequency: params.frequency,
    startDate: params.startDate,
  });
}
