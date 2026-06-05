'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AdminShopTabs } from '@/components/admin/admin-shop-tabs';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { useDebounce } from '@/hooks/use-debounce';
import { fmtDate, fmtMoney } from '@/lib/format';
import { LeaseStatus } from '@inventory-urdu/shared';
import { LEASE_STATUS_LABELS } from '@/lib/labels';

type LeaseRow = {
  id: string;
  accountNumber: number;
  accountDate: string;
  totalAmount: string | number;
  remainingBalance: string | number;
  installmentCount: number;
  status: LeaseStatus;
  customer: { id: string; name: string; mobile?: string | null };
  recoveryMan?: { name: string } | null;
};

type ShopMini = { id: string; name: string };

export default function AdminShopAccountsPage() {
  const params = useParams();
  const shopId = typeof params.id === 'string' ? params.id : '';
  const [shop, setShop] = useState<ShopMini | null>(null);
  const [rows, setRows] = useState<LeaseRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoading(true);
    setError('');
    try {
      const [shopRes, listRes] = await Promise.all([
        api.get(`/shops/${shopId}`),
        api.get(`/shops/${shopId}/leases`, {
          params: {
            page,
            limit: 12,
            q: debouncedSearch.trim() || undefined,
            status: status || undefined,
          },
        }),
      ]);
      const shopData = shopRes.data.data as { id: string; name: string };
      setShop({ id: shopData.id, name: shopData.name });
      setRows(listRes.data.data as LeaseRow[]);
      setTotalItems(listRes.data.meta?.total ?? listRes.data.data.length);
    } catch {
      setError('کھاتے لوڈ نہیں ہو سکے');
    } finally {
      setLoading(false);
    }
  }, [shopId, page, debouncedSearch, status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  const columns: DataTableColumn<LeaseRow>[] = [
    {
      id: 'account',
      header: 'کھاتہ',
      cell: (r) => <span className="font-bold">#{r.accountNumber}</span>,
    },
    {
      id: 'customer',
      header: 'گاہک',
      cell: (r) => (
        <div>
          <span className="font-urdu">{r.customer.name}</span>
          {r.customer.mobile ? (
            <p className="text-xs text-slate-500" dir="ltr">
              {r.customer.mobile}
            </p>
          ) : null}
        </div>
      ),
    },
    { id: 'date', header: 'تاریخ', cell: (r) => fmtDate(r.accountDate) },
    {
      id: 'total',
      header: 'کل',
      cell: (r) => <span dir="ltr">{fmtMoney(r.totalAmount)}</span>,
    },
    {
      id: 'remaining',
      header: 'باقی',
      cell: (r) => (
        <span dir="ltr" className="font-medium text-emerald-800">
          {fmtMoney(r.remainingBalance)}
        </span>
      ),
    },
    {
      id: 'installments',
      header: 'قسطیں',
      cell: (r) => r.installmentCount,
    },
    {
      id: 'status',
      header: 'حالت',
      cell: (r) => (
        <Badge variant={r.status === LeaseStatus.ACTIVE ? 'success' : r.status === LeaseStatus.DEFAULTED ? 'warning' : 'muted'}>
          {LEASE_STATUS_LABELS[r.status]}
        </Badge>
      ),
    },
    {
      id: 'recovery',
      header: 'ریکوری',
      cell: (r) => r.recoveryMan?.name ?? '—',
    },
  ];

  return (
    <div className="space-y-4">
      <Link
        href={`${ADMIN_ROUTE_PREFIX}/shops`}
        className="inline-flex items-center gap-1 text-sm text-violet-700 hover:underline"
      >
        <ArrowRight className="h-4 w-4" />
        تمام دکانیں
      </Link>

      {shop ? <AdminShopTabs shopId={shopId} shopName={shop.name} /> : null}

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">قسطی کھاتے (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="کھاتہ نمبر، گاہک…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="sm:w-40"
            >
              <option value="">تمام حالت</option>
              <option value={LeaseStatus.ACTIVE}>{LEASE_STATUS_LABELS[LeaseStatus.ACTIVE]}</option>
              <option value={LeaseStatus.CLOSED}>{LEASE_STATUS_LABELS[LeaseStatus.CLOSED]}</option>
              <option value={LeaseStatus.DEFAULTED}>{LEASE_STATUS_LABELS[LeaseStatus.DEFAULTED]}</option>
            </Select>
          </div>
          <DataTable
            data={rows}
            columns={columns}
            rowKey={(r) => r.id}
            loading={loading}
            pageSize={12}
            paginationMode="server"
            totalItems={totalItems}
            page={page}
            onPageChange={setPage}
            emptyTitle="کوئی کھاتہ نہیں"
          />
        </CardContent>
      </Card>
    </div>
  );
}
