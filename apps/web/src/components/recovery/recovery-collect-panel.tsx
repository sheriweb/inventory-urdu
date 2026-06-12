'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Printer } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import {
  enqueueOfflineSyncJob,
  shouldQueueOffline,
} from '@/lib/offline-sync-queue';
import {
  isBrowserOnline,
} from '@/lib/offline-draft-queue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { AlertBanner } from '@/components/ui/alert-banner';
import { PhoneActions } from '@/components/ui/phone-actions';
import { useDebounce } from '@/hooks/use-debounce';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useTablePagination } from '@/hooks/use-table-pagination';
import { InstallmentStatus } from '@inventory-urdu/shared';

type LeaseListRow = {
  id: string;
  accountNumber: number;
  customer: { name: string };
};

type InstallmentRow = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: string | number;
  paidAmount: string | number;
  status: InstallmentStatus;
};

type LeaseDetail = {
  id: string;
  accountNumber: number;
  installmentCount: number;
  customer: { name: string; mobile?: string | null };
  installments: InstallmentRow[];
};

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

const PENDING_STATUSES = new Set<InstallmentStatus>([
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
]);

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

function owedAmount(row: InstallmentRow): number {
  return Math.max(0, parseAmount(row.scheduledAmount) - parseAmount(row.paidAmount));
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function isDueForCollection(row: InstallmentRow): boolean {
  const due = new Date(row.dueDate);
  return !Number.isNaN(due.getTime()) && due <= endOfToday();
}

type RecoveryCollectPanelProps = {
  initialLeaseId?: string;
  initialScheduleId?: string;
  onSuccess?: () => void;
};

export function RecoveryCollectPanel({
  initialLeaseId = '',
  initialScheduleId = '',
  onSuccess,
}: RecoveryCollectPanelProps) {
  const [leaseId, setLeaseId] = useState(initialLeaseId);
  const [accountSearch, setAccountSearch] = useState('');
  const [nameSearch, setNameSearch] = useState('');
  const [searchResults, setSearchResults] = useState<LeaseListRow[]>([]);
  const [searching, setSearching] = useState(false);
  const debouncedNameSearch = useDebounce(nameSearch, 300);
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [scheduleId, setScheduleId] = useState(initialScheduleId);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loadingLease, setLoadingLease] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState<number | null>(null);
  const [lastPaymentId, setLastPaymentId] = useState<string | null>(null);

  const loadLease = useCallback(async (id: string) => {
    if (!id) {
      setLease(null);
      return;
    }
    setLoadingLease(true);
    setError('');
    setReceiptNumber(null);
    setLastPaymentId(null);
    try {
      const { data } = await api.get(`/leases/${id}`);
      const raw = data.data as LeaseDetail;
      setLease({ ...raw, installments: Array.isArray(raw.installments) ? raw.installments : [] });
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
      setLease(null);
    } finally {
      setLoadingLease(false);
    }
  }, []);

  useEffect(() => {
    if (initialLeaseId) {
      setLeaseId(initialLeaseId);
      loadLease(initialLeaseId);
    }
  }, [initialLeaseId, loadLease]);

  useEffect(() => {
    const q = debouncedNameSearch.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    let active = true;
    setSearching(true);
    (async () => {
      try {
        const { data } = await api.get('/leases', { params: { search: q, status: 'ACTIVE' } });
        if (!active) return;
        const rows = (Array.isArray(data.data) ? data.data : []).slice(0, 12) as LeaseListRow[];
        setSearchResults(rows);
      } catch {
        if (active) setSearchResults([]);
      } finally {
        if (active) setSearching(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [debouncedNameSearch]);

  useEffect(() => {
    if (initialScheduleId) setScheduleId(initialScheduleId);
  }, [initialScheduleId]);

  const dueInstallments = useMemo(() => {
    if (!lease) return [];
    const installments = lease.installments ?? [];
    const maxCount = lease.installmentCount || installments.length;
    return installments
      .filter(
        (i) =>
          i.installmentNumber <= maxCount &&
          PENDING_STATUSES.has(i.status) &&
          owedAmount(i) > 0 &&
          isDueForCollection(i),
      )
      .sort((a, b) => a.installmentNumber - b.installmentNumber);
  }, [lease]);

  const nextFutureInstallment = useMemo(() => {
    if (!lease) return null;
    const installments = lease.installments ?? [];
    const maxCount = lease.installmentCount || installments.length;
    return (
      installments
        .filter(
          (i) =>
            i.installmentNumber <= maxCount &&
            PENDING_STATUSES.has(i.status) &&
            owedAmount(i) > 0 &&
            !isDueForCollection(i),
        )
        .sort((a, b) => a.installmentNumber - b.installmentNumber)[0] ?? null
    );
  }, [lease]);

  const paidInstallmentCount = useMemo(() => {
    if (!lease) return 0;
    return (lease.installments ?? []).filter(
      (i) => i.status === InstallmentStatus.PAID || owedAmount(i) <= 0,
    ).length;
  }, [lease]);

  const duePagination = useTablePagination(dueInstallments.length, 10, [leaseId]);

  useEffect(() => {
    if (!scheduleId && dueInstallments.length === 1) {
      setScheduleId(dueInstallments[0].id);
    }
  }, [dueInstallments, scheduleId]);

  const selectedInstallment = dueInstallments.find((i) => i.id === scheduleId);

  useEffect(() => {
    if (selectedInstallment) {
      setAmount(String(owedAmount(selectedInstallment)));
    }
  }, [selectedInstallment?.id]);

  useEffect(() => {
    if (scheduleId && !dueInstallments.some((i) => i.id === scheduleId)) {
      setScheduleId('');
      setAmount('');
    }
  }, [dueInstallments, scheduleId]);

  function onSelectLease(id: string) {
    setLeaseId(id);
    setScheduleId('');
    setAmount('');
    setNote('');
    setReceiptNumber(null);
    setLastPaymentId(null);
    loadLease(id);
  }

  function resolveByAccountNumber() {
    const raw = accountSearch.trim();
    if (!raw) {
      setError('کھاتہ نمبر یا نام درج کریں');
      return;
    }
    setError('');
    setSearching(true);
    (async () => {
      try {
        const { data } = await api.get('/leases', { params: { search: raw, status: 'ACTIVE' } });
        const rows = data.data as LeaseListRow[];
        if (rows.length === 0) {
          setError('کھاتہ نہیں ملا');
          return;
        }
        if (rows.length === 1) {
          onSelectLease(rows[0].id);
          return;
        }
        setSearchResults(rows.slice(0, 12));
        setNameSearch('');
      } catch {
        setError('تلاش نہیں ہو سکی');
      } finally {
        setSearching(false);
      }
    })();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!lease) return;
    const parsed = parseFloat(amount);
    if (!scheduleId || Number.isNaN(parsed) || parsed <= 0) {
      setError('قسط اور درست رقم منتخب کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    setReceiptNumber(null);
    setLastPaymentId(null);

    const payload = {
      leaseAccountId: lease.id,
      scheduleId,
      amount: parsed,
      note: note.trim() || undefined,
    };

    if (!isBrowserOnline()) {
      enqueueOfflineSyncJob('recovery-collect', 'قسط وصولی', {
        ...payload,
        accountNumber: lease.accountNumber,
      });
      setAmount('');
      setNote('');
      notify.saved('آف لائن قطار میں — انٹرنیٹ پر خود محفوظ');
      onSuccess?.();
      setSubmitting(false);
      return;
    }

    try {
      const { data } = await api.post('/recovery/collect', payload);
      const payment = data.data?.payment as { id?: string; receiptNumber?: number } | undefined;
      if (payment?.receiptNumber != null) {
        setReceiptNumber(payment.receiptNumber);
      }
      if (payment?.id) {
        setLastPaymentId(payment.id);
      }
      setAmount('');
      setNote('');
      await loadLease(lease.id);
      onSuccess?.();
      notify.saved(`وصولی محفوظ — رسید #${payment?.receiptNumber ?? ''} (روزنامچہ میں)`);
    } catch (err) {
      if (shouldQueueOffline(err)) {
        enqueueOfflineSyncJob('recovery-collect', 'قسط وصولی', {
          ...payload,
          accountNumber: lease.accountNumber,
        });
        setAmount('');
        setNote('');
        notify.saved('نیٹ خراب — وصولی قطار میں محفوظ');
        onSuccess?.();
        setSubmitting(false);
        return;
      }
      setError('وصولی محفوظ نہیں ہو سکی');
      notify.fail('وصولی', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {receiptNumber != null ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p>
            وصولی کامیاب — رسید نمبر:{' '}
            <span className="font-semibold" dir="ltr">
              #{receiptNumber}
            </span>
          </p>
          {lastPaymentId ? (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`/dashboard/print/receipt/${lastPaymentId}?auto=1`}
                target="_blank"
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-700"
              >
                <Printer className="h-3.5 w-3.5" />
                رسید پرنٹ
              </Link>
              <Link
                href={`/dashboard/print/receipt/${lastPaymentId}`}
                target="_blank"
                className="inline-flex h-8 items-center rounded-md border border-emerald-300 bg-white px-3 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
              >
                رسید دیکھیں
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <AlertBanner onRetry={() => (leaseId ? loadLease(leaseId) : resolveByAccountNumber())}>{error}</AlertBanner> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">کھاتہ تلاش</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">کھاتہ نمبر</label>
            <div className="flex gap-2">
              <InputWithVoice
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                placeholder="مثلاً 1001"
                voiceMode="number"
                voiceTitle="کھاتہ نمبر بولیں"
                dir="ltr"
                className="text-left"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    resolveByAccountNumber();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={resolveByAccountNumber} disabled={searching}>
                تلاش
              </Button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">نام یا موبائل</label>
            <Input
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="گاہک کا نام یا موبائل…"
            />
            {searching && nameSearch.trim().length >= 2 ? (
              <p className="mt-1 text-xs text-slate-500">تلاش…</p>
            ) : null}
            {searchResults.length > 0 ? (
              <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white">
                {searchResults.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm hover:bg-emerald-50"
                      onClick={() => {
                        onSelectLease(row.id);
                        setSearchResults([]);
                        setNameSearch('');
                        setAccountSearch(String(row.accountNumber));
                      }}
                    >
                      <span className="font-urdu">{row.customer.name}</span>
                      <span className="shrink-0 font-medium text-slate-600" dir="ltr">
                        #{row.accountNumber}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {loadingLease ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-slate-500">کھاتہ لوڈ ہو رہا ہے…</CardContent>
        </Card>
      ) : lease ? (
        <>
          <Card>
            <CardContent className="flex flex-wrap gap-x-6 gap-y-2 p-4 text-sm">
              <div>
                <span className="text-slate-500">گاہک: </span>
                <span className="font-medium">{lease.customer.name}</span>
              </div>
              {lease.customer.mobile ? (
                <div className="w-full sm:w-auto">
                  <PhoneActions mobile={lease.customer.mobile} compact />
                </div>
              ) : null}
              <div>
                <span className="text-slate-500">کھاتہ: </span>
                <span className="font-medium" dir="ltr">
                  #{lease.accountNumber}
                </span>
              </div>
              <div>
                <span className="text-slate-500">کل قسطیں: </span>
                <span className="font-medium">{lease.installmentCount}</span>
              </div>
              <div>
                <span className="text-slate-500">ادا شدہ: </span>
                <span className="font-medium text-emerald-700">{paidInstallmentCount}</span>
              </div>
              <div>
                <span className="text-slate-500">آج واجب: </span>
                <span className="font-medium text-amber-800">{dueInstallments.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">واجب الادا قسطیں</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {dueInstallments.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <p>آج یا اس سے پہلے کوئی واجب قسط نہیں</p>
                  {nextFutureInstallment ? (
                    <p className="mt-2 text-xs text-slate-400">
                      اگلی قسط #{nextFutureInstallment.installmentNumber} — {fmtDate(nextFutureInstallment.dueDate)}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs text-slate-400">ایڈوانس وصولی کے لیے الگ «ایڈوانس» بٹن استعمال کریں</p>
                </div>
              ) : (
                <div className="p-0">
                  <div className="space-y-2 p-3 sm:hidden">
                    {duePagination.pageSlice(dueInstallments).map((row) => {
                      const selected = scheduleId === row.id;
                      return (
                        <button
                          key={row.id}
                          type="button"
                          className={`w-full rounded-lg border px-3 py-3 text-start text-sm transition-colors ${
                            selected
                              ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200'
                              : 'border-slate-200 bg-white hover:bg-slate-50'
                          }`}
                          onClick={() => {
                            setScheduleId(row.id);
                            setAmount(String(owedAmount(row)));
                          }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">قسط #{row.installmentNumber}</span>
                            <Badge variant="muted">{STATUS_LABELS[row.status]}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                            <span>{fmtDate(row.dueDate)}</span>
                            <span>
                              بقایا: <span className="font-semibold text-emerald-800">{fmtMoney(owedAmount(row))}</span>
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="hidden sm:block">
                    <Table>
                      <colgroup>
                        <col style={{ width: '3rem' }} />
                        <col style={{ width: '3rem' }} />
                        <col />
                        <col style={{ width: '7rem' }} />
                        <col style={{ width: '7rem' }} />
                        <col style={{ width: '8rem' }} />
                      </colgroup>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12" />
                          <TableHead>#</TableHead>
                          <TableHead>تاریخ</TableHead>
                          <TableHead>اصل</TableHead>
                          <TableHead>بقایا</TableHead>
                          <TableHead>حالت</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {duePagination.pageSlice(dueInstallments).map((row) => (
                          <TableRow
                            key={row.id}
                            className={scheduleId === row.id ? 'bg-emerald-50/60' : undefined}
                            onClick={() => {
                              setScheduleId(row.id);
                              setAmount(String(owedAmount(row)));
                            }}
                          >
                            <TableCell>
                              <input
                                type="radio"
                                name="schedule"
                                checked={scheduleId === row.id}
                                onChange={() => {
                                  setScheduleId(row.id);
                                  setAmount(String(owedAmount(row)));
                                }}
                                className="h-4 w-4 accent-emerald-600"
                              />
                            </TableCell>
                            <TableCell>{row.installmentNumber}</TableCell>
                            <TableCell>{fmtDate(row.dueDate)}</TableCell>
                            <TableCell>{fmtMoney(row.scheduledAmount)}</TableCell>
                            <TableCell className="font-medium">{fmtMoney(owedAmount(row))}</TableCell>
                            <TableCell>
                              <Badge variant="muted">{STATUS_LABELS[row.status]}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <TablePagination
                    totalItems={dueInstallments.length}
                    start={duePagination.start}
                    end={duePagination.end}
                    safePage={duePagination.safePage}
                    totalPages={duePagination.totalPages}
                    onPageChange={duePagination.setPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">ادائیگی</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="grid max-w-xl gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">رقم</label>
                  <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                    inputMode="decimal"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">نوٹ (اختیاری)</label>
                  <Input value={note} onChange={(e) => setNote(e.target.value)} />
                </div>
                <Button type="submit" disabled={submitting || !scheduleId || dueInstallments.length === 0}>
                  {submitting ? 'محفوظ…' : 'وصولی محفوظ کریں'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
