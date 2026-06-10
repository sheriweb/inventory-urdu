/** Matches InstallmentFrequency enum values — kept local to avoid circular imports */
export type ScheduleFrequency = 'DAILY' | 'WEEKLY' | 'FIFTEEN_DAYS' | 'MONTHLY';

/** UI guard — shop manually chooses installment count (cap avoids browser hang) */
export const MAX_INSTALLMENT_COUNT = 999;

export type DraftInstallmentRow = {
  key: string;
  installmentNumber: number;
  dueDate: string;
  amount: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addFrequencyToDate(
  base: Date | string,
  frequency: ScheduleFrequency,
  periods: number,
): Date {
  const date = typeof base === 'string' ? parseIsoDate(base) : new Date(base);
  switch (frequency) {
    case 'DAILY':
      date.setDate(date.getDate() + periods);
      break;
    case 'WEEKLY':
      date.setDate(date.getDate() + periods * 7);
      break;
    case 'FIFTEEN_DAYS':
      date.setDate(date.getDate() + periods * 15);
      break;
    case 'MONTHLY':
      date.setMonth(date.getMonth() + periods);
      break;
    default:
      date.setMonth(date.getMonth() + periods);
  }
  return date;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** باقی رقم کو برابر اقساط میں تقسیم — ہر قسط تقریباً یکساں */
export function splitEqualInstallments(total: number, count: number): number[] {
  const n = Math.max(1, Math.floor(count) || 1);
  const totalCents = Math.round(roundMoney(total) * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;

  return Array.from({ length: n }, (_, index) =>
    roundMoney((baseCents + (index < remainderCents ? 1 : 0)) / 100),
  );
}

function clampInstallmentCount(count: number): number {
  const n = Math.max(1, Math.floor(count) || 1);
  return Math.min(MAX_INSTALLMENT_COUNT, n);
}

export function buildDraftInstallmentRows(params: {
  remainingAmount: number;
  installmentCount: number;
  frequency: ScheduleFrequency;
  startDate: string;
}): DraftInstallmentRow[] {
  const count = clampInstallmentCount(params.installmentCount);
  const remaining = roundMoney(Math.max(0, params.remainingAmount));
  if (remaining <= 0) return [];

  const amounts = splitEqualInstallments(remaining, count);
  const start = parseIsoDate(params.startDate);

  return amounts.map((amount, index) => {
    const dueDate = addFrequencyToDate(start, params.frequency, index);
    return {
      key: `inst_${index + 1}`,
      installmentNumber: index + 1,
      dueDate: toIsoDate(dueDate),
      amount: String(amount),
    };
  });
}

export function sumDraftInstallmentAmounts(rows: DraftInstallmentRow[]): number {
  return roundMoney(
    rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
  );
}

const URDU_DAY_NAMES = ['اتوار', 'پیر', 'منگل', 'بدھ', 'جمعرات', 'جمعہ', 'ہفتہ'];

export function urduDayName(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return URDU_DAY_NAMES[date.getDay()] ?? '—';
}

export function formatScheduleDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
}

export function countFromPerInstallment(remaining: number, perInstallment: number): number {
  if (remaining <= 0 || perInstallment <= 0) return 0;
  const raw = Math.max(1, Math.ceil(roundMoney(remaining) / roundMoney(perInstallment)));
  return Math.min(MAX_INSTALLMENT_COUNT, raw);
}

/** Product select کے بعد خودکار قسط پلان — تقریباً 10 برابر اقساط */
export function deriveInstallmentPlan(remaining: number): {
  count: number;
  perInstallment: number;
} {
  const left = roundMoney(Math.max(0, remaining));
  if (left <= 0) return { count: 0, perInstallment: 0 };

  const count = left >= 20000 ? 10 : left >= 5000 ? 5 : 3;
  const per = roundMoney(left / count);
  return { count, perInstallment: per };
}

export function buildAutoInstallmentSchedule(params: {
  remainingAmount: number;
  frequency: ScheduleFrequency;
  startDate: string;
  installmentCount?: number;
}): { rows: DraftInstallmentRow[]; count: number; perInstallment: number } {
  const remaining = roundMoney(Math.max(0, params.remainingAmount));
  if (remaining <= 0) {
    return { rows: [], count: 0, perInstallment: 0 };
  }

  const derived = deriveInstallmentPlan(remaining);
  const count = clampInstallmentCount(
    params.installmentCount && params.installmentCount > 0
      ? Math.floor(params.installmentCount)
      : derived.count,
  );

  const amounts = splitEqualInstallments(remaining, count);
  const perInstallment = amounts[0] ?? roundMoney(remaining / count);

  const rows = buildDraftInstallmentRows({
    remainingAmount: remaining,
    installmentCount: count,
    frequency: params.frequency,
    startDate: params.startDate,
  });

  return { rows, count, perInstallment };
}

export function renumberDraftInstallments(rows: DraftInstallmentRow[]): DraftInstallmentRow[] {
  return rows.map((row, index) => ({
    ...row,
    installmentNumber: index + 1,
  }));
}
