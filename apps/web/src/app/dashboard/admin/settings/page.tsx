'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Bell, CreditCard, Settings2 } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertBanner } from '@/components/ui/alert-banner';
import { fmtMoney } from '@/lib/format';

type PlatformSettings = {
  smsAutoEnabled: boolean;
  smsProvider?: string | null;
  smsSenderId?: string | null;
  defaultReminderDays: number;
  billingPlanLabel?: string | null;
  billingNotes?: string | null;
  defaultMonthlyFeePkr?: number | null;
  smsApiConfigured: boolean;
  smsMode: string;
};

export default function AdminPlatformSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    smsAutoEnabled: false,
    smsProvider: '',
    smsSenderId: '',
    defaultReminderDays: '2',
    billingPlanLabel: '',
    billingNotes: '',
    defaultMonthlyFeePkr: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/platform/settings');
      const row = data.data as PlatformSettings;
      setSettings(row);
      setForm({
        smsAutoEnabled: row.smsAutoEnabled,
        smsProvider: row.smsProvider ?? '',
        smsSenderId: row.smsSenderId ?? '',
        defaultReminderDays: String(row.defaultReminderDays ?? 2),
        billingPlanLabel: row.billingPlanLabel ?? '',
        billingNotes: row.billingNotes ?? '',
        defaultMonthlyFeePkr:
          row.defaultMonthlyFeePkr != null ? String(row.defaultMonthlyFeePkr) : '',
      });
    } catch {
      setError('ترتیبات لوڈ نہیں ہو سکیں');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/platform/settings', {
        smsAutoEnabled: form.smsAutoEnabled,
        smsProvider: form.smsProvider.trim() || undefined,
        smsSenderId: form.smsSenderId.trim() || undefined,
        defaultReminderDays: parseInt(form.defaultReminderDays, 10) || 2,
        billingPlanLabel: form.billingPlanLabel.trim() || undefined,
        billingNotes: form.billingNotes.trim() || undefined,
        defaultMonthlyFeePkr: form.defaultMonthlyFeePkr
          ? parseFloat(form.defaultMonthlyFeePkr)
          : undefined,
      });
      notify.saved('پلیٹ فارم ترتیبات محفوظ');
      await load();
    } catch {
      notify.fail('ترتیبات', new Error('failed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Settings2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">SMS اور بلنگ (پلیٹ فارم)</h1>
            <p className="mt-1 text-sm text-slate-600">
              خودکار SMS gateway اور ڈیفالٹ بلنگ — نئی دکانوں پر لاگو
            </p>
          </div>
        </div>
      </div>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {settings ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-950">
          SMS API:{' '}
          <strong>{settings.smsApiConfigured ? 'سرور پر configured' : 'configured نہیں (.env SMS_API_KEY)'}</strong>
          {' — '}
          موڈ: {settings.smsAutoEnabled && settings.smsApiConfigured ? 'خودکار SMS' : 'واٹس ایپ/SMS لنک (مفت)'}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              SMS / یاد دہانی
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.smsAutoEnabled}
                onChange={(e) => setForm({ ...form, smsAutoEnabled: e.target.checked })}
                className="rounded border-slate-300"
              />
              خودکار SMS (gateway ضروری)
            </label>
            <Input
              placeholder="SMS provider (مثلاً Twilio)"
              value={form.smsProvider}
              onChange={(e) => setForm({ ...form, smsProvider: e.target.value })}
            />
            <Input
              placeholder="Sender ID"
              value={form.smsSenderId}
              onChange={(e) => setForm({ ...form, smsSenderId: e.target.value })}
              dir="ltr"
              className="text-left"
            />
            <Input
              type="number"
              min={0}
              max={30}
              placeholder="ڈیفالٹ یاد دہانی (دن پہلے)"
              value={form.defaultReminderDays}
              onChange={(e) => setForm({ ...form, defaultReminderDays: e.target.value })}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              بلنگ (ڈیفالٹ)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="پلان نام (Standard)"
              value={form.billingPlanLabel}
              onChange={(e) => setForm({ ...form, billingPlanLabel: e.target.value })}
            />
            <Input
              type="number"
              min={0}
              step="any"
              placeholder="ماہانہ فیس (PKR)"
              value={form.defaultMonthlyFeePkr}
              onChange={(e) => setForm({ ...form, defaultMonthlyFeePkr: e.target.value })}
              dir="ltr"
              className="text-left"
            />
            <textarea
              placeholder="بلنگ نوٹ"
              value={form.billingNotes}
              onChange={(e) => setForm({ ...form, billingNotes: e.target.value })}
              className="flex min-h-[5rem] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            {settings?.defaultMonthlyFeePkr != null ? (
              <p className="text-xs text-slate-500">
                موجودہ ڈیفالٹ: {fmtMoney(settings.defaultMonthlyFeePkr)} / ماہ
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Button
          type="submit"
          disabled={loading || saving}
          className="lg:col-span-2 bg-violet-600 hover:bg-violet-700"
        >
          {saving ? 'محفوظ…' : 'ترتیبات محفوظ کریں'}
        </Button>
      </form>
    </div>
  );
}
