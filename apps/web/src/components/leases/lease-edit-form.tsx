'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Save } from 'lucide-react';
import api from '@/lib/api';
import { asArray, listFromResponse, recordFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-section';
import { compactInputClass } from '@/components/forms/customer-form-fields';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LeaseItemUnitDetails } from '@/components/leases/lease-item-unit-details';
import { useNavHistory } from '@/components/layout/nav-history-context';
import { fmtDate, fmtMoney } from '@/lib/format';
import { handleFormEnterKey } from '@/lib/form-enter-navigation';
import { LEASE_STATUS_LABELS } from '@/lib/labels';
import {
  InstallmentFrequency,
  InstallmentStatus,
  LeaseStatus,
  StaffType,
  type Staff,
} from '@inventory-urdu/shared';

const FREQUENCY_LABELS: Record<InstallmentFrequency, string> = {
  [InstallmentFrequency.DAILY]: 'روزانہ',
  [InstallmentFrequency.WEEKLY]: 'ہفتہ وار',
  [InstallmentFrequency.FIFTEEN_DAYS]: '15 دن',
  [InstallmentFrequency.MONTHLY]: 'ماہانہ',
};

const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

type LeaseEditData = {
  id: string;
  accountNumber: number;
  accountDate: string;
  totalAmount: string | number;
  advanceAmount: string | number;
  remainingBalance: string | number;
  installmentCount: number;
  currentInstallmentAmount: string | number;
  originalInstallmentAmount: string | number;
  frequency: InstallmentFrequency;
  status: LeaseStatus;
  note?: string | null;
  customer: { id: string; name: string; mobile?: string | null; cnic?: string | null };
  salesmanId?: string | null;
  recoveryManId?: string | null;
  outdoorManId?: string | null;
  salesman?: { id: string; name: string } | null;
  recoveryMan?: { id: string; name: string } | null;
  outdoorMan?: { id: string; name: string } | null;
  leaseItems: {
    id: string;
    itemName: string;
    rate: string | number;
    quantity: number;
    totalAmount: string | number;
    unitDetails?: import('@inventory-urdu/shared').LeaseItemUnitDetail[] | null;
  }[];
  installments: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    scheduledAmount: string | number;
    paidAmount: string | number;
    status: InstallmentStatus;
    isShort: boolean;
  }[];
  payments?: {
    id: string;
    receiptNumber: number;
    paymentType: string;
    amount: string | number;
  }[];
};

type ScheduleDraft = {
  dueDate: string;
  scheduledAmount: string;
};

function toDateInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

type LeaseEditFormProps = {
  leaseId: string;
};

