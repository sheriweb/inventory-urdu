'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight, CalendarClock, Printer, Wallet } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { PhoneActions } from '@/components/ui/phone-actions';
import { findNextDueInstallment, owedOnInstallment } from '@/lib/lease-installments';
import { InstallmentFrequency, InstallmentStatus, LeaseStatus } from '@inventory-urdu/shared';
import { LEASE_STATUS_LABELS } from '@/lib/labels';

const FREQUENCY_LABELS: Record<InstallmentFrequency, string> = {
  [InstallmentFrequency.DAILY]: 'روزانہ',
  [InstallmentFrequency.WEEKLY]: 'ہفتہ وار',
  [InstallmentFrequency.FIFTEEN_DAYS]: '15 دن',
  [InstallmentFrequency.MONTHLY]: 'ماہانہ',
};

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

type LeaseDetail = {
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
  salesman?: { id: string; name: string } | null;
  recoveryMan?: { id: string; name: string } | null;
  outdoorMan?: { id: string; name: string } | null;
  leaseItems: {
    id: string;
    itemName: string;
    rate: string | number;
    quantity: number;
    totalAmount: string | number;
    item?: { id: string; name: string; itemCode: number } | null;
  }[];
  installments: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    dayName?: string | null;
    scheduledAmount: string | number;
    paidAmount: string | number;
    status: InstallmentStatus;
    isShort: boolean;
  }[];
};

function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

