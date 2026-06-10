'use client';

import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { FormField } from '@/components/ui/form-section';
import { compactInputClass } from '@/components/forms/customer-form-fields';
import { SaleInstallmentScheduleEditor } from '@/components/forms/sale-installment-schedule-editor';
import type { useInstallmentSchedule } from '@/hooks/use-installment-schedule';

type InstallmentScheduleApi = ReturnType<typeof useInstallmentSchedule>;

type SaleInstallmentPanelProps = {
  advanceAmount: string;
  schedule: InstallmentScheduleApi;
  fieldClass?: string;
};

function fmtMoney(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export function SaleInstallmentPanel({
  advanceAmount,
  schedule,
  fieldClass = compactInputClass,
}: SaleInstallmentPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-start">
      <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
        <p className="border-b border-emerald-100 pb-2 text-center text-sm font-semibold text-emerald-900">
          ایڈوانس / ادائیگی
        </p>
        <div className="grid gap-2">
          <FormField label="ایڈوانس" compact>
            <InputWithVoice
              type="number"
              min={0}
              step="0.01"
              value={advanceAmount}
              onChange={(e) => schedule.onAdvanceChange(e.target.value)}
              voiceMode="number"
              voiceTitle="ایڈوانس بولیں"
              compact
              dir="ltr"
              className={`text-left font-semibold ${fieldClass}`}
            />
          </FormField>
          <FormField label="قسط (فی قسط رقم)" compact>
            <InputWithVoice
              type="number"
              min={0}
              step="0.01"
              value={schedule.perInstallmentInput}
              onChange={(e) => schedule.onPerInstallmentChange(e.target.value)}
              onBlur={schedule.onPerInstallmentBlur}
              voiceMode="number"
              voiceTitle="قسط رقم بولیں"
              compact
              dir="ltr"
              className={`text-left ${fieldClass}`}
              placeholder="خودکار"
            />
          </FormField>
          <FormField label="پہلی قسط کی تاریخ" compact>
            <Input
              type="date"
              value={schedule.installmentStartDate}
              onChange={(e) => schedule.onInstallmentStartDateChange(e.target.value)}
              dir="ltr"
              className={`text-left ${fieldClass}`}
            />
          </FormField>
          <FormField label="تعداد قسطیں" compact>
            <InputWithVoice
              type="number"
              min={1}
              step={1}
              value={schedule.installmentCount}
              onChange={(e) => schedule.onInstallmentCountChange(e.target.value)}
              onBlur={schedule.onInstallmentCountBlur}
              voiceMode="number"
              voiceTitle="تعداد قسطیں بولیں"
              compact
              required
              dir="ltr"
              className={`text-left ${fieldClass}`}
              placeholder="خود بخود"
            />
          </FormField>
          <FormField label="باقی رقم" compact>
            <Input
              readOnly
              value={fmtMoney(schedule.remainingAfterAdvance)}
              dir="ltr"
              className={`bg-white text-left font-bold text-red-600 ${fieldClass}`}
            />
          </FormField>
        </div>
      </div>

      <SaleInstallmentScheduleEditor
        rows={schedule.installmentRows}
        onChange={schedule.onInstallmentRowsChange}
        remainingAmount={schedule.remainingAfterAdvance}
        frequency={schedule.frequency}
        onFrequencyChange={schedule.onFrequencyChange}
        startDate={schedule.installmentStartDate}
        onRegenerate={schedule.regenerateSchedule}
      />
    </div>
  );
}