export function LeaseEditForm({ leaseId }: LeaseEditFormProps) {
  const router = useRouter();
  const { setTabTitle } = useNavHistory();

  const [staff, setStaff] = useState<Staff[]>([]);
  const [lease, setLease] = useState<LeaseEditData | null>(null);
  const [salesmanId, setSalesmanId] = useState('');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [outdoorManId, setOutdoorManId] = useState('');
  const [accountNumberInput, setAccountNumberInput] = useState('');
  const [receiptNumberInput, setReceiptNumberInput] = useState('');
  const [accountDate, setAccountDate] = useState('');
  const [frequency, setFrequency] = useState<InstallmentFrequency>(InstallmentFrequency.MONTHLY);
  const [currentInstallmentInput, setCurrentInstallmentInput] = useState('');
  const [status, setStatus] = useState<LeaseStatus>(LeaseStatus.ACTIVE);
  const [note, setNote] = useState('');
  const fieldClass = compactInputClass;
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleDraft>>({});
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);
  const [scheduleMessages, setScheduleMessages] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [savingAccount, setSavingAccount] = useState(false);
  const [error, setError] = useState('');
  const [accountSuccess, setAccountSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/staff');
        setStaff(listFromResponse<Staff>({ data }).rows);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!leaseId) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leases/${leaseId}`);
      const row = recordFromResponse<LeaseEditData>({ data });
      if (!row) {
        setError('کھاتہ لوڈ نہیں ہو سکا');
        return;
      }
      setLease(row);
      setAccountNumberInput(String(row.accountNumber));
      const firstReceipt = row.payments?.[0]?.receiptNumber;
      setReceiptNumberInput(firstReceipt != null ? String(firstReceipt) : '');
      setAccountDate(toDateInput(row.accountDate));
      setFrequency(row.frequency);
      setCurrentInstallmentInput(String(parseAmount(row.currentInstallmentAmount)));
      setSalesmanId(row.salesmanId ?? '');
      setRecoveryManId(row.recoveryManId ?? '');
      setOutdoorManId(row.outdoorManId ?? '');
      setStatus(row.status);
      setNote(row.note ?? '');
      setScheduleDrafts(
        Object.fromEntries(
          row.installments.map((inst) => [
            inst.id,
            {
              dueDate: toDateInput(inst.dueDate),
              scheduledAmount: String(parseAmount(inst.scheduledAmount)),
            },
          ]),
        ),
      );
      setTabTitle(`کھاتہ #${row.accountNumber} — ${row.customer.name} (ترمیم)`);
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
      setLease(null);
    } finally {
      setLoading(false);
    }
  }, [leaseId, setTabTitle]);

  useEffect(() => {
    load();
  }, [load]);

  const salesmen = staff.filter((s) => s.type === StaffType.SALESMAN && s.isActive);
  const recoveryMen = staff.filter((s) => s.type === StaffType.RECOVERY_MAN && s.isActive);
  const outdoorMen = staff.filter((s) => s.type === StaffType.OUTDOOR_MAN && s.isActive);

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAccount(true);
    setError('');
    setAccountSuccess('');
    try {
      const perInstallment = parseFloat(currentInstallmentInput);
      const accountNumber = parseInt(accountNumberInput.trim(), 10);
      const receiptNumber = parseInt(receiptNumberInput.trim(), 10);
      await api.patch(`/leases/${leaseId}`, {
        accountDate,
        accountNumber: Number.isInteger(accountNumber) && accountNumber > 0 ? accountNumber : undefined,
        receiptNumber:
          Number.isInteger(receiptNumber) && receiptNumber > 0 ? receiptNumber : undefined,
        salesmanId: salesmanId || null,
        recoveryManId: recoveryManId || null,
        outdoorManId: outdoorManId || null,
        frequency,
        currentInstallmentAmount:
          !Number.isNaN(perInstallment) && perInstallment > 0 ? perInstallment : undefined,
        status,
        note: note || null,
      });
      setAccountSuccess('کھاتہ کی تفصیلات محفوظ ہو گئیں');
      notify.updated('کھاتہ');
      await load();
    } catch (err) {
      setError('کھاتہ اپڈیٹ نہیں ہو سکا');
      notify.fail('کھاتہ اپڈیٹ', err);
    } finally {
      setSavingAccount(false);
    }
  };

  const updateScheduleDraft = (scheduleId: string, patch: Partial<ScheduleDraft>) => {
    setScheduleDrafts((prev) => ({
      ...prev,
      [scheduleId]: { ...prev[scheduleId]!, ...patch },
    }));
    setScheduleMessages((m) => ({ ...m, [scheduleId]: '' }));
  };

  const saveScheduleRow = async (scheduleId: string) => {
    const draft = scheduleDrafts[scheduleId];
    if (!draft) return;
    const amount = parseFloat(draft.scheduledAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      setScheduleMessages((m) => ({ ...m, [scheduleId]: 'درست قسط رقم درج کریں' }));
      return;
    }
    setSavingScheduleId(scheduleId);
    setScheduleMessages((m) => ({ ...m, [scheduleId]: '' }));
    try {
      await api.patch(`/leases/${leaseId}/schedules/${scheduleId}`, {
        dueDate: draft.dueDate,
        scheduledAmount: amount,
      });
      setScheduleMessages((m) => ({ ...m, [scheduleId]: 'محفوظ' }));
      notify.saved('قسط اپڈیٹ');
      await load();
    } catch (err) {
      setScheduleMessages((m) => ({ ...m, [scheduleId]: 'محفوظ نہیں ہو سکی' }));
      notify.fail('قسط اپڈیٹ', err);
    } finally {
      setSavingScheduleId(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
      </Card>
    );
  }

  if (!lease) {
    return error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null;
  }

  const returnTo = `/dashboard/leases/${leaseId}/edit`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">کھاتہ ترمیم — مکمل فارم</h1>
          <p className="text-sm text-slate-500">
            {lease.customer.name} ·{' '}
            <Badge variant="success">{LEASE_STATUS_LABELS[lease.status]}</Badge>
          </p>
        </div>
        <PageToolbar>
          <Link
            href={`/dashboard/leases/${leaseId}`}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            تفصیل
          </Link>
          <Link
            href="/dashboard/accounts"
            className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            فہرست
          </Link>
        </PageToolbar>
      </div>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}
      {accountSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {accountSuccess}
        </div>
      ) : null}

      <Card className="border-emerald-200 shadow-sm">
        <CardHeader className="border-b border-emerald-100 bg-emerald-50/60 px-4 py-2.5">
          <CardTitle className="text-sm text-emerald-900">کھاتہ معلومات</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">نئی فروخت جیسا — تمام تفصیلات ایک جگہ</p>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleSaveAccount} className="space-y-4" onKeyDown={handleFormEnterKey}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <FormField label="کھاتہ نمبر" compact>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={accountNumberInput}
                  onChange={(e) => setAccountNumberInput(e.target.value)}
                  dir="ltr"
                  className={`text-left text-lg font-bold text-emerald-900 ${fieldClass}`}
                />
              </FormField>
              <FormField label="رسید نمبر" compact>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={receiptNumberInput}
                  onChange={(e) => setReceiptNumberInput(e.target.value)}
                  dir="ltr"
                  className={`text-left ${fieldClass}`}
                  placeholder={receiptNumberInput ? undefined : 'ابھی کوئی رسید نہیں'}
                />
              </FormField>
              <FormField label="تاریخ کھاتہ" compact>
                <Input
                  type="date"
                  value={accountDate}
                  onChange={(e) => setAccountDate(e.target.value)}
                  dir="ltr"
                  className={`text-left ${fieldClass}`}
                />
              </FormField>
              <FormField label="کل رقم" compact>
                <Input
                  readOnly
                  value={fmtMoney(lease.totalAmount)}
                  dir="ltr"
                  className={`bg-slate-50 text-left font-semibold ${fieldClass}`}
                />
              </FormField>
              <FormField label="ایڈوانس" compact>
                <Input
                  readOnly
                  value={fmtMoney(lease.advanceAmount)}
                  dir="ltr"
                  className={`bg-slate-50 text-left font-semibold ${fieldClass}`}
                />
              </FormField>
              <FormField label="باقی رقم" compact>
                <Input
                  readOnly
                  value={fmtMoney(lease.remainingBalance)}
                  dir="ltr"
                  className={`bg-slate-50 text-left font-bold text-red-600 ${fieldClass}`}
                />
              </FormField>
              <FormField label="قسط (فی قسط رقم)" compact>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={currentInstallmentInput}
                  onChange={(e) => setCurrentInstallmentInput(e.target.value)}
                  dir="ltr"
                  className={`text-left font-semibold ${fieldClass}`}
                />
              </FormField>
              <FormField label="تعداد قسطیں" compact>
                <Input
                  readOnly
                  value={String(lease.installmentCount)}
                  dir="ltr"
                  className={`bg-slate-50 text-left ${fieldClass}`}
                />
              </FormField>
              <FormField label="قسط کی مدت" compact>
                <Select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as InstallmentFrequency)}
                  className={fieldClass}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="سیلز مین" compact>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.SALESMAN}
                  value={salesmanId}
                  onChange={setSalesmanId}
                  placeholder="— منتخب کریں —"
                  options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="ریکوری مین" compact>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.RECOVERY_MAN}
                  value={recoveryManId}
                  onChange={setRecoveryManId}
                  placeholder="— منتخب کریں —"
                  options={recoveryMen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="پارٹنر / آؤٹ ڈور" compact>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.OUTDOOR_MAN}
                  value={outdoorManId}
                  onChange={setOutdoorManId}
                  placeholder="— منتخب کریں —"
                  options={outdoorMen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                  className={fieldClass}
                />
              </FormField>
              <FormField label="حالت" compact>
                <Select value={status} onChange={(e) => setStatus(e.target.value as LeaseStatus)} className={fieldClass}>
                  {Object.values(LeaseStatus).map((s) => (
                    <option key={s} value={s}>
                      {LEASE_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="نوٹ" compact className="sm:col-span-2 lg:col-span-4">
                <Input value={note} onChange={(e) => setNote(e.target.value)} className={fieldClass} />
              </FormField>
            </div>
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <Button type="submit" disabled={savingAccount} className="gap-1.5 min-w-[200px]">
                <Save className="h-4 w-4" />
                {savingAccount ? 'محفوظ…' : 'کھاتہ محفوظ کریں'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/dashboard/leases/${leaseId}/discount`)}
              >
                رعایت درج کریں
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-sm text-slate-900">گاہک</CardTitle>
            <Link
              href={`/dashboard/customers/${lease.customer.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}
              className="text-xs font-medium text-emerald-700 hover:underline"
            >
              گاہک ترمیم
            </Link>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-3">
          <FormField label="نام" compact>
            <Input readOnly value={lease.customer.name} className={`font-urdu ${fieldClass}`} />
          </FormField>
          <FormField label="موبائل" compact>
            <Input readOnly value={lease.customer.mobile ?? ''} dir="ltr" className={`text-left ${fieldClass}`} />
          </FormField>
          <FormField label="CNIC" compact>
            <Input readOnly value={lease.customer.cnic ?? ''} dir="ltr" className={`text-left ${fieldClass}`} />
          </FormField>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <CardTitle className="text-sm text-slate-900">آئٹمز (فروخت)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>ریٹ</TableHead>
                <TableHead>مقدار</TableHead>
                <TableHead>کل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lease.leaseItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="align-top">
                    <span className="font-medium font-urdu">{row.itemName}</span>
                    <LeaseItemUnitDetails itemName={row.itemName} unitDetails={row.unitDetails} />
                  </TableCell>
                  <TableCell dir="ltr">{fmtMoney(row.rate)}</TableCell>
                  <TableCell>{row.quantity}</TableCell>
                  <TableCell dir="ltr" className="font-medium">{fmtMoney(row.totalAmount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
          <CardTitle className="text-sm text-slate-900">قسطوں کا شیڈول (ترمیم)</CardTitle>
          <p className="mt-0.5 text-xs text-slate-500">
            تاریخ اور اصل قسط تبدیل کریں — ہر قطار الگ محفوظ ہوگی
          </p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table className="min-w-[720px] text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>تاریخ</TableHead>
                <TableHead>اصل قسط</TableHead>
                <TableHead>ادائیگی</TableHead>
                <TableHead>حالت</TableHead>
                <TableHead className="w-28">عمل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lease.installments.map((inst) => {
                const draft = scheduleDrafts[inst.id];
                return (
                  <TableRow key={inst.id} className={inst.isShort ? 'bg-amber-50/40' : undefined}>
                    <TableCell className="font-medium">{inst.installmentNumber}</TableCell>
                    <TableCell>
                      <Input
                        type="date"
                        value={draft?.dueDate ?? toDateInput(inst.dueDate)}
                        onChange={(e) => updateScheduleDraft(inst.id, { dueDate: e.target.value })}
                        dir="ltr"
                        className="h-8 min-w-[9rem] text-left text-xs"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={draft?.scheduledAmount ?? String(parseAmount(inst.scheduledAmount))}
                        onChange={(e) =>
                          updateScheduleDraft(inst.id, { scheduledAmount: e.target.value })
                        }
                        dir="ltr"
                        className="h-8 min-w-[5.5rem] text-left text-xs font-semibold"
                      />
                    </TableCell>
                    <TableCell dir="ltr">{fmtMoney(inst.paidAmount)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="muted">{INSTALLMENT_STATUS_LABELS[inst.status]}</Badge>
                        {inst.isShort ? <Badge variant="warning">شارٹ</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          disabled={savingScheduleId === inst.id}
                          onClick={() => saveScheduleRow(inst.id)}
                        >
                          {savingScheduleId === inst.id ? '…' : 'محفوظ'}
                        </Button>
                        {scheduleMessages[inst.id] ? (
                          <span className="text-[10px] text-slate-500">{scheduleMessages[inst.id]}</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
