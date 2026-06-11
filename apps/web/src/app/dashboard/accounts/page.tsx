'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FilePlus } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LeaseStatus, StaffType, type Staff } from '@inventory-urdu/shared';
import { LEASE_STATUS_LABELS } from '@/lib/labels';
import { fmtDate, fmtMoney } from '@/lib/format';
import { useDebounce } from '@/hooks/use-debounce';
import { LatePaymentScoreBadge } from '@/components/accounts/late-payment-score-badge';

type AccountRow = {
  id: string;
  accountNumber: number;
  accountDate: string;
  totalAmount: string | number;
  remainingBalance: string | number;
  installmentCount: number;
  status: LeaseStatus;
  overdueCount?: number;
  latePaymentScore?: number;
  customer: { id: string; name: string; mobile?: string | null };
  salesman?: { id: string; name: string } | null;
  recoveryMan?: { id: string; name: string } | null;
};

const STATUS_LABELS = LEASE_STATUS_LABELS;

const PAGE_SIZE = 12;

export default function AccountsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [recoveryMen, setRecoveryMen] = useState<Staff[]>([]);
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/staff');
        const all = data.data as Staff[];
        setRecoveryMen(all.filter((s) => s.type === StaffType.RECOVERY_MAN));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(PAGE_SIZE),
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (status) params.status = status;
      if (recoveryManId) params.recoveryManId = recoveryManId;
      if (from) params.from = from;
      if (to) params.to = to;
      const { data } = await api.get('/leases', { params });
      const rows = Array.isArray(data?.data) ? (data.data as AccountRow[]) : [];
      setRows(rows);
      setTotalItems(data?.meta?.total ?? rows.length);
    } catch {
      setError('کھاتے لوڈ نہیں ہو سکے');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, status, recoveryManId, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, recoveryManId, from, to]);

  const columns: DataTableColumn<AccountRow>[] = [
    {
      id: 'account',
      header: 'کھاتہ نمبر',
      width: '5.5rem',
      cell: (r) => (
        <span dir="ltr" className="font-bold text-emerald-800">
          #{r.accountNumber}
        </span>
      ),
    },
    { id: 'date', header: 'تاریخ', cell: (r) => fmtDate(r.accountDate) },
    { id: 'customer', header: 'گاہک', cell: (r) => <span className="font-urdu" title={r.customer.name}>{r.customer.name}</span> },
    { id: 'total', header: 'کل رقم', cell: (r) => <span dir="ltr">{fmtMoney(r.totalAmount)}</span> },
    {
      id: 'remaining',
      header: 'بقایا',
      cell: (r) => <span dir="ltr" className="font-medium text-emerald-800">{fmtMoney(r.remainingBalance)}</span>,
    },
    { id: 'installments', header: 'قسطیں', cell: (r) => r.installmentCount },
    {
      id: 'paymentScore',
      header: 'ادائیگی سکور',
      cell: (r) => (
        <LatePaymentScoreBadge
          score={r.latePaymentScore ?? 100}
          overdueCount={r.overdueCount ?? 0}
          status={r.status}
        />
      ),
    },
    { id: 'salesman', header: 'سیلز مین', cell: (r) => <span className="font-urdu">{r.salesman?.name ?? '—'}</span> },
    { id: 'recovery', header: 'ریکوری مین', cell: (r) => <span className="font-urdu">{r.recoveryMan?.name ?? '—'}</span> },
    {
      id: 'status',
      header: 'حالت',
      cell: (r) => (
        <Badge variant={r.status === LeaseStatus.ACTIVE ? 'success' : 'muted'}>{STATUS_LABELS[r.status]}</Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Link href="/dashboard/leases/new">
          <Button size="sm" className="gap-1.5">
            <FilePlus className="h-4 w-4" />
            نئی فروخت (قسط / نقد)
          </Button>
        </Link>
      </PageToolbar>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[180px] flex-1 sm:max-w-[240px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">تلاش</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="کھاتہ نمبر (#1016) یا نام" />
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">حالت</label>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">— تمام —</option>
              <option value={LeaseStatus.ACTIVE}>{STATUS_LABELS[LeaseStatus.ACTIVE]}</option>
              <option value={LeaseStatus.CLOSED}>{STATUS_LABELS[LeaseStatus.CLOSED]}</option>
              <option value={LeaseStatus.DEFAULTED}>{STATUS_LABELS[LeaseStatus.DEFAULTED]}</option>
            </Select>
          </div>
          <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">ریکوری مین</label>
            <Select value={recoveryManId} onChange={(e) => setRecoveryManId(e.target.value)}>
              <option value="">— تمام —</option>
              {recoveryMen.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-[160px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">از</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-[160px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">تا</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" className="text-left" />
          </div>
        </CardContent>
        <p className="border-t border-slate-100 px-4 pb-3 text-xs text-slate-500">فلٹر بدلتے ہی نتائج خود اپڈیٹ ہو جاتے ہیں</p>
      </Card>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        pageSize={PAGE_SIZE}
        paginationMode="server"
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        emptyTitle="کوئی کھاتہ نہیں ملا"
        emptyDescription="فلٹر بدل کر دوبارہ تلاش کریں یا نیا کھاتہ بنائیں"
        emptyAction={
          <Link href="/dashboard/leases/new">
            <Button type="button" size="sm" className="gap-1.5">
              <FilePlus className="h-4 w-4" />
              نئی فروخت
            </Button>
          </Link>
        }
        onRowClick={(row) => router.push(`/dashboard/leases/${row.id}`)}
        actions={(row) => (
          <TableRowActions
            viewHref={`/dashboard/leases/${row.id}`}
            editHref={`/dashboard/leases/${row.id}/edit`}
          />
        )}
      />
    </div>
  );
}
