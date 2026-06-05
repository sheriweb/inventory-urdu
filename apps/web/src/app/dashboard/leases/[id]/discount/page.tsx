'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Input } from '@/components/ui/input';
import { AlertBanner } from '@/components/ui/alert-banner';
import { fmtMoney } from '@/lib/format';

type LeaseDiscountData = {
  id: string;
  accountNumber: number;
  remainingBalance: string | number;
  customer: { name: string };
};

export default function LeaseDiscountPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [lease, setLease] = useState<LeaseDiscountData | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leases/${id}`);
      setLease(data.data as LeaseDiscountData);
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (Number.isNaN(value) || value <= 0) {
      setError('درست رعایت کی رقم درج کریں');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/leases/${id}/discount`, { amount: value, note: note || undefined });
      setSuccess('رعایت درج ہو گئی');
      notify.saved('رعایت کامیابی سے درج ہو گئی');
      setTimeout(() => router.push(`/dashboard/leases/${id}`), 800);
    } catch (err) {
      setError('رعایت نہیں لگ سکی — بقایا سے زیادہ رقم نہیں ہو سکتی');
      notify.fail('رعایت', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {lease ? (
        <p className="text-sm text-slate-600">
          کھاتہ #{lease.accountNumber} — {lease.customer.name} (بقایا {fmtMoney(lease.remainingBalance)})
        </p>
      ) : null}
      <PageToolbar>
        <Link
          href={`/dashboard/leases/${id}`}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowRight className="h-4 w-4" />
          واپس
        </Link>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
      ) : null}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</CardContent>
        </Card>
      ) : lease ? (
        <Card>
          <CardHeader>
            <CardTitle>رعایت کی رقم</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid max-w-md gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">رقم</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">نوٹ (اختیاری)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'درج…' : 'رعایت درج کریں'}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
