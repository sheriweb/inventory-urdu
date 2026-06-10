import type {
  DraftInstallmentRow,
  InstallmentFrequency,
  ItemSaleType,
  SaleUnitDetailRows,
} from '@inventory-urdu/shared';

export type SaleInstallmentDraft = {
  installmentRows: DraftInstallmentRow[];
  scheduleTouched: boolean;
  perInstallmentInput: string;
  installmentCount: string;
  installmentStartDate: string;
  frequency: InstallmentFrequency;
};

export type SaleDraftLine = {
  key: string;
  catalogItemId: string;
  itemName: string;
  rate: string;
  quantity: string;
  saleType: ItemSaleType;
  unitDetailRows: SaleUnitDetailRows[];
};

export type SaleDraft = {
  itemLines: SaleDraftLine[];
  salesmanId: string;
  recoveryManId: string;
  outdoorManId: string;
  advanceAmount: string;
  installment?: SaleInstallmentDraft;
};

const STORAGE_KEY = 'inventory-urdu-sale-draft';

export function saveSaleDraft(draft: SaleDraft): void {
  const raw = JSON.stringify(draft);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(STORAGE_KEY, raw);
  }
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_KEY}-local`, raw);
    } catch {
      /* ignore */
    }
  }
}

export function loadSaleDraft(): SaleDraft | null {
  const parse = (raw: string | null): SaleDraft | null => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SaleDraft;
    } catch {
      return null;
    }
  };

  if (typeof sessionStorage !== 'undefined') {
    const fromSession = parse(sessionStorage.getItem(STORAGE_KEY));
    if (fromSession) return fromSession;
  }
  if (typeof localStorage !== 'undefined') {
    return parse(localStorage.getItem(`${STORAGE_KEY}-local`));
  }
  return null;
}

export function clearSaleDraft(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(STORAGE_KEY);
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(`${STORAGE_KEY}-local`);
  }
}

export function saleDraftHasItems(draft: SaleDraft | null): boolean {
  if (!draft) return false;
  return draft.itemLines.some(
    (line) => line.itemName.trim().length > 0 && Number(line.rate) > 0 && Number(line.quantity) > 0,
  );
}
