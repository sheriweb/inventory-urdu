'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { AdminShopTabs } from '@/components/admin/admin-shop-tabs';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { useDebounce } from '@/hooks/use-debounce';
import { fmtDate } from '@/lib/format';

type CustomerRow = {
  id: string;
  name: string;
  mobile?: string | null;
  cnic?: string | null;
  city?: string | null;
  isActive: boolean;
  createdAt: string;
  area?: { name: string } | null;
  _count: { leaseAccounts: number; guarantors: number };
};

type ShopMini = { id: string; name: string };

export default function AdminShopCustomersPage() {
  const params = useParams();
  const shopId = typeof params.id === 'string' ? params.id : '';
  const [shop, setShop] = useState<ShopMini | null>(null);
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState('');
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
        api.get(`/shops/${shopId}/customers`, {
          params: { page, limit: 12, q: debouncedSearch.trim() || undefined },
        }),
      ]);
      const shopData = shopRes.data.data as { id: string; name: string };
      setShop({ id: shopData.id, name: shopData.name });
      setRows(listRes.data.data as CustomerRow[]);
      setTotalItems(listRes.data.meta?.total ?? listRes.data.data.length);
    } catch {
      setError('گاہک لوڈ نہیں ہو سکے');
    } finally {
      setLoading(false);
    }
  }, [shopId, page, debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const columns: DataTableColumn<CustomerRow>[] = [
    {
      id: 'name',
      header: 'نام',
      cell: (r) => <span className="font-semibold font-urdu">{r.name}</span>,
    },
    {
      id: 'mobile',
      header: 'موبائل',
      cell: (r) => <span dir="ltr">{r.mobile ?? '—'}</span>,
    },
    { id: 'cnic', header: 'CNIC', cell: (r) => <span dir="ltr">{r.cnic ?? '—'}</span> },
    { id: 'area', header: 'علاقہ', cell: (r) => r.area?.name ?? '—' },
    {
      id: 'leases',
      header: 'کھاتے',
      cell: (r) => r._count.leaseAccounts,
    },
    {
      id: 'status',
      header: 'حالت',
      cell: (r) => (
        <Badge variant={r.isActive ? 'success' : 'muted'}>
          {r.isActive ? 'فعال' : 'بند'}
        </Badge>
      ),
    },
    {
      id: 'date',
      header: 'شمولیت',
      cell: (r) => fmtDate(r.createdAt),
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
          <CardTitle className="text-base">گاہک (read-only)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="نام، موبائل، CNIC…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            emptyTitle="کوئی گاہک نہیں"
          />
        </CardContent>
      </Card>
    </div>
  );
}
