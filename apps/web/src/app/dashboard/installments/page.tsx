'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CalendarClock } from 'lucide-react';
import api from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { SegmentTabs, TabPanel } from '@/components/ui/segment-tabs';
import { AlertBanner } from '@/components/ui/alert-banner';
import { ScheduleEditPanel } from '@/components/installments/schedule-edit-panel';
import { INSTALLMENT_STATUS_LABELS } from '@/lib/labels';
import { fmtDate, fmtMoney } from '@/lib/format';
import { InstallmentStatus } from '@inventory-urdu/shared';

type ShortRow = {
  id: string;
  leaseAccountId: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
  isShort: boolean;
  accountNumber: number;
  customerName: string;
};

const STATUS_LABELS = INSTALLMENT_STATUS_LABELS;

const INSTALLMENT_TABS = [
  { id: 'short', label: 'شارٹ لسٹ', icon: AlertTriangle, description: 'مقررہ قسط سے کم ادائیگی' },
  { id: 'schedule', label: 'شیڈول اپڈیٹ', icon: CalendarClock, description: 'قسط کی تاریخ یا رقم تبدیل کریں' },
];

const shortColumns: DataTableColumn<ShortRow>[] = [
  { id: 'account', header: 'کھاتہ', cell: (row) => <span className="font-medium">{row.accountNumber}</span> },
  { id: 'customer', header: 'گاہک', cell: (row) => row.customerName },
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.dueDate) },
  { id: 'scheduled', header: 'اصل قسط', cell: (row) => fmtMoney(row.scheduledAmount) },
  { id: 'paid', header: 'ادا شدہ', cell: (row) => fmtMoney(row.paidAmount) },
  {
    id: 'shortfall',
    header: 'کمی',
    cell: (row) => {
      const shortfall = Math.max(0, row.scheduledAmount - row.paidAmount);
      return <span className="font-medium text-amber-800">{fmtMoney(shortfall)}</span>;
    },
  },
  {
    id: 'status',
    header: 'حالت',
    cell: (row) => (
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="muted">{STATUS_LABELS[row.status]}</Badge>
        {row.isShort ? <Badge variant="warning">شارٹ</Badge> : null}
      </div>
    ),
  },
  {
    id: 'link',
    header: '',
    headerClassName: 'w-20',
    cell: (row) => (
      <Link href={`/dashboard/leases/${row.leaseAccountId}`} className="text-sm font-medium text-emerald-700 hover:underline">
        کھاتہ
      </Link>
    ),
  },
];

export default function InstallmentsHubPage() {
  const [tab, setTab] = useState('short');
  const [rows, setRows] = useState<ShortRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/installments/short');
      setRows(data.data as ShortRow[]);
    } catch {
      setError('شارٹ لسٹ لوڈ نہیں ہو سکی');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'short') load();
  }, [tab, load]);

  return (
    <div className="space-y-6">
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="bg-gradient-to-b from-white to-slate-50/40 px-2 pt-2 sm:px-4 sm:pt-3">
          <SegmentTabs tabs={INSTALLMENT_TABS} active={tab} onChange={setTab} ariaLabel="قسطوں کے tabs" />
        </div>

        <div className="bg-gradient-to-b from-slate-50/30 to-white px-4 py-6 sm:px-6">
          {tab === 'short' ? (
            <TabPanel title="شارٹ لسٹ" description="جزوی ادائیگی والے کھاتے" icon={AlertTriangle}>
              <DataTable
                data={rows}
                columns={shortColumns}
                rowKey={(row) => row.id}
                loading={loading}
                pageSize={12}
                emptyTitle="کوئی شارٹ قسط نہیں"
                emptyDescription="تمام قسطیں مکمل ہیں — اچھا کام!"
                rowClassName={() => 'bg-amber-50/40 hover:bg-amber-50/70'}
                searchKeys={(row) => `${row.accountNumber} ${row.customerName}`}
                searchPlaceholder="کھاتہ یا گاہک تلاش کریں…"
              />
            </TabPanel>
          ) : (
            <TabPanel title="شیڈول اپڈیٹ" description="قسط کی تاریخ یا رقم میں تبدیلی" icon={CalendarClock}>
              <ScheduleEditPanel />
            </TabPanel>
          )}
        </div>
      </div>
    </div>
  );
}
