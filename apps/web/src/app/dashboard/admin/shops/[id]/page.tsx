'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Bell, Building2, CreditCard, KeyRound, Mail, Save, Trash2, UserCircle } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { AdminShopTabs } from '@/components/admin/admin-shop-tabs';
import { ADMIN_ROUTE_PREFIX } from '@/lib/roles';
import { fmtMoney } from '@/lib/format';

type ShopDetail = {
  id: string;
  name: string;
  isActive: boolean;
  phone?: string | null;
  mobile?: string | null;
  email?: string | null;
  city?: string | null;
  address?: string | null;
  createdAt: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderMessageTemplate?: string | null;
  billingPlanLabel?: string | null;
  monthlyFeePkr?: string | number | null;
  billingNotes?: string | null;
  owner: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
    lastLoginAt?: string | null;
    createdAt: string;
  };
  _count: {
    customers: number;
    leaseAccounts: number;
    users: number;
    staff: number;
    payments: number;
    items: number;
  };
  leaseStats: {
    activeLeases: number;
    defaultedLeases: number;
    closedLeases: number;
  };
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ur-PK', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [shop, setShop] = useState<ShopDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [shopForm, setShopForm] = useState({ name: '', phone: '', mobile: '', email: '', city: '', address: '' });
  const [ownerForm, setOwnerForm] = useState({ name: '', email: '' });
  const [newPassword, setNewPassword] = useState('');
  const [savingShop, setSavingShop] = useState(false);
  const [savingOwner, setSavingOwner] = useState(false);
  const [resettingPw, setResettingPw] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    reminderEnabled: true,
    reminderDaysBefore: '2',
    reminderMessageTemplate: '',
  });
  const [billingForm, setBillingForm] = useState({
    billingPlanLabel: '',
    monthlyFeePkr: '',
    billingNotes: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [savingBilling, setSavingBilling] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/shops/${id}`);
      const row = data.data as ShopDetail;
      setShop(row);
      setShopForm({
        name: row.name,
        phone: row.phone ?? '',
        mobile: row.mobile ?? '',
        email: row.email ?? '',
        city: row.city ?? '',
        address: row.address ?? '',
      });
      setOwnerForm({ name: row.owner.name, email: row.owner.email });
      setReminderForm({
        reminderEnabled: row.reminderEnabled,
        reminderDaysBefore: String(row.reminderDaysBefore ?? 2),
        reminderMessageTemplate: row.reminderMessageTemplate ?? '',
      });
      setBillingForm({
        billingPlanLabel: row.billingPlanLabel ?? '',
        monthlyFeePkr: row.monthlyFeePkr != null ? String(row.monthlyFeePkr) : '',
        billingNotes: row.billingNotes ?? '',
      });
    } catch {
      setError('دکان کی تفصیل لوڈ نہیں ہو سکی');
      setShop(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive() {
    if (!shop) return;
    try {
      await api.patch(`/shops/${shop.id}/active`, { isActive: !shop.isActive });
      notify.saved(shop.isActive ? 'دکان غیر فعال' : 'دکان فعال');
      await load();
    } catch {
      notify.fail('اسٹیٹس', new Error('failed'));
    }
  }

  async function toggleOwnerActive() {
    if (!shop) return;
    try {
      await api.patch(`/shops/${shop.id}/owner/active`, { isActive: !shop.owner.isActive });
      notify.saved(shop.owner.isActive ? 'مالک بند' : 'مالک فعال');
      await load();
    } catch {
      notify.fail('مالک', new Error('failed'));
    }
  }

  async function saveShop(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSavingShop(true);
    try {
      await api.patch(`/shops/${shop.id}`, shopForm);
      notify.saved('دکان اپڈیٹ');
      await load();
    } catch {
      notify.fail('دکان', new Error('failed'));
    } finally {
      setSavingShop(false);
    }
  }

  async function saveOwner(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSavingOwner(true);
    try {
      await api.patch(`/shops/${shop.id}/owner`, ownerForm);
      notify.saved('مالک اپڈیٹ');
      await load();
    } catch {
      notify.fail('مالک', new Error('failed'));
    } finally {
      setSavingOwner(false);
    }
  }

  async function resetPassword(e: FormEvent) {
    e.preventDefault();
    if (!shop || newPassword.length < 6) return;
    setResettingPw(true);
    try {
      await api.post(`/shops/${shop.id}/owner/reset-password`, { newPassword });
      notify.saved('پاس ورڈ reset — مالک کو نیا password دیں');
      setNewPassword('');
    } catch {
      notify.fail('پاس ورڈ', new Error('failed'));
    } finally {
      setResettingPw(false);
    }
  }

  async function saveReminder(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSavingReminder(true);
    try {
      await api.patch(`/shops/${shop.id}/reminder-settings`, {
        reminderEnabled: reminderForm.reminderEnabled,
        reminderDaysBefore: parseInt(reminderForm.reminderDaysBefore, 10) || 2,
        reminderMessageTemplate: reminderForm.reminderMessageTemplate.trim() || undefined,
      });
      notify.saved('SMS/یاد دہانی ترتیبات');
      await load();
    } catch {
      notify.fail('یاد دہانی', new Error('failed'));
    } finally {
      setSavingReminder(false);
    }
  }

  async function saveBilling(e: FormEvent) {
    e.preventDefault();
    if (!shop) return;
    setSavingBilling(true);
    try {
      await api.patch(`/shops/${shop.id}/billing`, {
        billingPlanLabel: billingForm.billingPlanLabel.trim() || undefined,
        monthlyFeePkr: billingForm.monthlyFeePkr ? parseFloat(billingForm.monthlyFeePkr) : undefined,
        billingNotes: billingForm.billingNotes.trim() || undefined,
      });
      notify.saved('بلنگ محفوظ');
      await load();
    } catch {
      notify.fail('بلنگ', new Error('failed'));
    } finally {
      setSavingBilling(false);
    }
  }

  async function deleteShop() {
    if (!shop || deleteConfirm.trim() !== shop.name.trim()) return;
    setDeleting(true);
    try {
      await api.delete(`/shops/${shop.id}`, { data: { confirmName: deleteConfirm.trim() } });
      notify.saved('دکان حذف ہو گئی');
      router.push(`${ADMIN_ROUTE_PREFIX}/shops`);
    } catch {
      notify.fail('حذف', new Error('failed'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return <p className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>;
  }

  if (error || !shop) {
    return (
      <div className="space-y-4">
        <AlertBanner onRetry={load}>{error || 'دکان نہیں ملی'}</AlertBanner>
        <Link href={`${ADMIN_ROUTE_PREFIX}/shops`}>
          <Button variant="outline" className="gap-1.5">
            <ArrowRight className="h-4 w-4" />
            دکانوں کی فہرست
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`${ADMIN_ROUTE_PREFIX}/shops`}
            className="mb-2 inline-flex items-center gap-1 text-sm text-violet-700 hover:underline"
          >
            <ArrowRight className="h-4 w-4" />
            تمام دکانیں
          </Link>
          <h1 className="text-xl font-bold font-urdu text-slate-900">{shop.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={shop.isActive ? 'success' : 'muted'}>
              دکان {shop.isActive ? 'فعال' : 'غیر فعال'}
            </Badge>
            <Badge variant={shop.owner.isActive ? 'success' : 'muted'}>
              مالک {shop.owner.isActive ? 'فعال' : 'بند'}
            </Badge>
            <Badge variant="muted">بنائی: {fmtDate(shop.createdAt)}</Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={toggleActive}>
            {shop.isActive ? 'دکان بند' : 'دکان فعال'}
          </Button>
          <Button variant="outline" onClick={toggleOwnerActive}>
            {shop.owner.isActive ? 'مالک بند' : 'مالک فعال'}
          </Button>
        </div>
      </div>

      <AdminShopTabs shopId={shop.id} shopName={shop.name} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">گاہک</p>
            <p className="text-2xl font-bold">{shop._count.customers}</p>
            <Link href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}/customers`} className="text-xs text-violet-700 hover:underline">
              فہرست دیکھیں
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">کھاتے</p>
            <p className="text-2xl font-bold">{shop._count.leaseAccounts}</p>
            <Link href={`${ADMIN_ROUTE_PREFIX}/shops/${shop.id}/accounts`} className="text-xs text-violet-700 hover:underline">
              فہرست دیکھیں
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">فعال کھاتے</p>
            <p className="text-2xl font-bold text-emerald-700">{shop.leaseStats.activeLeases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">ادائیگیاں</p>
            <p className="text-2xl font-bold">{shop._count.payments}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              دکان ترمیم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveShop} className="space-y-3">
              <Input
                placeholder="دکان کا نام"
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                required
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  placeholder="فون"
                  value={shopForm.phone}
                  onChange={(e) => setShopForm({ ...shopForm, phone: e.target.value })}
                  dir="ltr"
                  className="text-left"
                />
                <Input
                  placeholder="موبائل"
                  value={shopForm.mobile}
                  onChange={(e) => setShopForm({ ...shopForm, mobile: e.target.value })}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <Input
                type="email"
                placeholder="دکان email"
                value={shopForm.email}
                onChange={(e) => setShopForm({ ...shopForm, email: e.target.value })}
                dir="ltr"
                className="text-left"
              />
              <Input
                placeholder="شہر"
                value={shopForm.city}
                onChange={(e) => setShopForm({ ...shopForm, city: e.target.value })}
              />
              <Input
                placeholder="پتہ"
                value={shopForm.address}
                onChange={(e) => setShopForm({ ...shopForm, address: e.target.value })}
              />
              <Button type="submit" className="gap-1.5 bg-violet-600 hover:bg-violet-700" disabled={savingShop}>
                <Save className="h-4 w-4" />
                {savingShop ? 'محفوظ…' : 'دکان محفوظ'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="h-4 w-4" />
              مالک (login)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-slate-500">
              آخری login: {fmtDate(shop.owner.lastLoginAt)}
            </p>
            <form onSubmit={saveOwner} className="space-y-3">
              <Input
                placeholder="مالک نام"
                value={ownerForm.name}
                onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })}
                required
              />
              <Input
                type="email"
                placeholder="login email"
                value={ownerForm.email}
                onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })}
                required
                dir="ltr"
                className="text-left"
              />
              <Button type="submit" variant="outline" className="gap-1.5" disabled={savingOwner}>
                <Mail className="h-4 w-4" />
                {savingOwner ? 'محفوظ…' : 'مالک محفوظ'}
              </Button>
            </form>
            <form onSubmit={resetPassword} className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-medium text-slate-600">پاس ورڈ reset</p>
              <Input
                type="password"
                placeholder="نیا پاس ورڈ (6+)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                dir="ltr"
                className="text-left"
              />
              <Button type="submit" variant="outline" className="gap-1.5" disabled={resettingPw || newPassword.length < 6}>
                <KeyRound className="h-4 w-4" />
                {resettingPw ? 'reset…' : 'پاس ورڈ reset'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">کھاتوں کی حالت</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-slate-500">فعال:</span>{' '}
            <span className="font-semibold text-emerald-700">{shop.leaseStats.activeLeases}</span>
          </div>
          <div>
            <span className="text-slate-500">ڈیفالٹ:</span>{' '}
            <span className="font-semibold text-rose-700">{shop.leaseStats.defaultedLeases}</span>
          </div>
          <div>
            <span className="text-slate-500">بند:</span>{' '}
            <span className="font-semibold text-slate-700">{shop.leaseStats.closedLeases}</span>
          </div>
          <div>
            <span className="text-slate-500">عملہ:</span> {shop._count.staff}
          </div>
          <div>
            <span className="text-slate-500">آئٹمز:</span> {shop._count.items}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              SMS / یاد دہانی (اس دکان)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveReminder} className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={reminderForm.reminderEnabled}
                  onChange={(e) =>
                    setReminderForm({ ...reminderForm, reminderEnabled: e.target.checked })
                  }
                />
                یاد دہانیاں فعال
              </label>
              <Input
                type="number"
                min={0}
                max={30}
                placeholder="کتنے دن پہلے"
                value={reminderForm.reminderDaysBefore}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, reminderDaysBefore: e.target.value })
                }
              />
              <textarea
                placeholder="پیغام ٹیمپلیٹ (اختیاری)"
                value={reminderForm.reminderMessageTemplate}
                onChange={(e) =>
                  setReminderForm({ ...reminderForm, reminderMessageTemplate: e.target.value })
                }
                className="flex min-h-[4rem] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <Button type="submit" variant="outline" disabled={savingReminder}>
                {savingReminder ? 'محفوظ…' : 'یاد دہانی محفوظ'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              بلنگ (اس دکان)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveBilling} className="space-y-3">
              <Input
                placeholder="پلان"
                value={billingForm.billingPlanLabel}
                onChange={(e) =>
                  setBillingForm({ ...billingForm, billingPlanLabel: e.target.value })
                }
              />
              <Input
                type="number"
                min={0}
                step="any"
                placeholder="ماہانہ فیس PKR"
                value={billingForm.monthlyFeePkr}
                onChange={(e) =>
                  setBillingForm({ ...billingForm, monthlyFeePkr: e.target.value })
                }
                dir="ltr"
                className="text-left"
              />
              {shop.monthlyFeePkr != null ? (
                <p className="text-xs text-slate-500">موجودہ: {fmtMoney(shop.monthlyFeePkr)}</p>
              ) : null}
              <textarea
                placeholder="بلنگ نوٹ"
                value={billingForm.billingNotes}
                onChange={(e) =>
                  setBillingForm({ ...billingForm, billingNotes: e.target.value })
                }
                className="flex min-h-[4rem] w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <Button type="submit" variant="outline" disabled={savingBilling}>
                {savingBilling ? 'محفوظ…' : 'بلنگ محفوظ'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card className="border-rose-200 bg-rose-50/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-rose-900">
            <Trash2 className="h-4 w-4" />
            دکان حذف (خطرناک)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-rose-900">
            تمام گاہک، کھاتے، ادائیگیاں اور ڈیٹا مستقل حذف ہو جائیں گے۔ تصدیق کے لیے دکان کا نام لکھیں:{' '}
            <strong className="font-urdu">{shop.name}</strong>
          </p>
          <Input
            placeholder="دکان کا نام یہاں لکھیں"
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="border-rose-300 text-rose-800 hover:bg-rose-100"
            disabled={deleting || deleteConfirm.trim() !== shop.name.trim()}
            onClick={deleteShop}
          >
            {deleting ? 'حذف…' : 'دکان مستقل حذف کریں'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
