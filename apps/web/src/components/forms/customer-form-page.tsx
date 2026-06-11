'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { List } from 'lucide-react';
import api from '@/lib/api';
import { asArray, listFromResponse, recordFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { ImageUpload } from '@/components/ui/image-upload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import {
  compactInputClass,
  compactTextareaClass,
  type CustomerFormState,
} from '@/components/forms/customer-form-fields';
import { SaleItemsCompactTable } from '@/components/forms/sale-items-compact-table';
import { SaleInstallmentPanel } from '@/components/forms/sale-installment-panel';
import { PresetFieldWithAdd } from '@/components/forms/preset-field-with-add';
import { MultiMobileFields } from '@/components/forms/multi-mobile-fields';
import { GuarantorDetailCard } from '@/components/forms/guarantor-detail-card';
import {
  emptyGuarantorForm,
  guarantorFromApi,
  guarantorHasContent,
  guarantorPayload,
  type GuarantorFormState,
} from '@/components/forms/guarantor-form-state';
import { handleFormEnterKey } from '@/lib/form-enter-navigation';
import { loadLastUsedStaff, saveLastUsedStaff } from '@/lib/last-used-staff';
import { customerPayload, customerToForm, emptyCustomerForm } from '@/lib/customer-form';
import { saveSaleDraft, saleDraftHasItems, type SaleInstallmentDraft } from '@/lib/sale-draft';
import {
  clearOfflineDraft,
  customerDraftHasContent,
  isBrowserOnline,
  loadOfflineDraft,
  type CustomerCreateOfflineDraft,
} from '@/lib/offline-draft-queue';
import {
  buildCustomerSyncPayload,
  enqueueOfflineSyncJob,
  shouldQueueOffline,
} from '@/lib/offline-sync-queue';
import { useOfflineDraftAutosave } from '@/hooks/use-offline-draft-autosave';
import { OfflineDraftRestoreBanner } from '@/components/pwa/offline-draft-restore-banner';
import { newSaleItemLine, roundMoney, type SaleItemLine } from '@/lib/sale-item-lines';
import { useInstallmentSchedule } from '@/hooks/use-installment-schedule';
import { StaffType, type Area, type Item, type Staff } from '@inventory-urdu/shared';
import { useNavHistory } from '@/components/layout/nav-history-context';

export type CustomerSaveMeta = {
  hasSaleDraft: boolean;
};

type CustomerFormPageProps = {
  mode: 'create' | 'edit';
  editId?: string;
  initialForm?: CustomerFormState;
  returnTo?: string | null;
  onSaved?: (customer: unknown, meta?: CustomerSaveMeta) => void;
};

