'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { List } from 'lucide-react';
import api from '@/lib/api';
import { listFromResponse, recordFromResponse, asArray } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { loadLastUsedStaff, saveLastUsedStaff } from '@/lib/last-used-staff';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { CustomerSearchCombobox } from '@/components/forms/customer-search-combobox';
import { PresetFieldWithAdd } from '@/components/forms/preset-field-with-add';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { Modal } from '@/components/ui/modal';
import { rememberCustomer } from '@/lib/recent-customers';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import { useInstallmentSchedule } from '@/hooks/use-installment-schedule';
import { SaleInstallmentPanel } from '@/components/forms/sale-installment-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormSection } from '@/components/ui/form-section';
import { compactInputClass, compactTextareaClass } from '@/components/forms/customer-form-fields';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Badge } from '@/components/ui/badge';
import { generateId } from '@/lib/generate-id';
import { clearSaleDraft, loadSaleDraft } from '@/lib/sale-draft';
import {
  clearOfflineDraft,
  isBrowserOnline,
  leaseDraftHasContent,
  loadOfflineDraft,
  type LeaseNewOfflineDraft,
} from '@/lib/offline-draft-queue';
import {
  buildLeaseSyncPayloadFromDraft,
  enqueueOfflineSyncJob,
  shouldQueueOffline,
} from '@/lib/offline-sync-queue';
import { useOfflineDraftAutosave } from '@/hooks/use-offline-draft-autosave';
import { OfflineDraftRestoreBanner } from '@/components/pwa/offline-draft-restore-banner';
import { handleFormEnterKey } from '@/lib/form-enter-navigation';
import {
  advanceFromSaleHints,
  installmentDraftFromSaleHints,
  type CustomerSaleHints,
} from '@/lib/customer-sale-hints';
import { SaleItemsCompactTable } from '@/components/forms/sale-items-compact-table';
import { MultiMobileFields } from '@/components/forms/multi-mobile-fields';
import { ImageUpload } from '@/components/ui/image-upload';
import { GuarantorDetailCard } from '@/components/forms/guarantor-detail-card';
import {
  emptyGuarantorForm,
  guarantorFromApi,
  guarantorPayload,
  type GuarantorFormState,
} from '@/components/forms/guarantor-form-state';
import { parseAdditionalMobiles, sanitizeAdditionalMobiles } from '@/lib/customer-mobiles';
import {
  StaffType,
  fieldsForSaleType,
  sumDraftInstallmentAmounts,
  unitDetailRowsToLeaseFormat,
  validateSaleDetailRows,
  type Area,
  type CreateLeaseAccountDto,
  type CreateLeaseItemDto,
  type Item,
  type ItemSaleType,
  type SaleUnitDetailRows,
  type Staff,
} from '@inventory-urdu/shared';
import type { SaleInstallmentDraft } from '@/lib/sale-draft';

type CustomerOption = { id: string; name: string; mobile?: string | null };
type CustomerDetail = CustomerOption & {
  fatherOrHusbandName?: string | null;
  cnic?: string | null;
  additionalMobiles?: unknown;
  photoUrl?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  caste?: string | null;
  profession?: string | null;
  city?: string | null;
  areaId?: string | null;
  presentAddress?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
};
type GuarantorRow = Parameters<typeof guarantorFromApi>[0];
type StaffRow = Staff;
type ItemRow = Item;

type ItemLine = {
  key: string;
  catalogItemId: string;
  itemName: string;
  rate: string;
  quantity: string;
  saleType: ItemSaleType;
  unitDetailRows: SaleUnitDetailRows[];
};

type SalePaymentMode = 'installment' | 'cash';

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function newItemLine(): ItemLine {
  return {
    key: generateId(),
    catalogItemId: '',
    itemName: '',
    rate: '',
    quantity: '1',
    saleType: 'general',
    unitDetailRows: [],
  };
}

function lineTotal(line: ItemLine): number {
  const rate = Number(line.rate) || 0;
  const qty = Number(line.quantity) || 0;
  return roundMoney(rate * qty);
}

