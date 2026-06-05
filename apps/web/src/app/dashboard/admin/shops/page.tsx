'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Eye, Plus, Search } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { PlatformStatsCards, type PlatformStats } from '@/components/admin/platform-stats-cards';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { useDebounce } from '@/hooks/use-debounce';

type ShopRow = {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  city?: string | null;
  owner: { email: string; name: string; lastLoginAt?: string | null };
  _count: { customers: number; leaseAccounts: number; staff: number; users: number };
};

const emptyForm = {
  name: '',
  ownerEmail: '',
  ownerPassword: '',
  ownerName: '',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const debouncedSearch = useDebounce(search, 300);

  const loadShops = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [shopsRes, statsRes] = await Promise.all([
        api.get('/shops'),
        api.get('/shops/stats'),
      ]);
      setShops(shopsRes.data.data as ShopRow[]);
      setStats(statsRes.data.data as PlatformStats);
    } catch {
      setError('دکانیں لوڈ نہیں ہو سکیں — API چل رہی ہے؟ super admin login ہے؟');
      setShops([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShops();
  }, [loadShops]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.owner.name.toLowerCase().includes(q) ||
        s.owner.email.toLowerCase().includes(q) ||
        (s.city?.toLowerCase().includes(q) ?? false),
    );
  }, [shops, debouncedSearch]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/shops', form);
      setForm(emptyForm);
      setShowForm(false);
      notify.saved('نئی دکان بن گئی — مالک اب login کر سکتا ہے');
      await loadShops();
    } catch {
      notify.fail('دکان بنانا', new Error('failed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      await api.patch(`/shops/${id}/active`, { isActive: !isActive });
      await loadShops();
      notify.saved(isActive ? 'دکان غیر فعال' : 'دکان فعال');
    } catch {
      notify.fail('اسٹیٹس', new Error('failed'));
    }
  }

  return (
    <div className="space-y-6">
      <PlatformStatsCards stats={stats} loading={loading} />

      {error ? <AlertBanner onRetry={loadShops}>{error}</AlertBanner> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="دکان، مالک، ای میل…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
        <Button type="button" className="gap-1.5 bg-violet-600 hover:bg-violet-700" onClick={() => setShowForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          {showForm ? 'فارم بند کریں' : 'نئی دکان'}
        </Button>
      </div>

      {showForm ? (
        <Card className="border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4 text-violet-600" />
              نئی دکان رجسٹر کریں
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder="دکان کا نام"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
              <Input
                placeholder="مالک کا نام"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="مالک ای میل (login)"
                value={form.ownerEmail}
                onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })}
                required
                dir="ltr"
                className="text-left"
              />
              <Input
                type="password"
                placeholder="مالک پاس ورڈ (کم از کم 6)"
                value={form.ownerPassword}
                onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
                required
                minLength={6}
                dir="ltr"
                className="text-left"
              />
              <Button type="submit" className="md:col-span-2 gap-1.5 bg-violet-600 hover:bg-violet-700" disabled={submitting}>
                {submitting ? 'محفوظ ہو رہا ہے…' : 'دکان بنائیں'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            تمام دکانیں ({loading ? '…' : filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {shops.length === 0 ? 'ابھی کوئی دکان نہیں — نئی دکان بنائیں' : 'تلاش سے کوئی نتیجہ نہیں'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent even:bg-transparent">
                    <TableHead>دکان</TableHead>
                    <TableHead>مالک</TableHead>
                    <TableHead>گاہک</TableHead>
                    <TableHead>کھاتے</TableHead>
                    <TableHead>بننے کی تاریخ</TableHead>
                    <TableHead>حالت</TableHead>
                    <TableHead className="text-left">عمل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell>
                        <Link
                          href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}
                          className="font-medium font-urdu text-violet-800 hover:underline"
                        >
                          {shop.name}
                        </Link>
                        {shop.city ? <p className="text-xs text-slate-500">{shop.city}</p> : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-urdu">{shop.owner.name}</div>
                        <div className="text-xs text-slate-500" dir="ltr">
                          {shop.owner.email}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          آخری login: {fmtDate(shop.owner.lastLoginAt)}
                        </div>
                      </TableCell>
                      <TableCell>{shop._count.customers}</TableCell>
                      <TableCell>{shop._count.leaseAccounts}</TableCell>
                      <TableCell className="text-sm">{fmtDate(shop.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant={shop.isActive ? 'success' : 'muted'}>
                          {shop.isActive ? 'فعال' : 'غیر فعال'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}`}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="h-3.5 w-3.5" />
                              تفصیل
                            </Button>
                          </Link>
                          <Button variant="outline" size="sm" onClick={() => toggleActive(shop.id, shop.isActive)}>
                            {shop.isActive ? 'بند' : 'فعال'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