export function CustomerFormPage({
  mode,
  editId,
  initialForm,
  returnTo,
  onSaved,
}: CustomerFormPageProps) {
  const [form, setForm] = useState<CustomerFormState>(initialForm ?? emptyCustomerForm);
  const [areas, setAreas] = useState<Area[]>([]);
  const [catalog, setCatalog] = useState<Item[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [itemLines, setItemLines] = useState<SaleItemLine[]>([newSaleItemLine()]);
  const [salesmanId, setSalesmanId] = useState('');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [outdoorManId, setOutdoorManId] = useState('');
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [loading, setLoading] = useState(mode === 'edit');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [restoreOffer, setRestoreOffer] = useState<{ savedAt: string; data: CustomerCreateOfflineDraft } | null>(null);
  const [installmentDraft, setInstallmentDraft] = useState<SaleInstallmentDraft | null>(null);
  const [guarantor, setGuarantor] = useState<GuarantorFormState>(() => emptyGuarantorForm());
  const [guarantorRows, setGuarantorRows] = useState<Parameters<typeof guarantorFromApi>[0][]>([]);
  const { setTabTitle } = useNavHistory();

  const salesmen = staff.filter((s) => s.type === StaffType.SALESMAN && s.isActive);
  const recoveryMen = staff.filter((s) => s.type === StaffType.RECOVERY_MAN && s.isActive);
  const outdoorMen = staff.filter((s) => s.type === StaffType.OUTDOOR_MAN && s.isActive);
  const showSaleSection = mode === 'create';

  const grandTotal = useMemo(
    () =>
      roundMoney(
        itemLines.reduce(
          (sum, line) => sum + roundMoney((Number(line.rate) || 0) * (Number(line.quantity) || 0)),
          0,
        ),
      ),
    [itemLines],
  );

  const hasValidItems = useMemo(
    () => itemLines.some((line) => line.itemName.trim() && Number(line.rate) > 0),
    [itemLines],
  );

  const installmentSchedule = useInstallmentSchedule({
    grandTotal,
    advanceAmount,
    setAdvanceAmount,
    hasValidItems,
    startDate: new Date().toISOString().slice(0, 10),
    initialDraft: installmentDraft,
  });

  const offlineCustomerDraft = useMemo(
    (): CustomerCreateOfflineDraft => ({
      form,
      guarantor: guarantorHasContent(guarantor) ? guarantor : undefined,
      itemLines,
      salesmanId,
      recoveryManId,
      outdoorManId,
      advanceAmount,
      installment: installmentSchedule.draftSnapshot,
    }),
    [
      form,
      guarantor,
      itemLines,
      salesmanId,
      recoveryManId,
      outdoorManId,
      advanceAmount,
      installmentSchedule.draftSnapshot,
    ],
  );

  useOfflineDraftAutosave({
    kind: 'customer-create',
    enabled: mode === 'create' && restoreOffer === null,
    data: offlineCustomerDraft,
    hasContent: customerDraftHasContent,
  });

  useEffect(() => {
    if (mode === 'create') {
      setTabTitle('نیا گاہک');
    }
  }, [mode, setTabTitle]);

  useEffect(() => {
    if (mode === 'edit' && form.name.trim()) {
      setTabTitle(`${form.name.trim()} — گاہک`);
    }
  }, [mode, form.name, setTabTitle]);

  const load = useCallback(async () => {
    if (mode !== 'edit' || !editId) return;
    setLoading(true);
    setError('');
    try {
      const [customerRes, areasRes] = await Promise.all([
        api.get(`/customers/${editId}`),
        api.get('/areas'),
      ]);
      type CustomerEditRecord = Parameters<typeof customerToForm>[0] & {
        guarantors?: Parameters<typeof guarantorFromApi>[0][];
      };
      const customer = recordFromResponse<CustomerEditRecord>(customerRes);
      if (!customer) {
        setError('گاہک لوڈ نہیں ہو سکا');
        return;
      }
      setForm(customerToForm(customer));
      setAreas(listFromResponse<Area>(areasRes).rows);
      const rows = Array.isArray(customer.guarantors) ? customer.guarantors : [];
      setGuarantorRows(rows);
      setGuarantor(rows[0] ? guarantorFromApi(rows[0]) : emptyGuarantorForm());
    } catch {
      setError('گاہک لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, [mode, editId]);

  useEffect(() => {
    if (mode === 'create' && !initialForm) {
      const saved = loadOfflineDraft<CustomerCreateOfflineDraft>('customer-create');
      if (saved && customerDraftHasContent(saved.data)) {
        setRestoreOffer({ savedAt: saved.savedAt, data: saved.data });
      }
    }
  }, [mode, initialForm]);

  function applyOfflineRestore() {
    if (!restoreOffer) return;
    const d = restoreOffer.data;
    setForm(d.form);
    setGuarantor(d.guarantor ?? emptyGuarantorForm());
    setItemLines(Array.isArray(d.itemLines) && d.itemLines.length > 0 ? d.itemLines : [newSaleItemLine()]);
    setSalesmanId(d.salesmanId);
    setRecoveryManId(d.recoveryManId);
    setOutdoorManId(d.outdoorManId);
    setAdvanceAmount(d.advanceAmount);
    setInstallmentDraft(d.installment);
    setRestoreOffer(null);
    notify.saved('آف لائن ڈرافٹ بحال ہو گیا');
  }

  function discardOfflineRestore() {
    clearOfflineDraft('customer-create');
    setRestoreOffer(null);
  }

  useEffect(() => {
    if (mode === 'edit' && editId) {
      void load();
      return;
    }
    if (restoreOffer) return;
    setForm(initialForm ?? emptyCustomerForm);
    setGuarantor(emptyGuarantorForm());
    setGuarantorRows([]);
    setItemLines([newSaleItemLine()]);
    setSalesmanId('');
    setRecoveryManId('');
    setOutdoorManId('');
    setAdvanceAmount('0');
    (async () => {
      try {
        const requests = [api.get('/areas')];
        if (mode === 'create') {
          requests.push(api.get('/items'), api.get('/staff'));
        }
        const results = await Promise.all(requests);
        setAreas(listFromResponse<Area>(results[0]).rows);
        if (mode === 'create' && results[1] && results[2]) {
          setCatalog(listFromResponse<Item>(results[1]).rows);
          setStaff(listFromResponse<Staff>(results[2]).rows);
          const lastStaff = loadLastUsedStaff();
          if (lastStaff) {
            if (lastStaff.salesmanId) setSalesmanId(lastStaff.salesmanId);
            if (lastStaff.recoveryManId) setRecoveryManId(lastStaff.recoveryManId);
            if (lastStaff.outdoorManId) setOutdoorManId(lastStaff.outdoorManId);
          }
        }
      } catch {
        setAreas([]);
        setCatalog([]);
        setStaff([]);
      }
    })();
  }, [mode, editId, initialForm, load, restoreOffer]);

  function patch(partial: Partial<CustomerFormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  useEffect(() => {
    if (!guarantor.id) return;
    const selected = guarantorRows.find((g) => g.id === guarantor.id);
    if (!selected) return;
    setGuarantor(guarantorFromApi(selected));
  }, [guarantor.id, guarantorRows]);

  async function saveGuarantorForCustomer(customerId: string) {
    if (!guarantorHasContent(guarantor)) return;
    const payload = guarantorPayload(guarantor);
    if (mode === 'edit' && guarantor.id) {
      await api.patch(`/customers/${customerId}/guarantors/${guarantor.id}`, payload);
      return;
    }
    const { data } = await api.post(`/customers/${customerId}/guarantors`, payload);
    const created = recordFromResponse<{ id?: string }>({ data });
    if (created?.id) {
      setGuarantor((prev) => ({ ...prev, id: created.id! }));
    }
  }

  const onSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      if (!form.name.trim()) {
        notify.fail('نام درج کریں');
        return;
      }
      setSubmitting(true);
      setError('');
      if (mode === 'create') {
        saveLastUsedStaff({ salesmanId, recoveryManId, outdoorManId });
      }
      const syncPayload = buildCustomerSyncPayload({
        form,
        guarantor: guarantorHasContent(guarantor) ? guarantor : undefined,
        itemLines,
        salesmanId,
        recoveryManId,
        outdoorManId,
        advanceAmount,
        installment: installmentSchedule.draftSnapshot,
      });

      if (mode === 'create' && !isBrowserOnline()) {
        enqueueOfflineSyncJob('customer-create', 'نیا گاہک', syncPayload);
        clearOfflineDraft('customer-create');
        notify.saved('آف لائن قطار میں محفوظ — انٹرنیٹ پر خود بھیجا جائے گا');
        setSubmitting(false);
        return;
      }

      try {
        let customer: unknown;
        if (mode === 'edit' && editId) {
          const { data } = await api.patch(`/customers/${editId}`, customerPayload(form));
          customer = recordFromResponse({ data }) ?? data?.data;
          try {
            await saveGuarantorForCustomer(editId);
          } catch {
            /* guarantor optional */
          }
          notify.updated('گاہک');
        } else {
          const { data } = await api.post('/customers', customerPayload(form));
          customer = recordFromResponse({ data }) ?? data?.data;
          const createdId = (customer as { id?: string })?.id;
          if (createdId) {
            try {
              await saveGuarantorForCustomer(createdId);
            } catch {
              /* guarantor optional */
            }
          }
          notify.created('گاہک');
          clearOfflineDraft('customer-create');
        }

        const draft = {
          itemLines,
          salesmanId,
          recoveryManId,
          outdoorManId,
          advanceAmount,
          installment: installmentSchedule.draftSnapshot,
        };
        const hasSaleDraft = mode === 'create' && saleDraftHasItems(draft);
        if (hasSaleDraft) {
          saveSaleDraft(draft);
        }
        onSaved?.(customer, { hasSaleDraft });
      } catch (err) {
        if (mode === 'create' && shouldQueueOffline(err)) {
          enqueueOfflineSyncJob('customer-create', 'نیا گاہک', syncPayload);
          clearOfflineDraft('customer-create');
          notify.saved('آف لائن قطار میں محفوظ — انٹرنیٹ پر خود بھیجا جائے گا');
          return;
        }
        setError(mode === 'edit' ? 'گاہک اپڈیٹ نہیں ہو سکا' : 'گاہک شامل نہیں ہو سکا');
        notify.fail(mode === 'edit' ? 'گاہک اپڈیٹ' : 'گاہک شامل', err);
      } finally {
        setSubmitting(false);
      }
    },
    [
      form,
      guarantor,
      mode,
      editId,
      onSaved,
      itemLines,
      salesmanId,
      recoveryManId,
      outdoorManId,
      advanceAmount,
      installmentSchedule.draftSnapshot,
    ],
  );

  useSaveShortcut(!loading, () => onSubmit());

  const cancelHref = returnTo || '/dashboard/customers';
  const title = mode === 'edit' ? 'گاہک ترمیم' : 'نیا گاہک';

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">تمام تفصیل ایک صفحے پر — نئی فروخت جیسا فارم</p>
        </div>
        <PageToolbar>
          <Link
            href={cancelHref}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <List className="h-4 w-4" />
            {returnTo ? 'واپس' : 'گاہکوں کی فہرست'}
          </Link>
        </PageToolbar>
      </div>

      {restoreOffer ? (
        <OfflineDraftRestoreBanner
          label="آف لائن محفوظ ڈرافٹ ملا — نیا گاہک فارم"
          savedAt={restoreOffer.savedAt}
          onRestore={applyOfflineRestore}
          onDiscard={discardOfflineRestore}
        />
      ) : null}

      {error ? <AlertBanner onRetry={mode === 'edit' ? load : undefined}>{error}</AlertBanner> : null}

      <form onSubmit={onSubmit} className="space-y-4" onKeyDown={handleFormEnterKey}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <CardTitle className="text-sm text-slate-900">ذاتی معلومات</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-3 sm:grid-cols-2">
              <FormField label="نام" compact>
                <UrduNameInput
                  value={form.name}
                  onChange={(name) => patch({ name })}
                  required
                  autoFocus={mode === 'create'}
                  showRomanHelper={false}
                  className={compactInputClass}
                />
              </FormField>
              <FormField label="والد/شوہر کا نام" compact>
                <UrduNameInput
                  value={form.fatherOrHusbandName}
                  onChange={(fatherOrHusbandName) => patch({ fatherOrHusbandName })}
                  showRomanHelper={false}
                  className={compactInputClass}
                />
              </FormField>
              <FormField label="ذات" compact>
                <PresetFieldWithAdd
                  presetKey="caste"
                  value={form.caste}
                  onChange={(caste) => patch({ caste })}
                  className={compactInputClass}
                  compact
                  addTitle="نیا ذات"
                  modalTitle="نیا ذات شامل کریں"
                />
              </FormField>
              <FormField label="پیشہ" compact>
                <PresetFieldWithAdd
                  presetKey="profession"
                  value={form.profession}
                  onChange={(profession) => patch({ profession })}
                  className={compactInputClass}
                  compact
                  addTitle="نیا پیشہ"
                  modalTitle="نیا پیشہ شامل کریں"
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <CardTitle className="text-sm text-slate-900">رابطہ و علاقہ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-3 sm:grid-cols-2">
              <MultiMobileFields
                primary={form.mobile}
                additional={form.additionalMobiles}
                onPrimaryChange={(mobile) => patch({ mobile })}
                onAdditionalChange={(additionalMobiles) => patch({ additionalMobiles })}
              />
              <FormField label="CNIC" compact>
                <Input
                  value={form.cnic}
                  onChange={(e) => patch({ cnic: e.target.value })}
                  dir="ltr"
                  className={`text-left ${compactInputClass}`}
                />
              </FormField>
              <FormField label="شہر" compact>
                <PresetFieldWithAdd
                  presetKey="city"
                  value={form.city}
                  onChange={(city) => patch({ city })}
                  className={compactInputClass}
                  compact
                  addTitle="نیا شہر"
                  modalTitle="نیا شہر شامل کریں"
                />
              </FormField>
              <FormField label="علاقہ" compact>
                <QuickAddSelect
                  entity="area"
                  value={form.areaId}
                  onChange={(id) => patch({ areaId: id })}
                  placeholder="— منتخب کریں —"
                  options={areas.map((a) => ({
                    value: a.id,
                    label: `${a.name}${a.city ? ` (${a.city})` : ''}`,
                  }))}
                  onOptionAdded={(record) => setAreas((prev) => [...prev, record as Area])}
                  className={compactInputClass}
                  compact
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <CardTitle className="text-sm text-slate-900">پتہ</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-3">
              <FormField label="موجودہ پتہ" compact>
                <textarea
                  className={compactTextareaClass}
                  value={form.presentAddress}
                  onChange={(e) => patch({ presentAddress: e.target.value })}
                />
              </FormField>
              <FormField label="مستقل پتہ" compact>
                <textarea
                  className={compactTextareaClass}
                  value={form.permanentAddress}
                  onChange={(e) => patch({ permanentAddress: e.target.value })}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <CardTitle className="text-sm text-slate-900">بینک</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 p-3 pt-3 sm:grid-cols-2">
              <FormField label="بینک" compact>
                <Input value={form.bankName} onChange={(e) => patch({ bankName: e.target.value })} className={compactInputClass} />
              </FormField>
              <FormField label="چیک نمبر" compact>
                <Input
                  value={form.chequeNumber}
                  onChange={(e) => patch({ chequeNumber: e.target.value })}
                  dir="ltr"
                  className={`text-left ${compactInputClass}`}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>

        <GuarantorDetailCard
          guarantor={guarantor}
          onChange={setGuarantor}
          options={guarantorRows.map((g) => ({ id: g.id, name: g.name }))}
          showSelector={mode === 'edit' && guarantorRows.length > 0}
        />

        {showSaleSection ? (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
              <div>
                <CardTitle className="text-sm text-slate-900">بابت خریداری / آئٹم</CardTitle>
                <p className="mt-0.5 text-xs text-slate-500">
                  نام، ریٹ، مقدار — موبائل IMEI 1/2 · موٹر سائیکل رجسٹریشن، ماڈل، ہارس پاور، میکر، چیسز، انجن
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 pt-3">
              <SaleItemsCompactTable
                lines={itemLines}
                catalog={catalog}
                onChange={setItemLines}
                onCatalogAdded={(item) => setCatalog((prev) => [...prev, item])}
              />
              <div className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-3">
                <FormField label="ریکوری مین" compact>
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.RECOVERY_MAN}
                    value={recoveryManId}
                    onChange={setRecoveryManId}
                    placeholder="—"
                    options={recoveryMen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(r) => setStaff((p) => [...p, r as Staff])}
                    className={compactInputClass}
                  />
                </FormField>
                <FormField label="سیلز مین" compact>
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.SALESMAN}
                    value={salesmanId}
                    onChange={setSalesmanId}
                    placeholder="—"
                    options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(r) => setStaff((p) => [...p, r as Staff])}
                    className={compactInputClass}
                  />
                </FormField>
                <FormField label="پارٹنر" compact>
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.OUTDOOR_MAN}
                    value={outdoorManId}
                    onChange={setOutdoorManId}
                    placeholder="—"
                    options={outdoorMen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(r) => setStaff((p) => [...p, r as Staff])}
                    className={compactInputClass}
                  />
                </FormField>
              </div>

              {hasValidItems && grandTotal > 0 ? (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    ایڈوانس اور اقساط — قسط کی رقم درج کریں یا دستی قسط شامل کریں
                  </p>
                  <SaleInstallmentPanel
                    advanceAmount={advanceAmount}
                    schedule={installmentSchedule}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
            <CardTitle className="text-sm text-slate-900">دستاویز (اختیاری)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 p-3 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <ImageUpload
              label="گاہک کی تصویر"
              hint="اختیاری"
              value={form.photoUrl}
              onChange={(url) => patch({ photoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
            <ImageUpload
              label="CNIC سامنے"
              hint="اختیاری"
              value={form.cnicFrontPhotoUrl}
              onChange={(url) => patch({ cnicFrontPhotoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
            <ImageUpload
              label="CNIC پیچھے"
              hint="اختیاری"
              value={form.cnicBackPhotoUrl}
              onChange={(url) => patch({ cnicBackPhotoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
            <ImageUpload
              label="چیک کی تصویر"
              hint="اختیاری"
              value={form.chequePhotoUrl}
              onChange={(url) => patch({ chequePhotoUrl: url })}
              className="[&_button]:min-h-[7rem] [&_button]:py-3 [&_p]:text-xs"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Link
            href={cancelHref}
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            منسوخ
          </Link>
          <Button type="submit" disabled={submitting} className="min-w-[180px]">
            {submitting ? 'محفوظ…' : mode === 'edit' ? 'محفوظ کریں' : 'گاہک محفوظ کریں'}
          </Button>
        </div>
      </form>
    </div>
  );
}
