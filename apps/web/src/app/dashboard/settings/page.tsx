'use client';

import { useCallback, useEffect, useState } from 'react';
import { Mail, MapPin, Palette, Phone, Save, Store, Bell } from 'lucide-react';
import api from '@/lib/api';
import { notify, getApiErrorMessage } from '@/lib/notify';
import { loadShopProfile } from '@/lib/shop-profile';
import { applyShopBranding, normalizeBrandColor } from '@/lib/shop-branding';
import { clearAuthCache, fetchMe } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-section';
import { ImageUpload } from '@/components/ui/image-upload';
import { ColorPicker } from '@/components/ui/color-picker';
import { AlertBanner } from '@/components/ui/alert-banner';
import { SegmentTabs, TabPanel } from '@/components/ui/segment-tabs';
import { DEFAULT_REMINDER_TEMPLATE } from '@/lib/reminder-message';

import type { ShopProfile } from '@inventory-urdu/shared';

type ShopForm = {
  name: string;
  logoUrl: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  description: string;
  brandColor: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderMessageTemplate: string;
  autoRoznamchaOnCollection: boolean;
};

type SettingsTab = 'branding' | 'basic' | 'contact' | 'address' | 'reminders';

const SETTINGS_TABS = [
  { id: 'branding', label: 'برانڈنگ', icon: Palette, description: 'لوگو اور تھیم کا رنگ' },
  { id: 'basic', label: 'بنیادی معلومات', icon: Store, description: 'نام اور مختصر تعارف' },
  { id: 'contact', label: 'رابطہ', icon: Phone, description: 'فون، موبائل اور ای میل' },
  { id: 'address', label: 'پتہ', icon: MapPin, description: 'شہر اور مکمل پتہ' },
  { id: 'reminders', label: 'یاد دہانیاں', icon: Bell, description: 'قسط SMS / واٹس ایپ' },
] as const;

const TAB_HINTS: Record<SettingsTab, string> = {
  branding: 'لوگو اور رنگ header میں ظاہر ہوں گے',
  basic: 'نام receipts اور reports پر دکھے گا',
  contact: 'فون اور ای میل رابطے کے لیے',
  address: 'پتہ رسیدوں پر شامل ہو سکتا ہے',
  reminders: '2 دن پہلے خودکار فہرست — واٹس ایپ/SMS ایک کلک',
};

const emptyShop: ShopForm = {
  name: '',
  logoUrl: '',
  phone: '',
  mobile: '',
  email: '',
  address: '',
  city: '',
  description: '',
  brandColor: '#059669',
  reminderEnabled: true,
  reminderDaysBefore: 2,
  reminderMessageTemplate: DEFAULT_REMINDER_TEMPLATE,
  autoRoznamchaOnCollection: true,
};

const inputClass = 'rounded-xl border-slate-200 bg-white shadow-sm transition focus-visible:ring-[var(--shop-brand)]/30';
const textareaClass =
  'flex min-h-[5.5rem] w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shop-brand)]/40';

function shopToForm(shop: ShopProfile): ShopForm {
  return {
    name: shop.name ?? '',
    logoUrl: shop.logoUrl ?? '',
    phone: shop.phone ?? '',
    mobile: shop.mobile ?? '',
    email: shop.email ?? '',
    address: shop.address ?? '',
    city: shop.city ?? '',
    description: shop.description ?? '',
    brandColor: normalizeBrandColor(shop.brandColor),
    reminderEnabled: shop.reminderEnabled ?? true,
    reminderDaysBefore: shop.reminderDaysBefore ?? 2,
    reminderMessageTemplate: shop.reminderMessageTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE,
    autoRoznamchaOnCollection: shop.autoRoznamchaOnCollection ?? true,
  };
}

function FieldCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-100 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5 ${className ?? ''}`}>
      {children}
    </div>
  );
}

export default function ShopSettingsPage() {
  const [form, setForm] = useState<ShopForm>(emptyShop);
  const [tab, setTab] = useState<SettingsTab>('branding');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [apiStale, setApiStale] = useState(false);

  const activeMeta = SETTINGS_TABS.find((t) => t.id === tab)!;
  const ActiveTabIcon = activeMeta.icon;

  useEffect(() => {
    applyShopBranding(form.brandColor);
  }, [form.brandColor]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setApiStale(false);
    try {
      const { shop, source } = await loadShopProfile();
      setForm(shopToForm(shop));
      applyShopBranding(shop.brandColor);
      if (source === 'me') setApiStale(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'دکان کی معلومات لوڈ نہیں ہو سکیں — API دوبارہ شروع کریں'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      notify.error('دکان کا نام درج کریں');
      setTab('basic');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.patch('/shop/profile', {
        name: form.name.trim(),
        logoUrl: form.logoUrl || undefined,
        phone: form.phone || undefined,
        mobile: form.mobile || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
        city: form.city || undefined,
        description: form.description || undefined,
        brandColor: normalizeBrandColor(form.brandColor),
        reminderEnabled: form.reminderEnabled,
        reminderDaysBefore: form.reminderDaysBefore,
        reminderMessageTemplate: form.reminderMessageTemplate.trim() || undefined,
        autoRoznamchaOnCollection: form.autoRoznamchaOnCollection,
      });
      clearAuthCache();
      const me = await fetchMe(true);
      applyShopBranding(me?.shop?.brandColor ?? form.brandColor);
      setApiStale(false);
      notify.updated('دکان کی ترتیبات', 'برانڈنگ اور معلومات محفوظ ہو گئیں');
    } catch (err) {
      notify.fail('محفوظ', err, 'دکان کی معلومات محفوظ نہیں ہو سکیں');
      setError(getApiErrorMessage(err, 'دکان کی معلومات محفوظ نہیں ہو سکیں'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[20rem] flex-col items-center justify-center gap-4">
        <div className="h-11 w-11 animate-spin rounded-full border-4 border-[var(--shop-brand)] border-t-transparent" />
        <p className="text-sm text-slate-500">دکان کی ترتیبات لوڈ ہو رہی ہیں…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pb-4">
      {error ? <AlertBanner onRetry={load} className="mb-4">{error}</AlertBanner> : null}

      {apiStale && !error ? (
        <AlertBanner variant="info" className="mb-4">
          API پرانی ہے — محفوظ کرنے کے لیے server restart کریں
        </AlertBanner>
      ) : null}

      <form
        onSubmit={onSave}
        className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] ring-1 ring-slate-100"
      >
        <div className="bg-gradient-to-b from-white to-slate-50/40 px-2 pt-2 sm:px-4 sm:pt-3">
          <SegmentTabs
            tabs={[...SETTINGS_TABS]}
            active={tab}
            onChange={(id) => setTab(id as SettingsTab)}
          />
        </div>

        <div className="min-h-[24rem] bg-gradient-to-b from-slate-50/30 to-white px-4 py-6 sm:px-8 sm:py-8">
          {tab === 'branding' ? (
            <TabPanel title="برانڈنگ" description="لوگو اور تھیم کا رنگ" icon={Palette}>
              <div className="grid gap-5 lg:grid-cols-2">
                <FieldCard>
                  <FormField label="دکان کا لوگو">
                    <ImageUpload
                      value={form.logoUrl}
                      onChange={(url) => setForm({ ...form, logoUrl: url })}
                      hint="اختیاری — سفید یا شفاف پس منظر بہتر ہے"
                    />
                  </FormField>
                </FieldCard>
                <FieldCard>
                  <FormField label="برانڈ رنگ">
                    <ColorPicker value={form.brandColor} onChange={(brandColor) => setForm({ ...form, brandColor })} />
                  </FormField>
                </FieldCard>
              </div>
            </TabPanel>
          ) : null}

          {tab === 'basic' ? (
            <TabPanel title="بنیادی معلومات" description="دکان کا نام اور تعارف" icon={Store}>
              <FieldCard className="mx-auto max-w-xl space-y-5">
                <FormField label="دکان کا نام">
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="مثلاً: علی Electronics"
                    className={inputClass}
                  />
                </FormField>
                <FormField label="مختصر تعارف">
                  <textarea
                    className={textareaClass}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="دکان کے بارے میں مختصر تفصیل"
                  />
                </FormField>
              </FieldCard>
            </TabPanel>
          ) : null}

          {tab === 'contact' ? (
            <TabPanel title="رابطہ" description="فون، موبائل اور ای میل" icon={Phone}>
              <FieldCard className="mx-auto max-w-xl">
                <div className="grid gap-5 sm:grid-cols-2">
                  <FormField label="فون">
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      dir="ltr"
                      className={`${inputClass} text-left`}
                      placeholder="042-XXXXXXX"
                    />
                  </FormField>
                  <FormField label="موبائل">
                    <Input
                      value={form.mobile}
                      onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                      dir="ltr"
                      className={`${inputClass} text-left`}
                      placeholder="03XX-XXXXXXX"
                    />
                  </FormField>
                  <FormField label="ای میل" className="sm:col-span-2">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        dir="ltr"
                        className={`${inputClass} pl-3 pr-10 text-left`}
                        type="email"
                        placeholder="shop@example.com"
                      />
                    </div>
                  </FormField>
                </div>
              </FieldCard>
            </TabPanel>
          ) : null}

          {tab === 'address' ? (
            <TabPanel title="پتہ" description="شہر اور مکمل پتہ" icon={MapPin}>
              <FieldCard className="mx-auto max-w-xl space-y-5">
                <FormField label="شہر">
                  <Input
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className={inputClass}
                    placeholder="مثلاً: لاہور"
                  />
                </FormField>
                <FormField label="مکمل پتہ">
                  <textarea
                    className={textareaClass}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    placeholder="گلی، علاقہ، شہر"
                  />
                </FormField>
              </FieldCard>
            </TabPanel>
          ) : null}

          {tab === 'reminders' ? (
            <TabPanel title="قسط یاد دہانیاں" description="2 دن پہلے موبائل یاد دہانی" icon={Bell}>
              <FieldCard className="mx-auto max-w-xl space-y-5">
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <input
                    type="checkbox"
                    checked={form.reminderEnabled}
                    onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">یاد دہانیاں فعال کریں</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                      وصولی → «یاد دہانیاں» میں فہرست خود بنے گی۔ مفت میں واٹس ایپ/SMS لنک سے ایک کلک پر بھیجیں۔
                    </span>
                  </span>
                </label>
                <FormField label="کتنے دن پہلے">
                  <Input
                    type="number"
                    min={1}
                    max={14}
                    value={form.reminderDaysBefore}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reminderDaysBefore: Math.min(14, Math.max(1, Number(e.target.value) || 2)),
                      })
                    }
                    dir="ltr"
                    className={`${inputClass} max-w-[8rem] text-left`}
                  />
                </FormField>
                <FormField label="پیغام (متغیرات: {name} {shop} {account} {amount} {dueDate})">
                  <textarea
                    className={textareaClass}
                    value={form.reminderMessageTemplate}
                    onChange={(e) => setForm({ ...form, reminderMessageTemplate: e.target.value })}
                    rows={5}
                  />
                </FormField>
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <input
                    type="checkbox"
                    checked={form.autoRoznamchaOnCollection}
                    onChange={(e) => setForm({ ...form, autoRoznamchaOnCollection: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-emerald-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">وصولی پر روزنامچہ خود لکھیں</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-600">
                      قسط یا ایڈوانس وصول ہو تو کیش بک میں وصولی کی انٹری خود بن جائے گی۔
                    </span>
                  </span>
                </label>
              </FieldCard>
            </TabPanel>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-gradient-to-l from-slate-50 to-white px-4 py-4 sm:px-8">
          <div className="flex items-center gap-2.5 text-xs text-slate-500">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(var(--shop-brand-rgb),0.1)] text-[var(--shop-brand)]"
            >
              <ActiveTabIcon className="h-4 w-4" />
            </span>
            <span>{TAB_HINTS[tab]}</span>
          </div>
          <Button type="submit" disabled={submitting} className="min-w-[10rem] gap-1.5 shadow-md">
            <Save className="h-4 w-4" />
            {submitting ? 'محفوظ…' : 'ترتیبات محفوظ کریں'}
          </Button>
        </div>
      </form>
    </div>
  );
}
