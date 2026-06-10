'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InstallmentFrequency,
  buildAutoInstallmentSchedule,
  countFromPerInstallment,
  MAX_INSTALLMENT_COUNT,
  type DraftInstallmentRow,
} from '@inventory-urdu/shared';
import { useDebounce } from '@/hooks/use-debounce';
import type { SaleInstallmentDraft } from '@/lib/sale-draft';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export type UseInstallmentScheduleOptions = {
  grandTotal: number;
  advanceAmount: string;
  setAdvanceAmount: (value: string) => void;
  isCashSale?: boolean;
  startDate: string;
  hasValidItems: boolean;
  initialDraft?: SaleInstallmentDraft | null;
};

export function useInstallmentSchedule({
  grandTotal,
  advanceAmount,
  setAdvanceAmount,
  isCashSale = false,
  startDate,
  hasValidItems,
  initialDraft,
}: UseInstallmentScheduleOptions) {
  const [installmentRows, setInstallmentRows] = useState<DraftInstallmentRow[]>(
    () => initialDraft?.installmentRows ?? [],
  );
  const [scheduleTouched, setScheduleTouched] = useState(
    () => initialDraft?.scheduleTouched ?? false,
  );
  const [perInstallmentInput, setPerInstallmentInput] = useState(
    () => initialDraft?.perInstallmentInput ?? '',
  );
  const [installmentCount, setInstallmentCount] = useState(
    () => initialDraft?.installmentCount ?? '',
  );
  const [installmentStartDate, setInstallmentStartDate] = useState(
    () => initialDraft?.installmentStartDate ?? startDate,
  );
  const [frequency, setFrequency] = useState<InstallmentFrequency>(
    () => initialDraft?.frequency ?? InstallmentFrequency.MONTHLY,
  );

  const advanceNum = isCashSale ? grandTotal : Number(advanceAmount) || 0;
  const installmentCountNum = isCashSale ? 0 : Math.floor(Number(installmentCount) || 0);
  const remainingAfterAdvance = roundMoney(Math.max(0, grandTotal - advanceNum));

  const debouncedPerInstallmentInput = useDebounce(perInstallmentInput, 400);
  const debouncedInstallmentCount = useDebounce(installmentCount, 350);

  const perInstallmentManual = Number(perInstallmentInput) || 0;
  const perInstallmentAmount =
    perInstallmentManual > 0
      ? roundMoney(perInstallmentManual)
      : !isCashSale && installmentCountNum > 0
        ? roundMoney(remainingAfterAdvance / installmentCountNum)
        : 0;

  const draftAppliedRef = useRef(initialDraft != null);

  useEffect(() => {
    if (!initialDraft || draftAppliedRef.current) return;
    draftAppliedRef.current = true;
    setInstallmentRows(initialDraft.installmentRows);
    setScheduleTouched(initialDraft.scheduleTouched);
    setPerInstallmentInput(initialDraft.perInstallmentInput);
    setInstallmentCount(initialDraft.installmentCount);
    setInstallmentStartDate(initialDraft.installmentStartDate);
    setFrequency(initialDraft.frequency);
  }, [initialDraft]);

  useEffect(() => {
    setInstallmentStartDate(startDate);
  }, [startDate]);

  useEffect(() => {
    setScheduleTouched(false);
  }, [grandTotal]);

  const syncInstallmentSchedule = useCallback(
    (options?: { force?: boolean; countOverride?: string }) => {
      if (isCashSale || !hasValidItems || remainingAfterAdvance <= 0) {
        setInstallmentRows([]);
        return;
      }
      if (scheduleTouched && !options?.force) return;

      const per = Number(debouncedPerInstallmentInput) || 0;
      const userEnteredCount = Math.floor(Number(installmentCount) || 0);
      const manualCount = Math.floor(
        Number(options?.countOverride ?? installmentCount) || 0,
      );
      const useManualCount = manualCount > 0;

      let countOverrideNum = 0;
      if (useManualCount) {
        countOverrideNum = Math.min(MAX_INSTALLMENT_COUNT, manualCount);
      } else if (per > 0) {
        countOverrideNum = countFromPerInstallment(remainingAfterAdvance, per);
      }

      const result = buildAutoInstallmentSchedule({
        remainingAmount: remainingAfterAdvance,
        frequency,
        startDate: installmentStartDate,
        installmentCount: countOverrideNum > 0 ? countOverrideNum : undefined,
      });

      if (result.rows.length === 0) return;

      if (!useManualCount) {
        setPerInstallmentInput((prev) => (prev.trim() ? prev : String(result.perInstallment)));
      } else if (!perInstallmentInput.trim() && result.perInstallment > 0) {
        setPerInstallmentInput(String(result.perInstallment));
      }

      if (userEnteredCount <= 0) {
        setInstallmentCount(String(result.count));
      }
      setInstallmentRows(result.rows);
    },
    [
      isCashSale,
      hasValidItems,
      remainingAfterAdvance,
      scheduleTouched,
      installmentCount,
      perInstallmentInput,
      debouncedPerInstallmentInput,
      frequency,
      installmentStartDate,
    ],
  );

  useEffect(() => {
    if (isCashSale || !hasValidItems) {
      setInstallmentRows([]);
      return;
    }
    if (scheduleTouched) return;

    const count = Math.floor(Number(debouncedInstallmentCount) || 0);
    if (count <= 0) return;

    syncInstallmentSchedule({ force: true, countOverride: debouncedInstallmentCount });
  }, [
    debouncedInstallmentCount,
    remainingAfterAdvance,
    frequency,
    installmentStartDate,
    hasValidItems,
    isCashSale,
    scheduleTouched,
    syncInstallmentSchedule,
  ]);

  useEffect(() => {
    if (isCashSale || !hasValidItems) {
      return;
    }
    if (scheduleTouched) return;
    if (Math.floor(Number(installmentCount) || 0) > 0) {
      return;
    }

    syncInstallmentSchedule();
  }, [
    grandTotal,
    remainingAfterAdvance,
    advanceNum,
    debouncedPerInstallmentInput,
    installmentCount,
    frequency,
    installmentStartDate,
    hasValidItems,
    isCashSale,
    scheduleTouched,
    syncInstallmentSchedule,
  ]);

  const onFrequencyChange = useCallback((next: InstallmentFrequency) => {
    setScheduleTouched(false);
    setFrequency(next);
  }, []);

  const onAdvanceChange = useCallback(
    (value: string) => {
      setScheduleTouched(false);
      setAdvanceAmount(value);
    },
    [setAdvanceAmount],
  );

  const onPerInstallmentChange = useCallback((value: string) => {
    setPerInstallmentInput(value);
  }, []);

  const onPerInstallmentBlur = useCallback(() => {
    if (scheduleTouched) return;
    if (remainingAfterAdvance <= 0) return;
    const count = Math.floor(Number(installmentCount) || 0);
    if (count > 0) {
      syncInstallmentSchedule({ force: true, countOverride: installmentCount });
      return;
    }
    const per = Number(perInstallmentInput) || 0;
    if (per <= 0) return;
    syncInstallmentSchedule({ force: true });
  }, [
    scheduleTouched,
    installmentCount,
    perInstallmentInput,
    remainingAfterAdvance,
    syncInstallmentSchedule,
  ]);

  const onInstallmentCountChange = useCallback((value: string) => {
    if (value === '') {
      setInstallmentCount('');
      return;
    }
    const n = Math.floor(Number(value) || 0);
    if (n > MAX_INSTALLMENT_COUNT) {
      setInstallmentCount(String(MAX_INSTALLMENT_COUNT));
      return;
    }
    setInstallmentCount(value);
  }, []);

  const onInstallmentCountBlur = useCallback(() => {
    if (scheduleTouched) return;
    const count = Math.floor(Number(installmentCount) || 0);
    if (count <= 0 || remainingAfterAdvance <= 0) return;
    syncInstallmentSchedule({ force: true, countOverride: installmentCount });
  }, [
    scheduleTouched,
    installmentCount,
    remainingAfterAdvance,
    syncInstallmentSchedule,
  ]);

  const regenerateSchedule = useCallback(() => {
    setScheduleTouched(false);
    syncInstallmentSchedule({ force: true });
  }, [syncInstallmentSchedule]);

  const onInstallmentRowsChange = useCallback((rows: DraftInstallmentRow[]) => {
    setScheduleTouched(true);
    setInstallmentRows(rows);
  }, []);

  const onInstallmentStartDateChange = useCallback((value: string) => {
    setScheduleTouched(false);
    setInstallmentStartDate(value);
  }, []);

  const draftSnapshot = useMemo(
    (): SaleInstallmentDraft => ({
      installmentRows,
      scheduleTouched,
      perInstallmentInput,
      installmentCount,
      installmentStartDate,
      frequency,
    }),
    [
      installmentRows,
      scheduleTouched,
      perInstallmentInput,
      installmentCount,
      installmentStartDate,
      frequency,
    ],
  );

  const resetSchedule = useCallback(() => {
    draftAppliedRef.current = false;
    setInstallmentRows([]);
    setScheduleTouched(false);
    setPerInstallmentInput('');
    setInstallmentCount('');
    setInstallmentStartDate(startDate);
    setFrequency(InstallmentFrequency.MONTHLY);
  }, [startDate]);

  return {
    installmentRows,
    perInstallmentInput,
    installmentCount,
    installmentStartDate,
    frequency,
    remainingAfterAdvance,
    perInstallmentAmount,
    onFrequencyChange,
    onAdvanceChange,
    onPerInstallmentChange,
    onPerInstallmentBlur,
    onInstallmentCountChange,
    onInstallmentCountBlur,
    regenerateSchedule,
    onInstallmentRowsChange,
    onInstallmentStartDateChange,
    resetSchedule,
    draftSnapshot,
  };
}
