'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Banknote, RefreshCw, Wallet, ListChecks, Receipt, Bell } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Modal } from '@/components/ui/modal';
import { SegmentTabs, TabPanel } from '@/components/ui/segment-tabs';
import { RecoveryCollectPanel } from '@/components/recovery/recovery-collect-panel';
import { RecoveryAdvancePanel } from '@/components/recovery/recovery-advance-panel';
import { InstallmentRemindersPanel } from '@/components/recovery/installment-reminders-panel';
import { PhoneActions } from '@/components/ui/phone-actions';
import { useDebounce } from '@/hooks/use-debounce';
import { PAYMENT_TYPE_LABELS } from '@/lib/labels';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';
import { StaffType, type Staff } from '@inventory-urdu/shared';

type RecoveryListCategory = 'OVERDUE' | 'SHORT' | 'DUE';

type RecoveryListRow = {
  leaseAccountId: string;
  accountNumber: number;
  customer: {
    name: string;
    mobile?: string | null;
    additionalMobiles?: string[];
    address?: string | null;
  };
  guarantorFirstName: string | null;
  guarantorName: string | null;
  guarantorPhone: string | null;
  itemsSummary: string;
  nextDueInstallment: {
    id: string;
    installmentNumber: number;
    dueDate: string;
    status?: string;
  } | null;
  scheduledAmount: number | null;
  paidAmount: number | null;
  installmentDue: number;
  totalRemaining: number;
  isOverdue: boolean;
  isDueOnDate: boolean;
  isShort: boolean;
  listCategory: RecoveryListCategory;
  daysOverdue: number;
  overdueInstallmentCount: number;
  recoveryMan: { id: string; name: string } | null;
};

type RecoveryListSummary = {
  total: number;
  overdue: number;
  dueOnDate: number;
  short: number;
};

type ListFilter = 'all' | 'overdue' | 'due' | 'short';

type PaymentType = 'INSTALLMENT' | 'ADVANCE' | 'DISCOUNT';

type PaymentRow = {
  id: string;
  accountNumber: number;
  customerName: string;
  amount: number;
  paymentType: PaymentType;
  paymentDate: string;
  receiptNumber: number;
  note?: string | null;
};

const TYPE_LABELS = PAYMENT_TYPE_LABELS;

function listCategoryBadge(row: RecoveryListRow) {
  if (row.isOverdue) {
    return (
      <Badge variant="danger">
        تاخیر{row.daysOverdue > 0 ? ` · ${row.daysOverdue} دن` : ''}
        {row.overdueInstallmentCount > 1 ? ` · ${row.overdueInstallmentCount} قسط` : ''}
      </Badge>
    );
  }
  if (row.isShort) {
    return <Badge variant="warning">شارٹ</Badge>;
  }
  if (row.isDueOnDate) {
    return <Badge variant="success">آج واجب</Badge>;
  }
  return <Badge variant="default">واجب</Badge>;
}

const RECOVERY_TABS = [
  { id: 'list', label: 'آج کی لسٹ', icon: ListChecks, description: 'آج وصولی کے لیے مقررہ کھاتے' },
  { id: 'reminders', label: 'یاد دہانیاں', icon: Bell, description: '2 دن پہلے قسط کی یاد دہانی' },
  { id: 'payments', label: 'ادائیگیاں', icon: Receipt, description: 'مدت کے حساب سے وصول شدہ رقم' },
];

