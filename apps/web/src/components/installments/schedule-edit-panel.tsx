'use client';

import { Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Select } from '@/components/ui/select';
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
  isShort: boolean;
};

type LeaseDetail = {
  id: string;
  accountNumber: number;
  originalInstallmentAmount: string | number;
  installments: InstallmentRow[];
};

const STATUS_LABELS: Record<InstallmentStatus, string> = {
  [InstallmentStatus.PENDING]: 'زیر التوا',
  [InstallmentStatus.PARTIAL]: 'جزوی',
  [InstallmentStatus.PAID]: 'ادا',
  [InstallmentStatus.OVERDUE]: 'تاخیر',
};

function parseAmount(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) : v;
}

function fmtMoney(v: string | number): string {
  const n = parseAmount(v);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

type RowDraft = { dueDate: string; scheduledAmount: string };

export function ScheduleEditPanel() {
  const [leases, setLeases] = useState<LeaseListRow[]>([]);
  const [leaseId, setLeaseId] = useState('');
  const [lease, setLease] = useState<LeaseDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});

  const schedulePagination = useTablePagination(lease?.installments.length ?? 0, 10, [leaseId]);

  const loadLeases = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const { data } = await api.get('/leases');
      setLeases(data.data as LeaseListRow[]);
    } catch {
      setError('کھاتوں کی فہرست لوڈ نہیں ہو سکی');
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadLease = useCallback(async (id: string) => {
    if (!id) {
      setLease(null);
      setDrafts({});
      return;
    }
    setLoadingDetail(true);
    setError('');
    try {
      const { data } = await api.get(`/leases/${id}`);
      const detail = data.data as LeaseDetail;
      setLease(detail);
      const next: Record<string, RowDraft> = {};
      for (const inst of detail.installments) {
        next[inst.id] = {
          dueDate: toDateInputValue(inst.dueDate),
          scheduledAmount: String(parseAmount(inst.scheduledAmount)),
        };
      }
      setDrafts(next);
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
      setLease(null);
      setDrafts({});
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadLeases();
  }, [loadLeases]);

  useEffect(() => {
    loadLease(leaseId);
  }, [leaseId, loadLease]);

  const leaseOptions = useMemo(
    () => leases.map((l) => ({ value: l.id, label: `#${l.accountNumber} — ${l.customer.name}` })),
    [leases],
  );

  const updateDraft = (scheduleId: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], ...patch } }));
  };

  const saveRow = async (scheduleId: string) => {
    if (!leaseId || !lease) return;
    const draft = drafts[scheduleId];
    if (!draft) return;
    const scheduled = parseFloat(draft.scheduledAmount);
    if (!draft.dueDate || Number.isNaN(scheduled) || scheduled < 0) {
      setRowMessage((m) => ({ ...m, [scheduleId]: 'درست تاریخ اور رقم درج کریں' }));
      return;
    }
    setSavingId(scheduleId);
    setRowMessage((m) => ({ ...m, [scheduleId]: '' }));
    try {
      await api.patch(`/leases/${leaseId}/schedules/${scheduleId}`, {
        dueDate: draft.dueDate,
        scheduledAmount: scheduled,
      });
      setRowMessage((m) => ({ ...m, [scheduleId]: 'محفوظ ہو گیا' }));
      await loadLease(leaseId);
      notify.updated('قسط');
    } catch (err) {
      setRowMessage((m) => ({ ...m, [scheduleId]: 'محفوظ نہیں ہو سکا' }));
      notify.fail('قسط اپڈیٹ', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <AlertBanner onRetry={() => (leaseId ? loadLease(leaseId) : loadLeases())}>{error}</AlertBanner>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">کھاتہ منتخب کریں</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={leaseId} onChange={(e) => setLeaseId(e.target.value)} disabled={loadingList}>
            <option value="">— کھاتہ —</option>
            {leaseOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {lease ? (
        <Card className="border-emerald-100 bg-emerald-50/40">
          <CardContent className="flex flex-wrap items-center gap-2 p-4 text-sm">
            <span className="text-slate-600">اصل قسط (کھاتہ):</span>
            <span className="text-lg font-semibold text-emerald-800">{fmtMoney(lease.originalInstallmentAmount)}</span>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">قسطوں کا شیڈول</CardTitle>
          {lease ? <Badge variant="default">{lease.installments.length} قطاریں</Badge> : null}
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {!leaseId ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">پہلے اوپر سے کھاتہ منتخب کریں۔</p>
          ) : loadingDetail ? (
            <p className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
          ) : lease ? (
            <>
              <Table>
                <colgroup>
                  <col style={{ width: '3rem' }} />
                  <col />
                  <col style={{ width: '11rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '8rem' }} />
                  <col style={{ width: '7rem' }} />
                </colgroup>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>تاریخ واجب الادا</TableHead>
                    <TableHead>اصل قسط</TableHead>
                    <TableHead>ادا شدہ</TableHead>
                    <TableHead>حالت</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedulePagination.pageSlice(lease.installments).map((inst) => {
                  const draft = drafts[inst.id];
                  return (
                    <TableRow key={inst.id} className={inst.isShort ? 'bg-amber-50/50' : undefined}>
                      <TableCell>{inst.installmentNumber}</TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-9 min-w-[10rem]"
                          value={draft?.dueDate ?? ''}
                          onChange={(e) => updateDraft(inst.id, { dueDate: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          className="h-9 w-28"
                          value={draft?.scheduledAmount ?? ''}
                          onChange={(e) => updateDraft(inst.id, { scheduledAmount: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>{fmtMoney(inst.paidAmount)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="muted">{STATUS_LABELS[inst.status]}</Badge>
                          {inst.isShort ? <Badge variant="warning">شارٹ</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={savingId === inst.id}
                          onClick={() => saveRow(inst.id)}
                        >
                          <Save className="ml-1 h-3.5 w-3.5" />
                          محفوظ
                        </Button>
                        {rowMessage[inst.id] ? (
                          <span className="mt-1 block text-xs text-slate-500">{rowMessage[inst.id]}</span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
              <TablePagination
                totalItems={lease.installments.length}
                start={schedulePagination.start}
                end={schedulePagination.end}
                safePage={schedulePagination.safePage}
                totalPages={schedulePagination.totalPages}
                onPageChange={schedulePagination.setPage}
              />
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
