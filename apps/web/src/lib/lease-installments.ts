import { InstallmentStatus } from '@inventory-urdu/shared';

const OPEN_STATUSES = new Set<InstallmentStatus>([
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
]);

export type InstallmentLike = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: string | number;
  paidAmount: string | number;
  status: InstallmentStatus;
};

function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

export function owedOnInstallment(inst: InstallmentLike): number {
  const owed = parseAmount(inst.scheduledAmount) - parseAmount(inst.paidAmount);
  return owed > 0 ? owed : 0;
}

/** First unpaid installment by due date (includes overdue). */
export function findNextDueInstallment<T extends InstallmentLike>(installments: T[]): T | null {
  return (
    installments
      .filter((i) => OPEN_STATUSES.has(i.status) && owedOnInstallment(i) > 0)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null
  );
}