function fmtMoney(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type SuccessResult = {
  accountNumber: number;
  totalAmount: string | number;
  installmentCount: number;
  id: string;
};

export default function NewLeasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [catalog, setCatalog] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessResult | null>(null);
  const [restoreOffer, setRestoreOffer] = useState<{
    savedAt: string;
    data: LeaseNewOfflineDraft;
  } | null>(null);

  const [areas, setAreas] = useState<Area[]>([]);
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [receiptNumberInput, setReceiptNumberInput] = useState('');
  const [accountDate, setAccountDate] = useState(() => todayIsoDate());
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerFatherName, setCustomerFatherName] = useState('');
  const [customerCnic, setCustomerCnic] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerAdditionalMobiles, setCustomerAdditionalMobiles] = useState<string[]>([]);
  const [customerPhotoUrl, setCustomerPhotoUrl] = useState('');
  const [customerCnicFrontPhotoUrl, setCustomerCnicFrontPhotoUrl] = useState('');
  const [customerCnicBackPhotoUrl, setCustomerCnicBackPhotoUrl] = useState('');
  const [customerCaste, setCustomerCaste] = useState('');
  const [customerProfession, setCustomerProfession] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAreaId, setCustomerAreaId] = useState('');
  const [customerPresentAddress, setCustomerPresentAddress] = useState('');
  const [customerBankName, setCustomerBankName] = useState('');
  const [customerChequeNumber, setCustomerChequeNumber] = useState('');
  const [guarantors, setGuarantors] = useState<GuarantorRow[]>([]);
  const [guarantor, setGuarantor] = useState<GuarantorFormState>(() => emptyGuarantorForm());
  const [modalGuarantor, setModalGuarantor] = useState<GuarantorFormState>(() => emptyGuarantorForm());
  const [guarantorAddOpen, setGuarantorAddOpen] = useState(false);
  const [guarantorSubmitting, setGuarantorSubmitting] = useState(false);
  const [loadedInstallmentDraft, setLoadedInstallmentDraft] = useState<SaleInstallmentDraft | null>(null);
  const [salesmanId, setSalesmanId] = useState('');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [outdoorManId, setOutdoorManId] = useState('');
  const [itemLines, setItemLines] = useState<ItemLine[]>(() => [newItemLine()]);
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [note, setNote] = useState('');
  const [paymentMode, setPaymentMode] = useState<SalePaymentMode>('installment');
  const [saleHintsNotice, setSaleHintsNotice] = useState('');
  const [saleHints, setSaleHints] = useState<CustomerSaleHints | null>(null);
  const skipSaleHintsRef = useRef(false);
  const saleHintsCustomerRef = useRef('');

  const textareaClass = compactTextareaClass;
  const fieldClass = compactInputClass;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, itemsRes, areasRes, metaRes] = await Promise.all([
        api.get('/staff'),
        api.get('/items'),
        api.get('/areas'),
        api.get('/leases/preview-meta'),
      ]);
      setStaff(listFromResponse<StaffRow>(staffRes).rows);
      setCatalog(listFromResponse<ItemRow>(itemsRes).rows);
      setAreas(listFromResponse<Area>(areasRes).rows);
      const meta = recordFromResponse<{ nextAccountNumber?: number; nextReceiptNumber?: number }>(metaRes);
      setAccountNumberInput(
        meta?.nextAccountNumber != null ? String(meta.nextAccountNumber) : '',
      );
      setReceiptNumberInput(
        meta?.nextReceiptNumber != null ? String(meta.nextReceiptNumber) : '',
      );
      const lastStaff = loadLastUsedStaff();
      if (lastStaff) {
        if (lastStaff.salesmanId) setSalesmanId(lastStaff.salesmanId);
        if (lastStaff.recoveryManId) setRecoveryManId(lastStaff.recoveryManId);
        if (lastStaff.outdoorManId) setOutdoorManId(lastStaff.outdoorManId);
      }
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (searchParams.get('customerId')) return;
    const saved = loadOfflineDraft<LeaseNewOfflineDraft>('lease-new');
    if (saved && leaseDraftHasContent(saved.data)) {
      setRestoreOffer({ savedAt: saved.savedAt, data: saved.data });
    }
  }, [searchParams]);

  const loadCustomerDetails = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/customers/${id}`);
      const customer = recordFromResponse<CustomerDetail>({ data });
      if (!customer) return;
      setCustomerName(customer.name ?? '');
      setCustomerFatherName(customer.fatherOrHusbandName ?? '');
      setCustomerCnic(customer.cnic ?? '');
      setCustomerMobile(customer.mobile ?? '');
      setCustomerAdditionalMobiles(parseAdditionalMobiles(customer.additionalMobiles));
      setCustomerPhotoUrl(customer.photoUrl ?? '');
      setCustomerCnicFrontPhotoUrl(customer.cnicFrontPhotoUrl ?? '');
      setCustomerCnicBackPhotoUrl(customer.cnicBackPhotoUrl ?? '');
      setCustomerCaste(customer.caste ?? '');
      setCustomerProfession(customer.profession ?? '');
      setCustomerCity(customer.city ?? '');
      setCustomerAreaId(customer.areaId ?? '');
      setCustomerPresentAddress(customer.presentAddress ?? '');
      setCustomerBankName(customer.bankName ?? '');
      setCustomerChequeNumber(customer.chequeNumber ?? '');
    } catch {
      setCustomerName('');
      setCustomerFatherName('');
      setCustomerCnic('');
      setCustomerMobile('');
      setCustomerAdditionalMobiles([]);
      setCustomerPhotoUrl('');
      setCustomerCnicFrontPhotoUrl('');
      setCustomerCnicBackPhotoUrl('');
      setCustomerCaste('');
      setCustomerProfession('');
      setCustomerCity('');
      setCustomerAreaId('');
      setCustomerPresentAddress('');
      setCustomerBankName('');
      setCustomerChequeNumber('');
    }
  }, []);

  const loadGuarantors = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/customers/${id}/guarantors`);
      const rows = asArray<GuarantorRow>(data?.data);
      setGuarantors(rows);
      setGuarantor((prev) => {
        const keep = rows.find((g) => g.id === prev.id);
        if (keep) return guarantorFromApi(keep);
        return rows[0] ? guarantorFromApi(rows[0]) : emptyGuarantorForm();
      });
    } catch {
      setGuarantors([]);
      setGuarantor(emptyGuarantorForm());
    }
  }, []);

  useEffect(() => {
    const picked = searchParams.get('customerId');
    if (!picked) return;
    setCustomerId(picked);
    const draft = loadSaleDraft();
    if (draft) {
      skipSaleHintsRef.current = true;
      if (draft.itemLines.length > 0) setItemLines(draft.itemLines);
      if (draft.salesmanId) setSalesmanId(draft.salesmanId);
      if (draft.recoveryManId) setRecoveryManId(draft.recoveryManId);
      if (draft.outdoorManId) setOutdoorManId(draft.outdoorManId);
      if (draft.advanceAmount) setAdvanceAmount(draft.advanceAmount);
      if (draft.installment) setLoadedInstallmentDraft(draft.installment);
      clearSaleDraft();
    }
    router.replace('/dashboard/leases/new');
  }, [searchParams, router]);

  useEffect(() => {
    if (!customerId) {
      setSaleHints(null);
      setSaleHintsNotice('');
      saleHintsCustomerRef.current = '';
      setCustomerName('');
      setCustomerFatherName('');
      setCustomerCnic('');
      setCustomerMobile('');
      setCustomerAdditionalMobiles([]);
      setCustomerPhotoUrl('');
      setCustomerCnicFrontPhotoUrl('');
      setCustomerCnicBackPhotoUrl('');
      setCustomerCaste('');
      setCustomerProfession('');
      setCustomerCity('');
      setCustomerAreaId('');
      setCustomerPresentAddress('');
      setCustomerBankName('');
      setCustomerChequeNumber('');
      setGuarantors([]);
      setGuarantor(emptyGuarantorForm());
      return;
    }
    void loadCustomerDetails(customerId);
    void loadGuarantors(customerId);
  }, [customerId, loadCustomerDetails, loadGuarantors]);

  useEffect(() => {
    if (!customerId || restoreOffer) return;
    if (skipSaleHintsRef.current) {
      skipSaleHintsRef.current = false;
      return;
    }
    if (saleHintsCustomerRef.current === customerId) return;

    let active = true;
    saleHintsCustomerRef.current = customerId;

    void (async () => {
      try {
        const { data } = await api.get(`/customers/${customerId}/sale-hints`);
        const hints = recordFromResponse<CustomerSaleHints>({ data });
        if (!active || !hints) return;

        setSaleHints(hints);
        setSaleHintsNotice(`پچھلی فروخت #${hints.accountNumber} سے تجویز لاگو`);

        if (hints.salesmanId) setSalesmanId((prev) => prev || hints.salesmanId!);
        if (hints.recoveryManId) setRecoveryManId((prev) => prev || hints.recoveryManId!);
        if (hints.outdoorManId) setOutdoorManId((prev) => prev || hints.outdoorManId!);

        setLoadedInstallmentDraft(installmentDraftFromSaleHints(hints, accountDate));
      } catch {
        if (active) {
          setSaleHints(null);
          setSaleHintsNotice('');
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [customerId, restoreOffer, accountDate]);

  useEffect(() => {
    if (!guarantor.id) return;
    const selected = guarantors.find((g) => g.id === guarantor.id);
    if (!selected) return;
    setGuarantor(guarantorFromApi(selected));
  }, [guarantor.id, guarantors]);

  const grandTotal = useMemo(
    () => roundMoney(itemLines.reduce((sum, line) => sum + lineTotal(line), 0)),
    [itemLines],
  );

  const isCashSale = paymentMode === 'cash';
  const advanceNum = isCashSale ? grandTotal : Number(advanceAmount) || 0;

  useEffect(() => {
    if (!saleHints || isCashSale || grandTotal <= 0) return;
    setAdvanceAmount(advanceFromSaleHints(grandTotal, saleHints));
  }, [saleHints, grandTotal, isCashSale]);

  useEffect(() => {
    if (isCashSale && grandTotal > 0) {
      setAdvanceAmount(String(grandTotal));
    }
  }, [isCashSale, grandTotal]);

  const hasValidItems = useMemo(
    () => itemLines.some((line) => line.itemName.trim() && Number(line.rate) > 0),
    [itemLines],
  );

  const installmentSchedule = useInstallmentSchedule({
    grandTotal,
    advanceAmount,
    setAdvanceAmount,
    isCashSale,
    startDate: accountDate,
    hasValidItems,
    initialDraft: loadedInstallmentDraft,
  });

  const {
    installmentRows,
    remainingAfterAdvance,
    perInstallmentAmount,
    frequency,
    resetSchedule,
    draftSnapshot,
  } = installmentSchedule;

  const offlineLeaseDraft = useMemo(
    (): LeaseNewOfflineDraft => ({
      accountNumberInput,
      receiptNumberInput,
      accountDate,
      customerId,
      customerName,
      customerFatherName,
      customerCnic,
      customerMobile,
      customerAdditionalMobiles,
      customerPhotoUrl,
      customerCnicFrontPhotoUrl,
      customerCnicBackPhotoUrl,
      customerCaste,
      customerProfession,
      customerCity,
      customerAreaId,
      customerPresentAddress,
      customerBankName,
      customerChequeNumber,
      guarantor,
      salesmanId,
      recoveryManId,
      outdoorManId,
      itemLines,
      advanceAmount,
      note,
      paymentMode,
      installment: draftSnapshot,
    }),
    [
      accountNumberInput,
      receiptNumberInput,
      accountDate,
      customerId,
      customerName,
      customerFatherName,
      customerCnic,
      customerMobile,
      customerAdditionalMobiles,
      customerPhotoUrl,
      customerCnicFrontPhotoUrl,
      customerCnicBackPhotoUrl,
      customerCaste,
      customerProfession,
      customerCity,
      customerAreaId,
      customerPresentAddress,
      customerBankName,
      customerChequeNumber,
      guarantor,
      salesmanId,
      recoveryManId,
      outdoorManId,
      itemLines,
      advanceAmount,
      note,
      paymentMode,
      draftSnapshot,
    ],
  );

  useOfflineDraftAutosave({
    kind: 'lease-new',
    enabled: restoreOffer === null && !success,
    data: offlineLeaseDraft,
    hasContent: leaseDraftHasContent,
  });

  function applyOfflineRestore() {
    if (!restoreOffer) return;
    const d = restoreOffer.data;
    setAccountNumberInput(d.accountNumberInput);
    setReceiptNumberInput(d.receiptNumberInput);
    setAccountDate(d.accountDate);
    setCustomerId(d.customerId);
    setCustomerName(d.customerName);
    setCustomerFatherName(d.customerFatherName);
    setCustomerCnic(d.customerCnic);
    setCustomerMobile(d.customerMobile);
    setCustomerAdditionalMobiles(d.customerAdditionalMobiles ?? []);
    setCustomerPhotoUrl(d.customerPhotoUrl ?? '');
    setCustomerCnicFrontPhotoUrl(d.customerCnicFrontPhotoUrl ?? '');
    setCustomerCnicBackPhotoUrl(d.customerCnicBackPhotoUrl ?? '');
    setCustomerCaste(d.customerCaste);
    setCustomerProfession(d.customerProfession);
    setCustomerCity(d.customerCity);
    setCustomerAreaId(d.customerAreaId);
    setCustomerPresentAddress(d.customerPresentAddress);
    setCustomerBankName(d.customerBankName);
    setCustomerChequeNumber(d.customerChequeNumber);
    setGuarantor(d.guarantor ?? emptyGuarantorForm());
    setSalesmanId(d.salesmanId);
    setRecoveryManId(d.recoveryManId);
    setOutdoorManId(d.outdoorManId);
    setItemLines(d.itemLines.length > 0 ? d.itemLines : [newItemLine()]);
    setAdvanceAmount(d.advanceAmount);
    setNote(d.note);
    setPaymentMode(d.paymentMode);
    setLoadedInstallmentDraft(d.installment);
    setRestoreOffer(null);
    notify.saved('آف لائن ڈرافٹ بحال ہو گیا');
  }

  function discardOfflineRestore() {
    clearOfflineDraft('lease-new');
    setRestoreOffer(null);
  }

  useSaveShortcut(!success && !loading && !submitting, () => {
    const form = document.querySelector('form');
    form?.requestSubmit();
  });

  const salesmen = useMemo(() => staff.filter((s) => s.type === StaffType.SALESMAN && s.isActive), [staff]);
  const recoveryMen = useMemo(() => staff.filter((s) => s.type === StaffType.RECOVERY_MAN && s.isActive), [staff]);
  const outdoorMen = useMemo(() => staff.filter((s) => s.type === StaffType.OUTDOOR_MAN && s.isActive), [staff]);

  function resetForm() {
    clearOfflineDraft('lease-new');
    setSuccess(null);
    setError('');
    setAccountDate(todayIsoDate());
    setCustomerId('');
    setCustomerName('');
    setCustomerFatherName('');
    setCustomerCnic('');
    setCustomerMobile('');
    setCustomerCaste('');
    setCustomerProfession('');
    setCustomerCity('');
    setCustomerAreaId('');
    setCustomerPresentAddress('');
    setCustomerBankName('');
    setCustomerChequeNumber('');
    setGuarantors([]);
    setGuarantor(emptyGuarantorForm());
    setGuarantorAddOpen(false);
    setModalGuarantor(emptyGuarantorForm());
    resetSchedule();
    setLoadedInstallmentDraft(null);
    setSalesmanId('');
    setRecoveryManId('');
    setOutdoorManId('');
    setItemLines([newItemLine()]);
    setAdvanceAmount('0');
    setNote('');
    setPaymentMode('installment');
  }

  function validateForm(): boolean {
    if (!customerId) {
      setError('گاہک منتخب کریں');
      return false;
    }
    const items = buildItemsPayload();
    if (items.length === 0) {
      setError('کم از کم ایک درست آئٹم لائن شامل کریں');
      return false;
    }
    for (const line of itemLines.filter((row) => row.itemName.trim() && Number(row.rate) > 0)) {
      const detailError = validateSaleDetailRows(
        line.unitDetailRows,
        Number(line.quantity) || 1,
        fieldsForSaleType(line.saleType),
      );
      if (detailError) {
        setError(detailError);
        return false;
      }
    }
    if (!isCashSale && installmentRows.length < 1) {
      setError('کم از کم ایک قسط شیڈول میں شامل کریں');
      return false;
    }
    if (!isCashSale) {
      const scheduleSum = sumDraftInstallmentAmounts(installmentRows);
      if (Math.abs(scheduleSum - remainingAfterAdvance) > 0.02) {
        setError(`قسطوں کا کل (${fmtMoney(scheduleSum)}) باقی رقم (${fmtMoney(remainingAfterAdvance)}) کے برابر ہونا چاہیے`);
        return false;
      }
    }
    if (isCashSale && grandTotal <= 0) {
      setError('کل رقم صفر سے زیادہ ہونی چاہیے');
      return false;
    }
    setError('');
    return true;
  }

  function buildItemsPayload(): CreateLeaseItemDto[] {
    return itemLines
      .filter((line) => line.itemName.trim() && Number(line.rate) > 0 && Number(line.quantity) > 0)
      .map((line) => ({
        itemId: line.catalogItemId || undefined,
        itemName: line.itemName.trim(),
        rate: Number(line.rate),
        quantity: Number(line.quantity),
        unitDetails: (() => {
          const details = unitDetailRowsToLeaseFormat(line.unitDetailRows);
          return details.length > 0 ? details : undefined;
        })(),
      }));
  }

  async function syncCustomerDetails() {
    if (!customerId) return;
    try {
      const extras = sanitizeAdditionalMobiles(customerAdditionalMobiles);
      await api.patch(`/customers/${customerId}`, {
        fatherOrHusbandName: customerFatherName.trim() || undefined,
        cnic: customerCnic.trim() || undefined,
        mobile: customerMobile.trim() || undefined,
        additionalMobiles: extras.length > 0 ? extras : undefined,
        photoUrl: customerPhotoUrl.trim() || undefined,
        cnicFrontPhotoUrl: customerCnicFrontPhotoUrl.trim() || undefined,
        cnicBackPhotoUrl: customerCnicBackPhotoUrl.trim() || undefined,
        caste: customerCaste.trim() || undefined,
        profession: customerProfession.trim() || undefined,
        city: customerCity.trim() || undefined,
        areaId: customerAreaId || undefined,
        presentAddress: customerPresentAddress.trim() || undefined,
        bankName: customerBankName.trim() || undefined,
        chequeNumber: customerChequeNumber.trim() || undefined,
      });
    } catch {
      /* اجازت نہ ہو تو فروخت جاری رکھیں */
    }
  }

  async function syncGuarantorDetails() {
    if (!customerId || !guarantor.id) return;
    try {
      await api.patch(`/customers/${customerId}/guarantors/${guarantor.id}`, guarantorPayload(guarantor));
    } catch {
      /* optional */
    }
  }

  async function onAddGuarantor() {
    if (!customerId || !modalGuarantor.name.trim()) return;
    setGuarantorSubmitting(true);
    try {
      const { data } = await api.post(`/customers/${customerId}/guarantors`, guarantorPayload(modalGuarantor));
      const created = recordFromResponse<GuarantorRow>({ data });
      if (!created) return;
      setGuarantors((prev) => [created, ...prev]);
      setGuarantor(guarantorFromApi(created));
      setModalGuarantor(emptyGuarantorForm());
      setGuarantorAddOpen(false);
      notify.created('ضامن', created.name);
    } catch (err: unknown) {
      notify.fail('ضامن شامل', err);
    } finally {
      setGuarantorSubmitting(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!validateForm()) return;
    setSubmitting(true);
    saveLastUsedStaff({ salesmanId, recoveryManId, outdoorManId });

    await syncCustomerDetails();
    await syncGuarantorDetails();

    const items = buildItemsPayload();

    const saleNote = [
      isCashSale ? 'نقد فروخت' : 'قسطی فروخت',
      note.trim(),
    ]
      .filter(Boolean)
      .join(' — ');

    const accountNumber = parseInt(accountNumberInput.trim(), 10);
    const receiptNumber = parseInt(receiptNumberInput.trim(), 10);

    const payload: CreateLeaseAccountDto = {
      accountDate,
      customerId,
      accountNumber:
        Number.isInteger(accountNumber) && accountNumber > 0 ? accountNumber : undefined,
      receiptNumber:
        Number.isInteger(receiptNumber) && receiptNumber > 0 ? receiptNumber : undefined,
      salesmanId: salesmanId || undefined,
      recoveryManId: recoveryManId || undefined,
      outdoorManId: outdoorManId || undefined,
      advanceAmount: isCashSale ? grandTotal : advanceNum,
      installmentAmount: isCashSale ? 1 : perInstallmentAmount > 0 ? perInstallmentAmount : undefined,
      frequency,
      installments: isCashSale
        ? undefined
        : installmentRows.map((row) => ({
            dueDate: row.dueDate,
            scheduledAmount: Number(row.amount) || 0,
          })),
      note: saleNote || undefined,
      items,
    };

    const syncPayload = buildLeaseSyncPayloadFromDraft(offlineLeaseDraft, payload);

    if (!isBrowserOnline()) {
      enqueueOfflineSyncJob('lease-new', 'نئی فروخت', syncPayload);
      clearOfflineDraft('lease-new');
      notify.saved('آف لائن قطار میں محفوظ — انٹرنیٹ پر خود بھیجا جائے گا');
      setSubmitting(false);
      return;
    }

    try {
      const { data } = await api.post('/leases', payload);
      const created = recordFromResponse<SuccessResult>({ data });
      if (!created?.id) {
        notify.fail('فروخت', null, 'فروخت محفوظ نہیں ہو سکی');
        return;
      }
      clearOfflineDraft('lease-new');
      setSuccess({
        id: created.id,
        accountNumber: created.accountNumber,
        totalAmount: created.totalAmount,
        installmentCount: created.installmentCount,
      });
      notify.created('کھاتہ', `کھاتہ #${created.accountNumber}`);
    } catch (err: unknown) {
      if (shouldQueueOffline(err)) {
        enqueueOfflineSyncJob('lease-new', 'نئی فروخت', syncPayload);
        clearOfflineDraft('lease-new');
        notify.saved('آف لائن قطار میں محفوظ — انٹرنیٹ پر خود بھیجا جائے گا');
        return;
      }
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message
          : undefined;
      if (Array.isArray(msg)) setError(msg.join('، '));
      else if (typeof msg === 'string') setError(msg);
      else setError('کھاتہ محفوظ نہیں ہو سکا');
      notify.fail('کھاتہ محفوظ', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    const totalDisplay =
      typeof success.totalAmount === 'string' ? parseFloat(success.totalAmount) : success.totalAmount;
    return (
      <div className="space-y-6">
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-emerald-900">کھاتہ محفوظ ہو گیا</CardTitle>
              <Badge variant="success">کامیاب</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <dt className="text-xs font-medium text-slate-500">کھاتہ نمبر</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">{success.accountNumber}</dd>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <dt className="text-xs font-medium text-slate-500">کل رقم</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">{fmtMoney(totalDisplay)}</dd>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-white p-4">
                <dt className="text-xs font-medium text-slate-500">قسطوں کی تعداد</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">{success.installmentCount}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={resetForm}>
                نیا کھاتہ بنائیں
              </Button>
              <Link
                href={`/dashboard/print/khata/${success.id}?auto=1`}
                target="_blank"
                className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700"
              >
                پرنٹ کھاتہ
              </Link>
              <Link href={`/dashboard/leases/${success.id}`} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">تفصیل دیکھیں</Link>
              <Link href="/dashboard/leases" className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50">تمام کھاتے</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">نئی فروخت</h1>
          <p className="text-sm text-slate-500">گاہک، ضامن، فروخت اور قسط شیڈول — سب ایک صفحے پر</p>
        </div>
        <PageToolbar>
          <Link href="/dashboard/accounts" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <List className="h-4 w-4" />
            کھاتوں کی فہرست
          </Link>
        </PageToolbar>
      </div>

      {restoreOffer ? (
        <OfflineDraftRestoreBanner
          label="آف لائن محفوظ ڈرافٹ ملا — نئی فروخت"
          savedAt={restoreOffer.savedAt}
          onRestore={applyOfflineRestore}
          onDiscard={discardOfflineRestore}
        />
      ) : null}

      {saleHintsNotice ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <p className="font-medium">{saleHintsNotice}</p>
          <p className="mt-0.5 text-xs text-sky-800">
            ایڈوانس %، قسطیں، عملہ — پچھلے کھاتے جیسا (آپ تبدیل کر سکتے ہیں)
          </p>
        </div>
      ) : null}

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" onKeyDown={handleFormEnterKey}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <CardTitle className="text-sm text-slate-900">گاہک کی تفصیل</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 p-3 pt-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="کھاتہ / قرض کی تاریخ" compact>
                    <Input type="date" value={accountDate} onChange={(e) => setAccountDate(e.target.value)} required dir="ltr" className={`text-left ${fieldClass}`} />
                  </FormField>
                  <FormField label="کھاتہ نمبر" compact>
                    <InputWithVoice
                      type="number"
                      min={1}
                      step={1}
                      value={accountNumberInput}
                      onChange={(e) => setAccountNumberInput(e.target.value)}
                      voiceMode="number"
                      voiceTitle="کھاتہ نمبر بولیں"
                      compact
                      dir="ltr"
                      className={`text-left font-semibold ${fieldClass}`}
                    />
                  </FormField>
                  <FormField label="رسید نمبر" compact>
                    <InputWithVoice
                      type="number"
                      min={1}
                      step={1}
                      value={receiptNumberInput}
                      onChange={(e) => setReceiptNumberInput(e.target.value)}
                      voiceMode="number"
                      voiceTitle="رسید نمبر بولیں"
                      compact
                      dir="ltr"
                      className={`text-left ${fieldClass}`}
                    />
                  </FormField>
                  <FormField label="ادائیگی" compact>
                    <Select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value as SalePaymentMode)} className={fieldClass}>
                      <option value="installment">قسط پر</option>
                      <option value="cash">نقد</option>
                    </Select>
                  </FormField>
                </div>
                <FormField label="گاہک تلاش" compact>
                  <CustomerSearchCombobox
                    value={customerId}
                    onChange={setCustomerId}
                    onCustomerSelected={(customer) => rememberCustomer(customer)}
                    required
                  />
                </FormField>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <FormField label="نام" compact>
                    <UrduNameInput value={customerName} onChange={setCustomerName} disabled={!customerId} className={fieldClass} />
                  </FormField>
                  <FormField label="والد / شوہر نام" compact>
                    <UrduNameInput value={customerFatherName} onChange={setCustomerFatherName} disabled={!customerId} className={fieldClass} />
                  </FormField>
                  <FormField label="شناختی کارڈ نمبر" compact>
                    <InputWithVoice
                      value={customerCnic}
                      onChange={(e) => setCustomerCnic(e.target.value)}
                      disabled={!customerId}
                      voiceMode="number"
                      voiceTitle="CNIC بولیں"
                      compact
                      dir="ltr"
                      className={`text-left ${fieldClass}`}
                    />
                  </FormField>
                  <div className="col-span-full">
                    <MultiMobileFields
                      primary={customerMobile}
                      additional={customerAdditionalMobiles}
                      onPrimaryChange={setCustomerMobile}
                      onAdditionalChange={setCustomerAdditionalMobiles}
                      disabled={!customerId}
                    />
                  </div>
                  <FormField label="ذات" compact>
                    <PresetFieldWithAdd
                      presetKey="caste"
                      value={customerCaste}
                      onChange={setCustomerCaste}
                      disabled={!customerId}
                      className={fieldClass}
                      compact
                      addTitle="نیا ذات"
                      modalTitle="نیا ذات شامل کریں"
                    />
                  </FormField>
                  <FormField label="پیشہ / عہدہ" compact>
                    <PresetFieldWithAdd
                      presetKey="profession"
                      value={customerProfession}
                      onChange={setCustomerProfession}
                      disabled={!customerId}
                      className={fieldClass}
                      compact
                      addTitle="نیا پیشہ"
                      modalTitle="نیا پیشہ / عہدہ شامل کریں"
                    />
                  </FormField>
                  <FormField label="شہر" compact>
                    <PresetFieldWithAdd
                      presetKey="city"
                      value={customerCity}
                      onChange={setCustomerCity}
                      disabled={!customerId}
                      className={fieldClass}
                      compact
                      addTitle="نیا شہر"
                      modalTitle="نیا شہر شامل کریں"
                    />
                  </FormField>
                  <FormField label="علاقہ" compact>
                    <QuickAddSelect
                      entity="area"
                      value={customerAreaId}
                      onChange={setCustomerAreaId}
                      disabled={!customerId}
                      placeholder="— منتخب کریں —"
                      options={areas.map((a) => ({ value: a.id, label: a.name }))}
                      onOptionAdded={(record) => setAreas((prev) => [...prev, record as Area])}
                      className={fieldClass}
                      compact
                    />
                  </FormField>
                  <FormField label="پتہ" compact className="sm:col-span-2 lg:col-span-4">
                    <textarea className={textareaClass} value={customerPresentAddress} onChange={(e) => setCustomerPresentAddress(e.target.value)} disabled={!customerId} />
                  </FormField>
                  <FormField label="بینک" compact>
                    <Input value={customerBankName} onChange={(e) => setCustomerBankName(e.target.value)} disabled={!customerId} className={fieldClass} />
                  </FormField>
                  <FormField label="چیک نمبر" compact>
                    <Input value={customerChequeNumber} onChange={(e) => setCustomerChequeNumber(e.target.value)} disabled={!customerId} dir="ltr" className={`text-left ${fieldClass}`} />
                  </FormField>
                </div>
                <div className="grid gap-3 border-t border-slate-100 pt-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  <ImageUpload
                    label="گاہک کی تصویر"
                    hint="اختیاری"
                    value={customerPhotoUrl}
                    onChange={setCustomerPhotoUrl}
                    disabled={!customerId}
                    className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
                  />
                  <ImageUpload
                    label="CNIC سامنے"
                    hint="اختیاری"
                    value={customerCnicFrontPhotoUrl}
                    onChange={setCustomerCnicFrontPhotoUrl}
                    disabled={!customerId}
                    className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
                  />
                  <ImageUpload
                    label="CNIC پیچھے"
                    hint="اختیاری"
                    value={customerCnicBackPhotoUrl}
                    onChange={setCustomerCnicBackPhotoUrl}
                    disabled={!customerId}
                    className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <CardTitle className="text-sm text-slate-900">ضامن اور عملہ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 p-3 pt-3">
                <GuarantorDetailCard
                  guarantor={guarantor}
                  onChange={setGuarantor}
                  options={guarantors.map((g) => ({ id: g.id, name: g.name }))}
                  showSelector={Boolean(customerId && guarantors.length > 0)}
                  onAddNew={() => {
                    setModalGuarantor(emptyGuarantorForm());
                    setGuarantorAddOpen(true);
                  }}
                  disabled={!customerId}
                  embedded
                />
                <div className="grid gap-2 border-t border-slate-100 pt-2.5 sm:grid-cols-3">
                  <FormField label="ریکوری مین" compact>
                    <QuickAddSelect entity="staff" staffType={StaffType.RECOVERY_MAN} value={recoveryManId} onChange={setRecoveryManId} placeholder="—" options={recoveryMen.map((s) => ({ value: s.id, label: s.name }))} onOptionAdded={(r) => setStaff((p) => [...p, r as StaffRow])} className={fieldClass} />
                  </FormField>
                  <FormField label="سیلز مین" compact>
                    <QuickAddSelect entity="staff" staffType={StaffType.SALESMAN} value={salesmanId} onChange={setSalesmanId} placeholder="—" options={salesmen.map((s) => ({ value: s.id, label: s.name }))} onOptionAdded={(r) => setStaff((p) => [...p, r as StaffRow])} className={fieldClass} />
                  </FormField>
                  <FormField label="پارٹنر" compact>
                    <QuickAddSelect entity="staff" staffType={StaffType.OUTDOOR_MAN} value={outdoorManId} onChange={setOutdoorManId} placeholder="—" options={outdoorMen.map((s) => ({ value: s.id, label: s.name }))} onOptionAdded={(r) => setStaff((p) => [...p, r as StaffRow])} className={fieldClass} />
                  </FormField>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <CardTitle className="text-sm text-slate-900">بابت خریداری / فروخت</CardTitle>
              <p className="mt-0.5 text-xs text-slate-500">آئٹم ٹیبل — نام، ریٹ، مقدار</p>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-3">
              <SaleItemsCompactTable
                lines={itemLines}
                catalog={catalog}
                onChange={setItemLines}
                onCatalogAdded={(item) => setCatalog((prev) => [...prev, item])}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                <CardTitle className="text-sm text-slate-900">
                  {isCashSale ? 'نقد ادائیگی' : 'ایڈوانس اور اقساط'}
                </CardTitle>
                {!isCashSale ? (
                  <p className="mt-0.5 text-xs text-slate-500">دائیں — ایڈوانس · بائیں — قسطوں کا شیڈول</p>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4 p-3 pt-3">
                {isCashSale ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                    <p className="font-medium">نقد فروخت — کل رقم ایک ساتھ</p>
                    <p className="mt-1 text-2xl font-semibold" dir="ltr">{fmtMoney(grandTotal)}</p>
                  </div>
                ) : (
                  <SaleInstallmentPanel
                    advanceAmount={advanceAmount}
                    schedule={installmentSchedule}
                    fieldClass={fieldClass}
                  />
                )}
                <FormField label="نوٹ">
                  <textarea className={textareaClass} value={note} onChange={(e) => setNote(e.target.value)} />
                </FormField>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-emerald-50/30 shadow-sm lg:sticky lg:top-24 lg:self-start">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-emerald-900">خلاصہ</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">ٹوٹل رقم</span><span className="text-xl font-bold text-slate-900" dir="ltr">{fmtMoney(grandTotal)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">ایڈوانس</span><span className="font-medium" dir="ltr">{fmtMoney(advanceNum)}</span></div>
                <div className="flex justify-between border-t border-emerald-100 pt-2"><span className="text-slate-600">بقایا رقم</span><span className="text-lg font-bold text-red-600" dir="ltr">{fmtMoney(remainingAfterAdvance)}</span></div>
                {!isCashSale ? (
                  <div className="flex justify-between"><span className="text-slate-600">ٹوٹل اقساط</span><span className="font-semibold">{installmentRows.length || '—'}</span></div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pb-4">
            <Button type="submit" disabled={submitting} className="min-w-[200px]">
              {submitting ? 'محفوظ…' : isCashSale ? 'نقد فروخت محفوظ کریں' : 'قسطی فروخت محفوظ کریں'}
            </Button>
          </div>
          <Modal
            open={guarantorAddOpen}
            onClose={() => setGuarantorAddOpen(false)}
            title="نیا ضامن"
            description="فروخت کے دوران فوری شامل کریں"
            footer={
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setGuarantorAddOpen(false)}>
                  منسوخ
                </Button>
                <Button
                  type="button"
                  disabled={guarantorSubmitting || !modalGuarantor.name.trim()}
                  onClick={() => void onAddGuarantor()}
                >
                  {guarantorSubmitting ? 'محفوظ…' : 'ضامن محفوظ کریں'}
                </Button>
              </div>
            }
          >
            <GuarantorDetailCard
              guarantor={modalGuarantor}
              onChange={setModalGuarantor}
              embedded
            />
          </Modal>
        </form>
      )}
    </div>
  );
}
