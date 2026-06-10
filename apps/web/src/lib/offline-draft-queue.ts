import type { CustomerFormState } from '@/components/forms/customer-form-fields';
import type { GuarantorFormState } from '@/components/forms/guarantor-form-state';
import type { SaleDraft, SaleDraftLine, SaleInstallmentDraft } from '@/lib/sale-draft';

export type OfflineDraftKind = 'customer-create' | 'lease-new';

type DraftEnvelope<T> = {
  version: 1;
  savedAt: string;
  data: T;
};

export type CustomerCreateOfflineDraft = {
  form: CustomerFormState;
  guarantor?: GuarantorFormState;
  itemLines: SaleDraftLine[];
  salesmanId: string;
  recoveryManId: string;
  outdoorManId: string;
  advanceAmount: string;
  installment: SaleInstallmentDraft;
};

export type LeaseNewOfflineDraft = {
  accountNumberInput: string;
  receiptNumberInput: string;
  accountDate: string;
  customerId: string;
  customerName: string;
  customerFatherName: string;
  customerCnic: string;
  customerMobile: string;
  customerAdditionalMobiles: string[];
  customerPhotoUrl: string;
  customerCnicFrontPhotoUrl: string;
  customerCnicBackPhotoUrl: string;
  customerCaste: string;
  customerProfession: string;
  customerCity: string;
  customerAreaId: string;
  customerPresentAddress: string;
  customerBankName: string;
  customerChequeNumber: string;
  guarantor: GuarantorFormState;
  salesmanId: string;
  recoveryManId: string;
  outdoorManId: string;
  itemLines: SaleDraftLine[];
  advanceAmount: string;
  note: string;
  paymentMode: 'installment' | 'cash';
  installment: SaleInstallmentDraft;
};

const STORAGE_KEYS: Record<OfflineDraftKind, string> = {
  'customer-create': 'inventory-offline-customer-create-v1',
  'lease-new': 'inventory-offline-lease-new-v1',
};

export function isBrowserOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function saveOfflineDraft<T>(kind: OfflineDraftKind, data: T): void {
  if (typeof localStorage === 'undefined') return;
  const envelope: DraftEnvelope<T> = {
    version: 1,
    savedAt: new Date().toISOString(),
    data,
  };
  try {
    localStorage.setItem(STORAGE_KEYS[kind], JSON.stringify(envelope));
  } catch {
    /* quota / private mode */
  }
}

export function loadOfflineDraft<T>(kind: OfflineDraftKind): DraftEnvelope<T> | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[kind]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftEnvelope<T>;
    if (!parsed?.data || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearOfflineDraft(kind: OfflineDraftKind): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEYS[kind]);
  } catch {
    /* ignore */
  }
}

export function formatOfflineDraftAge(savedAt: string): string {
  const saved = new Date(savedAt).getTime();
  if (Number.isNaN(saved)) return '';
  const mins = Math.floor((Date.now() - saved) / 60000);
  if (mins < 1) return 'ابھی';
  if (mins < 60) return `${mins} منٹ پہلے`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} گھنٹے پہلے`;
  const days = Math.floor(hours / 24);
  return `${days} دن پہلے`;
}

export function customerDraftHasContent(draft: CustomerCreateOfflineDraft): boolean {
  if (draft.form.name.trim()) return true;
  if (draft.form.mobile.trim() || draft.form.cnic.trim()) return true;
  if (draft.form.additionalMobiles.some((m) => m.trim())) return true;
  if (draft.guarantor?.name.trim()) return true;
  if (draft.guarantor?.additionalMobiles?.some((m) => m.trim())) return true;
  if (draft.guarantor?.cnicFrontPhotoUrl?.trim() || draft.guarantor?.cnicBackPhotoUrl?.trim()) return true;
  return draft.itemLines.some(
    (line) => line.itemName.trim() && Number(line.rate) > 0 && Number(line.quantity) > 0,
  );
}

export function leaseDraftHasContent(draft: LeaseNewOfflineDraft): boolean {
  if (draft.customerId || draft.customerName.trim()) return true;
  if (draft.note.trim()) return true;
  return draft.itemLines.some(
    (line) => line.itemName.trim() && Number(line.rate) > 0 && Number(line.quantity) > 0,
  );
}

/** Cross-tab sale handoff — localStorage backup */
export function persistSaleDraftLocal(draft: SaleDraft): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem('inventory-urdu-sale-draft-local', JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function loadSaleDraftLocal(): SaleDraft | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('inventory-urdu-sale-draft-local');
    if (!raw) return null;
    return JSON.parse(raw) as SaleDraft;
  } catch {
    return null;
  }
}

export function clearSaleDraftLocal(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem('inventory-urdu-sale-draft-local');
}
