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
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { AlertBanner } from '@/components/ui/alert-banner';
import { LeaseStatus, StaffType, type Staff } from '@inventory-urdu/shared';

type LeaseEditData = {
  id: string;
  accountNumber: number;
  note?: string | null;
  status: LeaseStatus;
  salesmanId?: string | null;
  recoveryManId?: string | null;
  outdoorManId?: string | null;
};

const STATUS_LABELS: Record<LeaseStatus, string> = {
  [LeaseStatus.ACTIVE]: 'فعال',
  [LeaseStatus.CLOSED]: 'بند',
  [LeaseStatus.DEFAULTED]: 'ڈیفالٹ',
};

export default function LeaseEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [staff, setStaff] = useState<Staff[]>([]);
  const [salesmanId, setSalesmanId] = useState('');
  const [recoveryManId, setRecoveryManId] = useState('');
  const [outdoorManId, setOutdoorManId] = useState('');
  const [status, setStatus] = useState<LeaseStatus>(LeaseStatus.ACTIVE);
  const [note, setNote] = useState('');
  const [accountNumber, setAccountNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/staff');
        setStaff(data.data as Staff[]);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/leases/${id}`);
      const lease = data.data as LeaseEditData;
      setAccountNumber(lease.accountNumber);
      setSalesmanId(lease.salesmanId ?? '');
      setRecoveryManId(lease.recoveryManId ?? '');
      setOutdoorManId(lease.outdoorManId ?? '');
      setStatus(lease.status);
      setNote(lease.note ?? '');
    } catch {
      setError('کھاتہ لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const salesmen = staff.filter((s) => s.type === StaffType.SALESMAN);
  const recoveryMen = staff.filter((s) => s.type === StaffType.RECOVERY_MAN);
  const outdoorMen = staff.filter((s) => s.type === StaffType.OUTDOOR_MAN);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.patch(`/leases/${id}`, {
        salesmanId: salesmanId || null,
        recoveryManId: recoveryManId || null,
        outdoorManId: outdoorManId || null,
        status,
        note: note || null,
      });
      setSuccess('کھاتہ اپڈیٹ ہو گیا');
      notify.updated('کھاتہ');
      setTimeout(() => router.push(`/dashboard/leases/${id}`), 800);
    } catch (err) {
      setError('اپڈیٹ نہیں ہو سکی');
      notify.fail('کھاتہ اپڈیٹ', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
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
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>کھاتہ کی تفصیلات</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid max-w-xl gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">سیلز مین</label>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.SALESMAN}
                  value={salesmanId}
                  onChange={setSalesmanId}
                  placeholder="— کوئی نہیں —"
                  options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">ریکوری مین</label>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.RECOVERY_MAN}
                  value={recoveryManId}
                  onChange={setRecoveryManId}
                  placeholder="— کوئی نہیں —"
                  options={recoveryMen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">آؤٹ ڈور مین</label>
                <QuickAddSelect
                  entity="staff"
                  staffType={StaffType.OUTDOOR_MAN}
                  value={outdoorManId}
                  onChange={setOutdoorManId}
                  placeholder="— کوئی نہیں —"
                  options={outdoorMen.map((s) => ({ value: s.id, label: s.name }))}
                  onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">حالت</label>
                <Select value={status} onChange={(e) => setStatus(e.target.value as LeaseStatus)}>
                  {Object.values(LeaseStatus).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">نوٹ</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'محفوظ…' : 'محفوظ کریں'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
