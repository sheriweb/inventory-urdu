import type { InstallmentFrequency } from '@inventory-urdu/shared';
import type { SaleInstallmentDraft } from '@/lib/sale-draft';

export type CustomerSaleHints = {
  accountNumber: number;
  advancePercent: number;
  installmentCount: number;
  frequency: InstallmentFrequency;
  perInstallmentAmount: number;
  salesmanId: string | null;
  recoveryManId: string | null;
  outdoorManId: string | null;
};

export function installmentDraftFromSaleHints(
  hints: CustomerSaleHints,
  startDate: string,
): SaleInstallmentDraft {
  return {
    installmentRows: [],
    scheduleTouched: false,
    perInstallmentInput:
      hints.perInstallmentAmount > 0 ? String(hints.perInstallmentAmount) : '',
    installmentCount: String(hints.installmentCount),
    installmentStartDate: startDate,
    frequency: hints.frequency,
  };
}

export function advanceFromSaleHints(grandTotal: number, hints: CustomerSaleHints): string {
  if (grandTotal <= 0 || hints.advancePercent <= 0) return '0';
  const amount = Math.round(grandTotal * (hints.advancePercent / 100) * 100) / 100;
  return String(amount);
}
