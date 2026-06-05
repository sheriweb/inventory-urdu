'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AxiosError } from 'axios';
import Link from 'next/link';
import { MessageCircle, RefreshCw, Settings, Smartphone, SkipForward, X } from 'lucide-react';
import api from '@/lib/api';
import { notify, getApiErrorMessage } from '@/lib/notify';
import { fmtDate, fmtMoney } from '@/lib/format';
import { buildReminderMessage } from '@/lib/reminder-message';
import { smsHrefWithBody, whatsAppHrefWithText } from '@/lib/phone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type ReminderRow = {
  scheduleId: string;
  leaseAccountId: string;
  accountNumber: number;
  installmentNumber: number;
  dueDate: string;
  amount: number;
  customerName: string;
  customerMobile: string | null;
  shopName: string;
  messageTemplate: string;
  sentWhatsApp: boolean;
  sentSms: boolean;
  pending: boolean;
};

type ReminderPayload = {
  enabled: boolean;
  daysBefore: number;
  targetDate?: string;
  messageTemplate: string;
  items: ReminderRow[];
};

type BulkQueue = {
  channel: 'WHATSAPP' | 'SMS';
  index: number;
  items: ReminderRow[];
};

export function InstallmentRemindersPanel() {
  const [data, setData] = useState<ReminderPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [queue, setQueue] = useState<BulkQueue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/recovery/reminders');
      setData(res.data as ReminderPayload);
    } catch (err) {
      const status = (err as AxiosError)?.response?.status;
      if (status === 404) {
        setError('API پرانی ہے — terminal میں: cd apps/api && npm run build && npm run start:prod');
      } else {
        setError(getApiErrorMessage(err, 'یاد دہانیاں لوڈ نہیں ہو سکیں'));
      }
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function markSent(scheduleId: string, channel: 'WHATSAPP' | 'SMS') {
    setSendingId(scheduleId);
    try {
      await api.post(`/recovery/reminders/${scheduleId}/sent`, { channel });
      if (!queue) {
        await load();
      }
    } catch (err) {
      notify.fail('یاد دہانی', err);
    } finally {
      setSendingId(null);
    }
  }

  function buildMessage(row: ReminderRow): string {
    return buildReminderMessage(row.messageTemplate, {
      name: row.customerName,
      shop: row.shopName,
      account: row.accountNumber,
      amount: row.amount,
      dueDate: row.dueDate,
    });
  }

  function openChannel(row: ReminderRow, channel: 'WHATSAPP' | 'SMS', mark = true) {
    const text = buildMessage(row);
    if (channel === 'WHATSAPP') {
      const href = row.customerMobile ? whatsAppHrefWithText(row.customerMobile, text) : null;
      if (!href) {
        notify.error('موبائل نمبر درست نہیں');
        return false;
      }
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      const href = row.customerMobile ? smsHrefWithBody(row.customerMobile, text) : null;
      if (!href) {
        notify.error('موبائل نمبر درست نہیں');
        return false;
      }
      window.location.href = href;
    }
    if (mark) {
      void markSent(row.scheduleId, channel);
    }
    return true;
  }

  function openWhatsApp(row: ReminderRow) {
    openChannel(row, 'WHATSAPP');
  }

  function openSms(row: ReminderRow) {
    openChannel(row, 'SMS');
  }

  function startBulkQueue(channel: 'WHATSAPP' | 'SMS') {
    const items = pendingItems.filter((row) => row.customerMobile?.trim());
    if (items.length === 0) {
      notify.error('بھیجنے کے لیے کوئی یاد دہانی نہیں');
      return;
    }
    setQueue({ channel, index: 0, items });
    openChannel(items[0], channel);
  }

  async function advanceQueue() {
    if (!queue) return;
    const nextIndex = queue.index + 1;
    if (nextIndex >= queue.items.length) {
      setQueue(null);
      notify.saved('تمام یاد دہانیاں کھول دی گئیں');
      await load();
      return;
    }
    const next = { ...queue, index: nextIndex };
    setQueue(next);
    openChannel(next.items[nextIndex], next.channel);
  }

  function cancelQueue() {
    setQueue(null);
    void load();
  }

  const currentQueueRow = queue ? queue.items[queue.index] : null;

  const pendingItems = useMemo(() => data?.items.filter((i) => i.pending) ?? [], [data]);
  const sentItems = useMemo(() => data?.items.filter((i) => !i.pending) ?? [], [data]);

  const columns: DataTableColumn<ReminderRow>[] = [
    {
      id: 'account',
      header: 'کھاتہ',
      cell: (row) => (
        <Link href={`/dashboard/leases/${row.leaseAccountId}`} className="font-medium text-emerald-800 hover:underline">
          #{row.accountNumber}
        </Link>
      ),
    },
    { id: 'name', header: 'گاہک', cell: (row) => <span className="font-urdu">{row.customerName}</span> },
    {
      id: 'due',
      header: 'واجب تاریخ',
      cell: (row) => (
        <span>
          {fmtDate(row.dueDate)} <span className="text-slate-400">#{row.installmentNumber}</span>
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'رقم',
      cell: (row) => <span className="font-medium text-emerald-800">{fmtMoney(row.amount)}</span>,
    },
    {
      id: 'status',
      header: 'حالت',
      cell: (row) =>
        row.pending ? (
          <Badge variant="warning">بھیجنی ہے</Badge>
        ) : (
          <span className="flex flex-wrap gap-1">
            {row.sentWhatsApp ? <Badge variant="success">واٹس ایپ</Badge> : null}
            {row.sentSms ? <Badge variant="muted">SMS</Badge> : null}
          </span>
        ),
    },
    {
      id: 'action',
      header: '',
      headerClassName: 'w-44',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1 text-[11px]"
            disabled={sendingId === row.scheduleId}
            onClick={() => openWhatsApp(row)}
          >
            <MessageCircle className="h-3 w-3" />
            واٹس ایپ
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1 text-[11px]"
            disabled={sendingId === row.scheduleId}
            onClick={() => openSms(row)}
          >
            <Smartphone className="h-3 w-3" />
            SMS
          </Button>
        </div>
      ),
    },
  ];

  if (loading && !data) {
    return <Card><CardContent className="py-10 text-center text-sm text-slate-500">یاد دہانیاں لوڈ ہو رہی ہیں…</CardContent></Card>;
  }

  if (data && !data.enabled) {
    return (
      <Card className="border-amber-100 bg-amber-50/40">
        <CardContent className="space-y-3 p-5 text-sm">
          <p className="font-medium text-amber-900">قسط یاد دہانیاں بند ہیں</p>
          <p className="text-amber-800/90">
            ترتیبات میں جا کر «قسط یاد دہانیاں» فعال کریں — {data.daysBefore} دن پہلے خودکار فہرست بنے گی۔
          </p>
          <Link href="/dashboard/settings">
            <Button type="button" variant="outline" size="sm" className="gap-1.5">
              <Settings className="h-4 w-4" />
              ترتیبات کھولیں
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card className="border-sky-100 bg-sky-50/50">
        <CardContent className="space-y-2 p-4 text-sm text-sky-950">
          <p className="font-medium">مفت یاد دہانی (2 دن پہلے)</p>
          <p className="text-sky-900/90 leading-relaxed">
            مکمل خودکار SMS (بغیر کلک) کے لیے paid SMS gateway چاہیے۔ مفت میں: نیچے فہرست خود بنتی ہے —
            «واٹس ایپ» یا «SMS» دبائیں، پیغام تیار ہو کر کھل جائے گا، بس «بھیجیں» دبائیں۔
          </p>
          {data?.targetDate ? (
            <p className="text-xs text-sky-800">
              ہدف تاریخ: <strong>{fmtDate(data.targetDate)}</strong> ({data.daysBefore} دن بعد)
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-600">
          {pendingItems.length} بھیجنی · {sentItems.length} بھیج دی
        </p>
        <div className="flex flex-wrap gap-2">
          {pendingItems.length > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                className="gap-1.5"
                disabled={Boolean(queue)}
                onClick={() => startBulkQueue('WHATSAPP')}
              >
                <MessageCircle className="h-4 w-4" />
                سب واٹس ایپ ({pendingItems.length})
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={Boolean(queue)}
                onClick={() => startBulkQueue('SMS')}
              >
                <Smartphone className="h-4 w-4" />
                سب SMS ({pendingItems.length})
              </Button>
            </>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تازہ کریں
          </Button>
        </div>
      </div>

      {queue && currentQueueRow ? (
        <Card className="border-emerald-200 bg-emerald-50/80 ring-1 ring-emerald-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-emerald-900">
                {queue.channel === 'WHATSAPP' ? 'واٹس ایپ قطار' : 'SMS قطار'} —{' '}
                {queue.index + 1} / {queue.items.length}
              </p>
              <p className="mt-0.5 font-urdu text-emerald-800">
                {currentQueueRow.customerName} · کھاتہ #{currentQueueRow.accountNumber}
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                پیغام بھیجنے کے بعد «اگلا» دبائیں
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" className="gap-1" onClick={() => void advanceQueue()}>
                <SkipForward className="h-4 w-4" />
                اگلا
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelQueue}>
                <X className="h-4 w-4" />
                روکیں
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        rowKey={(row) => row.scheduleId}
        loading={loading}
        pageSize={10}
        emptyTitle="اس تاریخ کے لیے کوئی یاد دہانی نہیں"
        emptyDescription="جس گاہک کی قسط 2 دن بعد واجب ہو اور موبائل درج ہو، وہ یہاں ظاہر ہوگا"
        searchKeys={(row) =>
          `${row.accountNumber} ${row.customerName} ${row.customerMobile ?? ''}`
        }
      />
    </div>
  );
}