function fmtMoney(v: string | number): string {
  const n = parseAmount(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

function leaseStatusVariant(status: LeaseStatus): 'default' | 'success' | 'warning' | 'muted' {
  switch (status) {
    case LeaseStatus.ACTIVE:
      return 'success';
    case LeaseStatus.DEFAULTED:
      return 'warning';
    case LeaseStatus.CLOSED:
      return 'muted';
    default:
      return 'default';
  }
}

function statusVariant(status: InstallmentStatus): 'default' | 'success' | 'warning' | 'muted' {
  switch (status) {
    case InstallmentStatus.PAID:
      return 'success';
    case InstallmentStatus.OVERDUE:
      return 'warning';
    case InstallmentStatus.PARTIAL:
      return 'default';
    default:
      return 'muted';
  }
}

export default function LeaseDetailPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payMessage, setPayMessage] = useState<Record<string, string>>({});
  const [lastPaymentBySchedule, setLastPaymentBySchedule] = useState<
    Record<string, { id: string; receiptNumber: number }>
  >({});

  const itemsPagination = useTablePagination(lease?.leaseItems.length ?? 0, 10, [id]);
  const installmentsPagination = useTablePagination(lease?.installments.length ?? 0, 10, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leases/${id}`);
      setLease(data.data as LeaseDetail);
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
      setLease(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const nextDue = useMemo(
    () => (lease ? findNextDueInstallment(lease.installments) : null),
    [lease],
  );

  const submitPay = async (scheduleId: string) => {
    if (!lease) return;
    const raw = payAmounts[scheduleId] ?? '';
    const amount = parseFloat(raw);
    if (Number.isNaN(amount) || amount <= 0) {
      setPayMessage((m) => ({ ...m, [scheduleId]: 'درست رقم درج کریں' }));
      return;
    }
    setPayingId(scheduleId);
    setPayMessage((m) => ({ ...m, [scheduleId]: '' }));
    try {
      const { data } = await api.post(`/leases/${lease.id}/schedules/${scheduleId}/pay`, { amount });
      const payment = data.data?.payment as { id?: string; receiptNumber?: number } | undefined;
      setPayAmounts((p) => ({ ...p, [scheduleId]: '' }));
      if (payment?.id && payment.receiptNumber != null) {
        setLastPaymentBySchedule((prev) => ({
          ...prev,
          [scheduleId]: { id: payment.id!, receiptNumber: payment.receiptNumber! },
        }));
        setPayMessage((m) => ({
          ...m,
          [scheduleId]: `ادائیگی درج — رسید #${payment.receiptNumber}`,
        }));
        notify.saved(`قسط کی ادائیگی — رسید #${payment.receiptNumber} (روزنامچہ میں محفوظ)`);
      } else {
        setPayMessage((m) => ({ ...m, [scheduleId]: 'ادائیگی درج ہو گئی' }));
        notify.saved('قسط کی ادائیگی درج ہو گئی');
      }
      await load();
    } catch (err) {
      setPayMessage((m) => ({ ...m, [scheduleId]: 'ادائیگی نہیں ہو سکی' }));
      notify.fail('ادائیگی', err);
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {lease ? (
        <p className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
          <span>
            کھاتہ #{lease.accountNumber} — {lease.customer.name} ({fmtDate(lease.accountDate)})
          </span>
          <Badge variant={leaseStatusVariant(lease.status)}>{LEASE_STATUS_LABELS[lease.status]}</Badge>
        </p>
      ) : null}
      <PageToolbar>
        <div className="flex flex-wrap gap-2">
          {lease ? (
            <>
              <Link
                href={`/dashboard/print/khata/${lease.id}?auto=1`}
                target="_blank"
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                پرنٹ
              </Link>
              <Link
                href={`/dashboard/leases/${lease.id}/edit`}
                className="inline-flex h-9 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                ایڈٹ
              </Link>
              <Link
                href={`/dashboard/leases/${lease.id}/discount`}
                className="inline-flex h-9 items-center justify-center rounded-md bg-amber-600 px-3 text-sm font-medium text-white transition hover:bg-amber-700"
              >
                رعایت
              </Link>
            </>
          ) : null}
          <Link
            href="/dashboard/accounts"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRight className="h-4 w-4" />
            فہرست
          </Link>
        </div>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
        </Card>
      ) : lease ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">کل رقم</p>
                <p className="mt-1 text-xl font-semibold">{fmtMoney(lease.totalAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">پیشگی</p>
                <p className="mt-1 text-xl font-semibold">{fmtMoney(lease.advanceAmount)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">باقی</p>
                <p className="mt-1 text-xl font-semibold text-emerald-700">{fmtMoney(lease.remainingBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">قسط / تعدد</p>
                <p className="mt-1 text-xl font-semibold">
                  {fmtMoney(lease.currentInstallmentAmount)}{' '}
                  <span className="text-sm font-normal text-slate-500">({FREQUENCY_LABELS[lease.frequency]})</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {nextDue ? (
            <Card className="border-sky-200 bg-gradient-to-l from-sky-50/90 to-white">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-sky-800">اگلی واجب قسط</p>
                    <p className="mt-0.5 text-lg font-bold text-slate-900">
                      #{nextDue.installmentNumber} — {fmtDate(nextDue.dueDate)}
                    </p>
                    <p className="text-sm text-slate-600">
                      بقایا:{' '}
                      <span className="font-semibold text-emerald-800">{fmtMoney(owedOnInstallment(nextDue))}</span>
                      {' · '}
                      <Badge variant={statusVariant(nextDue.status)} className="align-middle">
                        {STATUS_LABELS[nextDue.status]}
                      </Badge>
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/recovery?collect=${lease.id}&schedule=${nextDue.id}`}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  <Wallet className="h-4 w-4" />
                  قسط وصولی
                </Link>
              </CardContent>
            </Card>
          ) : null}

          <Card className="border-emerald-100 bg-emerald-50/40">
            <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
              <span className="text-slate-600">اصل قسط (کھاتہ):</span>
              <span className="text-lg font-semibold text-emerald-800">{fmtMoney(lease.originalInstallmentAmount)}</span>
              <Badge variant="muted">حوالہ</Badge>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">گاہک</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>
                  <span className="text-slate-500">نام: </span>
                  <span className="font-medium text-slate-900">{lease.customer.name}</span>
                </p>
                {lease.customer.mobile ? (
                  <p>
                    <span className="text-slate-500">موبائل: </span>
                    <PhoneActions mobile={lease.customer.mobile} />
                  </p>
                ) : null}
                {lease.customer.cnic ? (
                  <p>
                    <span className="text-slate-500">شناختی کارڈ: </span>
                    <span dir="ltr">{lease.customer.cnic}</span>
                  </p>
                ) : null}
                {lease.note ? (
                  <p className="border-t border-slate-100 pt-2 text-slate-600">{lease.note}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">عملہ</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-slate-500">سیلز مین</p>
                  <p className="font-medium">{lease.salesman?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">ریکوری</p>
                  <p className="font-medium">{lease.recoveryMan?.name ?? '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">آؤٹ ڈور</p>
                  <p className="font-medium">{lease.outdoorMan?.name ?? '—'}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">اشیاء</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="min-w-0">
                <colgroup>
                  <col />
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>نام</TableHead>
                    <TableHead>ریٹ</TableHead>
                    <TableHead>مقدار</TableHead>
                    <TableHead>کل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itemsPagination.pageSlice(lease.leaseItems).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium font-urdu" title={row.itemName}>
                        {row.itemName}
                      </TableCell>
                      <TableCell>{fmtMoney(row.rate)}</TableCell>
                      <TableCell>{row.quantity}</TableCell>
                      <TableCell>{fmtMoney(row.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={lease.leaseItems.length}
                start={itemsPagination.start}
                end={itemsPagination.end}
                safePage={itemsPagination.safePage}
                totalPages={itemsPagination.totalPages}
                onPageChange={itemsPagination.setPage}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">قسطوں کا شیڈول</CardTitle>
              <Badge variant="default">{lease.installmentCount} قسطیں</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table className="min-w-0">
                <colgroup>
                  <col style={{ width: '2.75rem' }} />
                  <col style={{ width: '26%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '14%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '22%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-2">#</TableHead>
                    <TableHead>تاریخ</TableHead>
                    <TableHead className="px-2">اصل قسط</TableHead>
                    <TableHead className="px-2">ادائیگی</TableHead>
                    <TableHead className="px-2">حالت</TableHead>
                    <TableHead className="whitespace-normal px-2 text-[11px] leading-5">ادائیگی درج کریں</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installmentsPagination.pageSlice(lease.installments).map((inst) => (
                    <TableRow key={inst.id} className={inst.isShort ? 'bg-amber-50/50' : undefined}>
                      <TableCell className="px-2">{inst.installmentNumber}</TableCell>
                      <TableCell className="min-w-0">
                        <div className="leading-snug">
                          <div className="text-sm">{fmtDate(inst.dueDate)}</div>
                          {inst.dayName ? (
                            <div className="truncate text-[11px] text-slate-400" dir="ltr">
                              {inst.dayName}
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 font-medium">{fmtMoney(inst.scheduledAmount)}</TableCell>
                      <TableCell className="px-2">{fmtMoney(inst.paidAmount)}</TableCell>
                      <TableCell className="px-2">
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge variant={statusVariant(inst.status)}>{STATUS_LABELS[inst.status]}</Badge>
                          {inst.isShort ? <Badge variant="warning">شارٹ</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="px-2 py-2">
                        <div className="flex min-w-0 flex-col gap-1.5">
                          <Input
                            type="number"
                            min={0}
                            step="any"
                            placeholder="رقم"
                            className="h-9 w-full min-w-0"
                            value={payAmounts[inst.id] ?? ''}
                            onChange={(e) =>
                              setPayAmounts((p) => ({ ...p, [inst.id]: e.target.value }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="h-8 w-full shrink-0 px-2 text-xs"
                            disabled={payingId === inst.id}
                            onClick={() => submitPay(inst.id)}
                          >
                            درج کریں
                          </Button>
                          {payMessage[inst.id] ? (
                            <span className="text-[11px] leading-snug text-slate-500">{payMessage[inst.id]}</span>
                          ) : null}
                          {lastPaymentBySchedule[inst.id] ? (
                            <Link
                              href={`/dashboard/print/receipt/${lastPaymentBySchedule[inst.id].id}?auto=1`}
                              target="_blank"
                              className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2 text-[11px] font-medium text-white hover:bg-emerald-700"
                            >
                              <Printer className="h-3 w-3" />
                              رسید
                            </Link>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={lease.installments.length}
                start={installmentsPagination.start}
                end={installmentsPagination.end}
                safePage={installmentsPagination.safePage}
                totalPages={installmentsPagination.totalPages}
                onPageChange={installmentsPagination.setPage}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
