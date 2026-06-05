'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fetchMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ShopRow {
  id: string;
  name: string;
  isActive: boolean;
  owner: { email: string; name: string };
}

export default function ShopsPage() {
  const router = useRouter();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerName: '',
  });
  const [message, setMessage] = useState('');

  async function loadShops() {
    const { data } = await api.get('/shops');
    setShops(data.data as ShopRow[]);
  }

  useEffect(() => {
    fetchMe().then(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        await loadShops();
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/shops', form);
      setForm({ name: '', ownerEmail: '', ownerPassword: '', ownerName: '' });
      setMessage('Shop created successfully');
      await loadShops();
    } catch {
      setMessage('Failed to create shop');
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await api.patch(`/shops/${id}/active`, { isActive: !isActive });
    await loadShops();
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Shops" description="Create shop tenants and manage activation status." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create shop</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Shop name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input placeholder="Owner name" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} required />
            <Input type="email" placeholder="Owner email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} required />
            <Input
              type="password"
              placeholder="Owner password"
              value={form.ownerPassword}
              onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })}
              required
              minLength={6}
            />
            <Button type="submit" className="md:col-span-2">
              Create shop
            </Button>
          </form>
          {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All shops</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-slate-500">Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent even:bg-transparent">
                  <TableHead>Shop</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-slate-500">
                      No shops yet
                    </TableCell>
                  </TableRow>
                ) : (
                  shops.map((shop) => (
                    <TableRow key={shop.id}>
                      <TableCell className="font-medium">{shop.name}</TableCell>
                      <TableCell>
                        <div>{shop.owner.name}</div>
                        <div className="text-xs text-slate-500">{shop.owner.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={shop.isActive ? 'success' : 'muted'}>{shop.isActive ? 'Active' : 'Inactive'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => toggleActive(shop.id, shop.isActive)}>
                          {shop.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
