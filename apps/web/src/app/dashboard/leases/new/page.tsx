'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Calculator, List, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { CustomerSearchCombobox } from '@/components/forms/customer-search-combobox';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { rememberCustomer } from '@/lib/recent-customers';
import { useSaveShortcut } from '@/hooks/use-save-shortcut';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormSection } from '@/components/ui/form-section';
import { StepProgress, type WizardStep } from '@/components/ui/step-form-modal';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  InstallmentFrequency,
  StaffType,
  type CreateLeaseAccountDto,
  type CreateLeaseItemDto,
  type Item,
  type Staff,
} from '@inventory-urdu/shared';

type CustomerOption = { id: string; name: string; mobile?: string | null };
type StaffRow = Staff;
type ItemRow = Item;

type ItemLine = {
  key: string;
  catalogItemId: string;
  itemName: string;
  rate: string;
  quantity: string;
};

const FREQUENCY_LABELS: Record<InstallmentFrequency, string> = {
  [InstallmentFrequency.DAILY]: 'روزانہ',
  [InstallmentFrequency.WEEKLY]: 'ہفتہ وار',
  [InstallmentFrequency.FIFTEEN_DAYS]: '15 دن',
  [InstallmentFrequency.MONTHLY]: 'ماہانہ',
};

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

function estimateInstallmentCount(total: number, advance: number, installment: number): number {
  if (installment <= 0) return 0;
  let remaining = roundMoney(total - advance);
  if (remaining <= 0) return 0;
  let count = 0;
  while (remaining > 0) {
    const scheduled = remaining >= installment ? installment : roundMoney(remaining);
    remaining = roundMoney(remaining - scheduled);
    count += 1;
  }
  return count;
}

