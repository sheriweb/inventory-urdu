'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Eye, KeyRound, Search, Users } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { useDebounce } from '@/hooks/use-debounce';

type OwnerRow = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  ownedShop: {
    id: string;
    name: string;
    isActive: boolean;
    city?: string | null;
    createdAt: string;
    _count: { customers: number; leaseAccounts: number };
  } | null;
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminUsersPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [resetShopId, setResetShopId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/shops/owners');
      setOwners(data.data as OwnerRow[]);
    } catch {
      setError('مالکان لوڈ نہیں ہو سکے');
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        (o.ownedShop?.name.toLowerCase().includes(q) ?? false),
    );
  }, [owners, debouncedSearch]);

  async function toggleOwner(shopId: string, isActive: boolean) {
    try {
      await api.patch(`/shops/${shopId}/owner/active`, { isActive: !isActive });
      notify.saved(isActive ? 'مالک اکاؤنٹ بند' : 'مالک اکاؤنٹ فعال');
      await load();
    } catch {
      notify.fail('مالک', new Error('failed'));
    }
  }

  async function submitResetPassword() {
    if (!resetShopId || newPassword.length < 6) return;
    setResetting(true);
    try {
      await api.post(`/shops/${resetShopId}/owner/reset-password`, { newPassword });
      notify.saved('نیا پاس ورڈ سیٹ — مالک کو بتائیں');
      setResetShopId(null);
      setNewPassword('');
    } catch {
      notify.fail('پاس ورڈ', new Error('failed'));
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">دکان مالکان</h1>
            <p className="mt-1 text-sm text-slate-600">
              تمام shop owners — login بند/کھولیں، پاس ورڈ reset، دکان تفصیل
            </p>
          </div>
        </div>
      </div>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="نام، email، دکان…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">مالک ({loading ? '…' : filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">کوئی مالک نہیں</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent even:bg-transparent">
                    <TableHead>مالک</TableHead>
                    <TableHead>دکان</TableHead>
                    <TableHead>آخری login</TableHead>
                    <TableHead>حالت</TableHead>
                    <TableHead className="text-left">عمل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((owner) => {
                    const shop = owner.ownedShop;
                    if (!shop) return null;
                    return (
                      <TableRow key={owner.id}>
                        <TableCell>
                          <div className="font-urdu font-medium">{owner.name}</div>
                          <div className="text-xs text-slate-500" dir="ltr">
                            {owner.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}
                            className="font-urdu text-violet-800 hover:underline"
                          >
                            {shop.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {shop._count.customers} گاہک · {shop._count.leaseAccounts} کھاتے
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">{fmtDate(owner.lastLoginAt)}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={owner.isActive ? 'success' : 'muted'}>
                              مالک {owner.isActive ? 'فعال' : 'بند'}
                            </Badge>
                            <Badge variant={shop.isActive ? 'success' : 'muted'}>
                              دکان {shop.isActive ? 'فعال' : 'بند'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex flex-wrap justify-end gap-1.5">
                            <Link href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}>
                              <Button variant="outline" size="sm" className="gap-1">
                                <Eye className="h-3.5 w-3.5" />
                                تفصیل
                              </Button>
                            </Link>
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setResetShopId(shop.id);
                                setNewPassword('');
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                              پاس ورڈ
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleOwner(shop.id, owner.isActive)}
                            >
                              {owner.isActive ? 'بند' : 'فعال'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {resetShopId ? (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-base">مالک پاس ورڈ reset</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                type="password"
                placeholder="نیا پاس ورڈ (کم از کم 6)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                dir="ltr"
                className="text-left"
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                  disabled={resetting || newPassword.length < 6}
                  onClick={submitResetPassword}
                >
                  {resetting ? 'محفوظ…' : 'محفوظ کریں'}
                </Button>
                <Button variant="outline" onClick={() => setResetShopId(null)}>
                  منسوخ
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