function RecoveryHubContent() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState('list');
  const [error, setError] = useState('');

  const [date, setDate] = useState(todayInputValue());
  const [recoveryManId, setRecoveryManId] = useState('');
  const debouncedDate = useDebounce(date, 400);
  const debouncedRecoveryManId = useDebounce(recoveryManId, 400);
  const [recoveryMen, setRecoveryMen] = useState<Staff[]>([]);
  const [listRows, setListRows] = useState<RecoveryListRow[]>([]);
  const [listSummary, setListSummary] = useState<RecoveryListSummary | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [loadingList, setLoadingList] = useState(true);

  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const debouncedFrom = useDebounce(from, 400);
  const debouncedTo = useDebounce(to, 400);
  const [paymentRows, setPaymentRows] = useState<PaymentRow[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [deleteRow, setDeleteRow] = useState<PaymentRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [collectOpen, setCollectOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [collectLeaseId, setCollectLeaseId] = useState('');
  const [collectScheduleId, setCollectScheduleId] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/staff');
        setRecoveryMen((data.data as Staff[]).filter((s) => s.type === StaffType.RECOVERY_MAN));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const loadList = useCallback(async () => {
    setLoadingList(true);
    setError('');
    try {
      const params: Record<string, string> = { date: debouncedDate };
      if (debouncedRecoveryManId) params.recoveryManId = debouncedRecoveryManId;
      const { data } = await api.get('/recovery/list', { params });
      const payload = data.data as { rows?: RecoveryListRow[]; summary?: RecoveryListSummary } | RecoveryListRow[];
      if (Array.isArray(payload)) {
        setListRows(payload);
        setListSummary(null);
      } else {
        setListRows(payload.rows ?? []);
        setListSummary(payload.summary ?? null);
      }
    } catch {
      setError('ریکوری لسٹ لوڈ نہیں ہو سکی');
      setListRows([]);
    } finally {
      setLoadingList(false);
    }
  }, [debouncedDate, debouncedRecoveryManId]);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    setError('');
    setPaymentsLoaded(true);
    try {
      const params: Record<string, string> = { from: debouncedFrom, to: debouncedTo };
      const { data } = await api.get('/recovery/payments', { params });
      setPaymentRows(data.data as PaymentRow[]);
    } catch {
      setError('ادائیگیاں لوڈ نہیں ہو سکیں');
      setPaymentRows([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [debouncedFrom, debouncedTo]);

  useEffect(() => {
    if (tab === 'list') loadList();
  }, [tab, loadList]);

  useEffect(() => {
    if (tab === 'payments') loadPayments();
  }, [tab, loadPayments]);

  useEffect(() => {
    const collect = searchParams.get('collect');
    if (!collect) return;
    setCollectLeaseId(collect);
    setCollectScheduleId(searchParams.get('schedule') ?? '');
    setCollectOpen(true);
  }, [searchParams]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'list' || t === 'payments' || t === 'reminders') {
      setTab(t);
    }
  }, [searchParams]);

  function openCollect(row?: RecoveryListRow) {
    setCollectLeaseId(row?.leaseAccountId ?? '');
    setCollectScheduleId(row?.nextDueInstallment?.id ?? '');
    setCollectOpen(true);
  }

  async function confirmDeletePayment() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/recovery/payments/${deleteRow.id}`);
      setDeleteRow(null);
      await loadPayments();
      notify.deleted('ادائیگی');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const filteredListRows = useMemo(() => {
    if (listFilter === 'all') return listRows;
    if (listFilter === 'overdue') return listRows.filter((r) => r.isOverdue);
    if (listFilter === 'due') return listRows.filter((r) => r.isDueOnDate && !r.isOverdue);
    return listRows.filter((r) => r.isShort && !r.isOverdue);
  }, [listRows, listFilter]);

  const listColumns: DataTableColumn<RecoveryListRow>[] = [
    { id: 'account', header: 'کھاتہ', cell: (row) => <span className="font-medium">{row.accountNumber}</span> },
    {
      id: 'status',
      header: 'حالت',
      cell: (row) => listCategoryBadge(row),
    },
    { id: 'name', header: 'نام', cell: (row) => row.customer.name },
    {
      id: 'mobile',
      header: 'موبائل',
      cell: (row) => (
        <PhoneActions
          mobile={row.customer.mobile}
          additionalMobiles={row.customer.additionalMobiles}
          compact
        />
      ),
    },
    {
      id: 'dueDate',
      header: 'قسط تاریخ',
      cell: (row) =>
        row.nextDueInstallment?.dueDate ? fmtDate(row.nextDueInstallment.dueDate) : '—',
    },
    {
      id: 'address',
      header: 'پتہ',
      cell: (row) => (
        <span className="line-clamp-2 max-w-[10rem] text-xs text-slate-600">
          {row.customer.address ?? '—'}
        </span>
      ),
    },
    {
      id: 'guarantor',
      header: 'ضامن',
      cell: (row) => (
        <span className="text-xs text-slate-700">
          {row.guarantorName ?? '—'}
          {row.guarantorPhone ? (
            <span className="mt-0.5 block text-slate-500" dir="ltr">
              {row.guarantorPhone}
            </span>
          ) : null}
        </span>
      ),
    },
    { id: 'scheduled', header: 'اصل قسط', cell: (row) => fmtMoney(row.scheduledAmount) },
    {
      id: 'due',
      header: 'بقایا',
      cell: (row) => (
        <span className={`font-medium ${row.isOverdue ? 'text-red-700' : 'text-emerald-800'}`}>
          {fmtMoney(row.installmentDue ?? row.totalRemaining)}
        </span>
      ),
    },
    { id: 'recoveryMan', header: 'ریکوری مین', cell: (row) => row.recoveryMan?.name ?? '—' },
    {
      id: 'action',
      header: '',
      headerClassName: 'w-24',
      cell: (row) =>
        row.nextDueInstallment?.id ? (
          <Button type="button" size="sm" variant="outline" onClick={() => openCollect(row)}>
            وصولی
          </Button>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        ),
    },
  ];

  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    {
      id: 'receipt',
      header: 'رسید #',
      cell: (row) => (
        <span className="font-medium" dir="ltr">
          #{row.receiptNumber}
        </span>
      ),
    },
    { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.paymentDate) },
    { id: 'account', header: 'کھاتہ', cell: (row) => <span dir="ltr">{row.accountNumber}</span> },
    { id: 'customer', header: 'گاہک', cell: (row) => row.customerName },
    { id: 'amount', header: 'رقم', cell: (row) => <span dir="ltr" className="font-medium">{fmtMoney(row.amount)}</span> },
    {
      id: 'type',
      header: 'قسم',
      cell: (row) => (
        <Badge variant={row.paymentType === 'ADVANCE' ? 'warning' : 'success'}>
          {TYPE_LABELS[row.paymentType] ?? row.paymentType}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => openCollect()} className="gap-1.5">
            <Wallet className="h-4 w-4" />
            قسط وصولی
          </Button>
          <Button type="button" variant="outline" onClick={() => setAdvanceOpen(true)} className="gap-1.5">
            <Banknote className="h-4 w-4" />
            ایڈوانس
          </Button>
        </div>
      </PageToolbar>

      {error ? <AlertBanner onRetry={tab === 'list' ? loadList : loadPayments}>{error}</AlertBanner> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="bg-gradient-to-b from-white to-slate-50/40 px-2 pt-2 sm:px-4 sm:pt-3">
          <SegmentTabs
            tabs={RECOVERY_TABS}
            active={tab}
            onChange={setTab}
            ariaLabel="وصولی کے tabs"
          />
        </div>

        <div className="space-y-6 bg-gradient-to-b from-slate-50/30 to-white px-4 py-6 sm:px-6">
      {tab === 'list' ? (
        <TabPanel title="آج کی لسٹ" description="تاریخ اور ریکوری مین کے حساب سے" icon={ListChecks} className="space-y-6">
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">تاریخ</label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} dir="ltr" className="text-left" />
              </div>
              <div className="min-w-[200px] flex-1 sm:max-w-[280px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">ریکوری مین</label>
                <Select value={recoveryManId} onChange={(e) => setRecoveryManId(e.target.value)}>
                  <option value="">— تمام —</option>
                  {recoveryMen.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="button" variant="outline" onClick={loadList} disabled={loadingList} className="gap-2" title="دوبارہ لوڈ">
                <RefreshCw className={`h-4 w-4 ${loadingList ? 'animate-spin' : ''}`} />
                {loadingList ? 'لوڈ…' : 'تازہ کریں'}
              </Button>
            </CardContent>
          </Card>

          {listSummary ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                onClick={() => setListFilter('all')}
                className={`rounded-xl border px-4 py-3 text-right transition ${listFilter === 'all' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <p className="text-xs text-slate-500">کل وصولی</p>
                <p className="text-xl font-semibold text-slate-900">{listSummary.total}</p>
              </button>
              <button
                type="button"
                onClick={() => setListFilter('overdue')}
                className={`rounded-xl border px-4 py-3 text-right transition ${listFilter === 'overdue' ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <p className="text-xs text-slate-500">تاخیر (اوور ڈیو)</p>
                <p className="text-xl font-semibold text-red-700">{listSummary.overdue}</p>
              </button>
              <button
                type="button"
                onClick={() => setListFilter('due')}
                className={`rounded-xl border px-4 py-3 text-right transition ${listFilter === 'due' ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <p className="text-xs text-slate-500">منتخب تاریخ واجب</p>
                <p className="text-xl font-semibold text-amber-800">{listSummary.dueOnDate}</p>
              </button>
              <button
                type="button"
                onClick={() => setListFilter('short')}
                className={`rounded-xl border px-4 py-3 text-right transition ${listFilter === 'short' ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <p className="text-xs text-slate-500">شارٹ وصولی</p>
                <p className="text-xl font-semibold text-orange-800">{listSummary.short}</p>
              </button>
            </div>
          ) : null}

          <DataTable
            data={filteredListRows}
            columns={listColumns}
            rowKey={(row) => row.leaseAccountId}
            loading={loadingList}
            pageSize={12}
            emptyTitle={listFilter === 'overdue' ? 'تاخیر میں کوئی کھاتہ نہیں' : 'آج کوئی وصولی نہیں'}
            emptyDescription="تاریخ بدل کر دیکھیں یا فلٹر تبدیل کریں"
            searchKeys={(row) =>
              `${row.accountNumber} ${row.customer.name} ${row.customer.mobile ?? ''} ${(row.customer.additionalMobiles ?? []).join(' ')} ${row.guarantorName ?? ''} ${row.customer.address ?? ''} ${row.recoveryMan?.name ?? ''}`
            }
            onRowClick={(row) => {
              if (row.nextDueInstallment?.id) openCollect(row);
            }}
          />
        </>
        </TabPanel>
      ) : tab === 'reminders' ? (
        <TabPanel title="قسط یاد دہانیاں" description="2 دن بعد واجب قسطوں کو موبائل پر یاد دلائیں" icon={Bell} className="space-y-6">
          <InstallmentRemindersPanel />
        </TabPanel>
      ) : (
        <TabPanel title="ادائیگیاں" description="وصول شدہ قسطیں، ایڈوانس اور رعایت" icon={Receipt} className="space-y-6">
        <>
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">سے</label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="text-left" />
              </div>
              <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
                <label className="mb-1 block text-sm font-medium text-slate-700">تک</label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="text-left" />
              </div>
              <Button type="button" variant="outline" onClick={loadPayments} disabled={loadingPayments} className="gap-2" title="دوبارہ لوڈ">
                <RefreshCw className={`h-4 w-4 ${loadingPayments ? 'animate-spin' : ''}`} />
                {loadingPayments ? 'لوڈ…' : 'تازہ کریں'}
              </Button>
            </CardContent>
          </Card>

          <DataTable
            data={paymentsLoaded ? paymentRows : []}
            columns={paymentColumns}
            rowKey={(row) => row.id}
            loading={loadingPayments}
            pageSize={12}
            emptyTitle={paymentsLoaded ? 'اس مدت میں کوئی ادائیگی نہیں' : 'ادائیگیاں لوڈ ہو رہی ہیں…'}
            emptyDescription={paymentsLoaded ? 'دوسری تاریخ منتخب کریں یا وصولی ریکارڈ کریں' : 'تاریخ بدلنے پر خود بخود لوڈ ہو جائے گی'}
            searchKeys={(row) => `${row.receiptNumber} ${row.accountNumber} ${row.customerName}`}
            actions={(row) => (
              <TableRowActions
                viewHref={`/dashboard/print/receipt/${row.id}?auto=1`}
                viewLabel="رسید"
                onDelete={row.paymentType === 'INSTALLMENT' ? () => setDeleteRow(row) : undefined}
              />
            )}
          />
        </>
        </TabPanel>
      )}
        </div>
      </div>

      <Modal
        open={collectOpen}
        onClose={() => setCollectOpen(false)}
        title="قسط وصولی"
        description="کھاتہ منتخب کریں اور قسط وصول کریں"
        size="xl"
        stack="top"
      >
        <RecoveryCollectPanel
          initialLeaseId={collectLeaseId}
          initialScheduleId={collectScheduleId}
          onSuccess={() => {
            loadList();
            if (paymentsLoaded) loadPayments();
          }}
        />
      </Modal>

      <Modal open={advanceOpen} onClose={() => setAdvanceOpen(false)} title="ایڈوانس وصولی" size="md" stack="top">
        <RecoveryAdvancePanel
          onSuccess={() => {
            if (paymentsLoaded) loadPayments();
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="رسید حذف کریں"
        message={`کیا رسید #${deleteRow?.receiptNumber} حذف کریں؟`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDeletePayment}
      />
    </div>
  );
}

export default function RecoveryHubPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
          وصولی صفحہ لوڈ ہو رہا ہے…
        </div>
      }
    >
      <RecoveryHubContent />
    </Suspense>
  );
}