function newItemLine(): ItemLine {
  return {
    key: crypto.randomUUID(),
    catalogItemId: '',
    itemName: '',
    rate: '',
    quantity: '1',
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
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [catalog, setCatalog] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  const [accountDate, setAccountDate] = useState(todayIsoDate);
  const [customerId, setCustomerId] = useState('');
  const [salesmanId, setSalesmanId] = useState('');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [outdoorManId, setOutdoorManId] = useState('');
  const [itemLines, setItemLines] = useState<ItemLine[]>(() => [newItemLine()]);
  const [advanceAmount, setAdvanceAmount] = useState('0');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [frequency, setFrequency] = useState<InstallmentFrequency>(InstallmentFrequency.MONTHLY);
  const [note, setNote] = useState('');
  const [wizardStep, setWizardStep] = useState(0);

  const textareaClass =
    'form-control-input min-h-[5rem] w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-sans leading-normal text-slate-900 shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, itemsRes] = await Promise.all([
        api.get('/staff'),
        api.get('/items'),
      ]);
      setStaff(staffRes.data.data as StaffRow[]);
      setCatalog(itemsRes.data.data as ItemRow[]);
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا — دوبارہ کوشش کریں');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSaveShortcut(wizardStep === 3 && !success && !loading && !submitting, () => {
    const form = document.querySelector('form');
    form?.requestSubmit();
  });

  const salesmen = useMemo(() => staff.filter((s) => s.type === StaffType.SALESMAN && s.isActive), [staff]);
  const recoveryMen = useMemo(() => staff.filter((s) => s.type === StaffType.RECOVERY_MAN && s.isActive), [staff]);
  const outdoorMen = useMemo(() => staff.filter((s) => s.type === StaffType.OUTDOOR_MAN && s.isActive), [staff]);

  const grandTotal = useMemo(
    () => roundMoney(itemLines.reduce((sum, line) => sum + lineTotal(line), 0)),
    [itemLines],
  );

  const advanceNum = Number(advanceAmount) || 0;
  const installmentNum = Number(installmentAmount) || 0;
  const remainingAfterAdvance = roundMoney(Math.max(0, grandTotal - advanceNum));
  const estimatedCount = estimateInstallmentCount(grandTotal, advanceNum, installmentNum);

  function updateLine(key: string, patch: Partial<ItemLine>) {
    setItemLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onCatalogSelect(key: string, itemId: string) {
    const item = catalog.find((i) => i.id === itemId);
    if (!item) {
      updateLine(key, { catalogItemId: '', itemName: '', rate: '' });
      return;
    }
    updateLine(key, {
      catalogItemId: itemId,
      itemName: item.name,
      rate: String(item.saleRate),
    });
  }

  function addRow() {
    setItemLines((rows) => [...rows, newItemLine()]);
  }

  function removeRow(key: string) {
    setItemLines((rows) => (rows.length <= 1 ? rows : rows.filter((r) => r.key !== key)));
  }

  function resetForm() {
    setSuccess(null);
    setError('');
    setAccountDate(todayIsoDate());
    setCustomerId('');
    setSalesmanId('');
    setRecoveryManId('');
    setOutdoorManId('');
    setItemLines([newItemLine()]);
    setAdvanceAmount('0');
    setInstallmentAmount('');
    setFrequency(InstallmentFrequency.MONTHLY);
    setNote('');
    setWizardStep(0);
  }

  function validateWizardStep(step: number): boolean {
    if (step === 0 && !customerId) {
      setError('گاہک منتخب کریں');
      return false;
    }
    if (step === 2) {
      const items = buildItemsPayload();
      if (items.length === 0) {
        setError('کم از کم ایک درست آئٹم لائن شامل کریں');
        return false;
      }
    }
    if (step === 3 && installmentNum <= 0) {
      setError('قسط کی رقم صفر سے زیادہ ہونی چاہیے');
      return false;
    }
    setError('');
    return true;
  }

  function goNextStep() {
    if (!validateWizardStep(wizardStep)) return;
    setWizardStep((s) => Math.min(s + 1, 3));
  }

  function goPrevStep() {
    setError('');
    setWizardStep((s) => Math.max(s - 1, 0));
  }

  const wizardSteps: WizardStep[] = [
    { title: 'کھاتہ', description: 'تاریخ اور گاہک' },
    { title: 'عملہ', description: 'سیلز و ریکوری' },
    { title: 'اشیاء', description: 'فروخت کی اشیاء' },
    { title: 'قسط', description: 'پیشگی و تعدد' },
  ];

  function buildItemsPayload(): CreateLeaseItemDto[] {
    return itemLines
      .filter((line) => line.itemName.trim() && Number(line.rate) > 0 && Number(line.quantity) > 0)
      .map((line) => ({
        itemId: line.catalogItemId || undefined,
        itemName: line.itemName.trim(),
        rate: Number(line.rate),
        quantity: Number(line.quantity),
      }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const items = buildItemsPayload();
    if (!customerId) {
      setError('گاہک منتخب کریں');
      setSubmitting(false);
      return;
    }
    if (items.length === 0) {
      setError('کم از کم ایک درست آئٹم لائن شامل کریں');
      setSubmitting(false);
      return;
    }
    if (installmentNum <= 0) {
      setError('قسط کی رقم صفر سے زیادہ ہونی چاہیے');
      setSubmitting(false);
      return;
    }

    const payload: CreateLeaseAccountDto = {
      accountDate,
      customerId,
      salesmanId: salesmanId || undefined,
      recoveryManId: recoveryManId || undefined,
      outdoorManId: outdoorManId || undefined,
      advanceAmount: advanceNum,
      installmentAmount: installmentNum,
      frequency,
      note: note.trim() || undefined,
      items,
    };

    try {
      const { data } = await api.post('/leases', payload);
      const created = data.data as SuccessResult;
      setSuccess({
        id: created.id,
        accountNumber: created.accountNumber,
        totalAmount: created.totalAmount,
        installmentCount: created.installmentCount,
      });
      notify.created('کھاتہ', `کھاتہ #${created.accountNumber}`);
    } catch (err: unknown) {
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
      <PageToolbar>
        <Link href="/dashboard/accounts" className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
          <List className="h-4 w-4" />
          کھاتوں کی فہرست
        </Link>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
        </Card>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <StepProgress steps={wizardSteps} current={wizardStep} />

            {wizardStep === 0 ? (
            <FormSection
              step={1}
              title="کھاتہ کی تفصیل"
              description="تاریخ اور گاہک منتخب کریں"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="تاریخ">
                  <Input type="date" value={accountDate} onChange={(e) => setAccountDate(e.target.value)} required dir="ltr" className="text-left" />
                </FormField>
                <FormField label="گاہک">
                  <CustomerSearchCombobox
                    value={customerId}
                    onChange={(id) => {
                      setCustomerId(id);
                    }}
                    onCustomerAdded={(customer) => rememberCustomer(customer)}
                    required
                  />
                </FormField>
              </div>
            </FormSection>
            ) : null}

            {wizardStep === 1 ? (
            <FormSection step={2} title="عملہ" description="سیلز، ریکوری اور آؤٹ ڈور مین">
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="سیلز مین">
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.SALESMAN}
                    value={salesmanId}
                    onChange={setSalesmanId}
                    placeholder="— منتخب کریں —"
                    options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(record) => setStaff((prev) => [...prev, record as StaffRow])}
                  />
                </FormField>
                <FormField label="ریکوری مین">
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.RECOVERY_MAN}
                    value={recoveryManId}
                    onChange={setRecoveryManId}
                    placeholder="— منتخب کریں —"
                    options={recoveryMen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(record) => setStaff((prev) => [...prev, record as StaffRow])}
                  />
                </FormField>
                <FormField label="آؤٹ ڈور مین">
                  <QuickAddSelect
                    entity="staff"
                    staffType={StaffType.OUTDOOR_MAN}
                    value={outdoorManId}
                    onChange={setOutdoorManId}
                    placeholder="— منتخب کریں —"
                    options={outdoorMen.map((s) => ({ value: s.id, label: s.name }))}
                    onOptionAdded={(record) => setStaff((prev) => [...prev, record as StaffRow])}
                  />
                </FormField>
              </div>
            </FormSection>
            ) : null}

            {wizardStep === 2 ? (
            <FormSection
              step={3}
              title="اشیاء"
              description="فروخت کی اشیاء اور ریٹ"
              headerAction={
                <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1">
                  <Plus className="h-4 w-4" />
                  لائن
                </Button>
              }
            >
              <div className="overflow-x-auto -mx-1 px-1">
                <Table>
                  <colgroup>
                    <col />
                    <col />
                    <col style={{ width: '7rem' }} />
                    <col style={{ width: '6rem' }} />
                    <col style={{ width: '7rem' }} />
                    <col style={{ width: '3rem' }} />
                  </colgroup>
                  <TableHeader>
                    <TableRow>
                      <TableHead>کیٹلاگ</TableHead>
                      <TableHead>نام</TableHead>
                      <TableHead className="w-28">ریٹ</TableHead>
                      <TableHead className="w-24">مقدار</TableHead>
                      <TableHead className="w-28 text-end">کل</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemLines.map((line) => (
                      <TableRow key={line.key}>
                        <TableCell>
                          <QuickAddSelect
                            entity="item"
                            value={line.catalogItemId}
                            onChange={(id) => onCatalogSelect(line.key, id)}
                            options={catalog.map((item) => ({ value: item.id, label: item.name }))}
                            onOptionAdded={(record) => {
                              const item = record as ItemRow;
                              setCatalog((prev) => [...prev, item]);
                              onCatalogSelect(line.key, item.id);
                            }}
                          >
                            <option value="">دستی</option>
                            {catalog.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </QuickAddSelect>
                        </TableCell>
                        <TableCell>
                          <UrduNameInput
                            value={line.itemName}
                            onChange={(itemName) => updateLine(line.key, { itemName })}
                            placeholder="آئٹم کا نام"
                            required={!line.catalogItemId}
                            showRomanHelper={false}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={line.rate}
                            onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                            required
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={line.quantity}
                            onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                            required
                          />
                        </TableCell>
                        <TableCell className="font-medium text-slate-900">{fmtMoney(lineTotal(line))}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeRow(line.key)}
                            disabled={itemLines.length <= 1}
                            aria-label="حذف"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-600">
                    مجموعی کل: <span className="text-lg font-semibold text-slate-900">{fmtMoney(grandTotal)}</span>
                  </p>
                </div>
              </div>
            </FormSection>
            ) : null}

            {wizardStep === 3 ? (
            <FormSection step={4} title="قسط کی تفصیل" description="پیشگی، قسط اور تعدد">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="پیشگی (ایڈوانس)">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </FormField>
                <FormField label="قسط">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={installmentAmount}
                    onChange={(e) => setInstallmentAmount(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </FormField>
                <FormField label="تعدد">
                  <Select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
                  >
                    {Object.values(InstallmentFrequency).map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="نوٹ" className="sm:col-span-2">
                  <textarea className={textareaClass} value={note} onChange={(e) => setNote(e.target.value)} />
                </FormField>
              </div>
            </FormSection>
            ) : null}

            <div className="flex justify-between gap-2">
              <Button type="button" variant="outline" onClick={goPrevStep} disabled={wizardStep === 0 || submitting} className="gap-1">
                <ChevronRight className="h-4 w-4" />
                پچھلا
              </Button>
              {wizardStep < 3 ? (
                <Button type="button" onClick={goNextStep} disabled={submitting} className="gap-1">
                  اگلا
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={submitting} className="min-w-[140px]">
                  {submitting ? 'محفوظ…' : 'کھاتہ محفوظ کریں'}
                </Button>
              )}
            </div>
          </div>

          <div className="xl:sticky xl:top-24 xl:self-start">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">لائیو پیش نظارہ</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">کل رقم (اشیاء)</span>
                  <span className="font-semibold text-slate-900">{fmtMoney(grandTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">پیشگی</span>
                  <span className="font-medium text-slate-800">{fmtMoney(advanceNum)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-3 text-sm">
                  <span className="text-slate-500">باقی رقم</span>
                  <span className="font-semibold text-emerald-700">{fmtMoney(remainingAfterAdvance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">فی قسط</span>
                  <span className="font-medium">{installmentNum > 0 ? fmtMoney(installmentNum) : '—'}</span>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">تخمینی قسطوں کی تعداد</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">
                    {installmentNum > 0 ? estimatedCount : '—'}
                  </p>
                  {installmentNum > 0 && estimatedCount > 0 ? (
                    <Badge variant="muted" className="mt-2">
                      {FREQUENCY_LABELS[frequency]}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}
