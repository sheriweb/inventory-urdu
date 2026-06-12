'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, RefreshCw, SkipForward, Smartphone, Users, X, Zap } from 'lucide-react';
import api from '@/lib/api';
import { recordFromResponse } from '@/lib/api-response';
import { notify, getApiErrorMessage } from '@/lib/notify';
import { buildReminderMessage } from '@/lib/reminder-message';
import { smsHrefWithBody, whatsAppHrefWithText } from '@/lib/phone';
import { fmtDate, fmtMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertBanner } from '@/components/ui/alert-banner';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';

type BulkRow = {
  leaseAccountId: string;
  accountNumber: number;
  customerName: string;
  customerMobile: string;
  amount: number;
  dueDate: string;
  remainingBalance: number;
  shopName: string;
  messageTemplate: string;
};

type BulkPayload = {
  shopName: string;
  messageTemplate: string;
  items: BulkRow[];
};

type BulkQueue = {
  channel: 'WHATSAPP' | 'SMS';
  index: number;
  items: BulkRow[];
  afterWhatsAppSms?: boolean;
};

function buildMessage(row: BulkRow): string {
  return buildReminderMessage(row.messageTemplate, {
    name: row.customerName,
    shop: row.shopName,
    account: row.accountNumber,
    amount: row.amount,
    dueDate: row.dueDate,
  });
}

export function BulkCustomerMessagesPanel() {
  const [data, setData] = useState<BulkPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<BulkQueue | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/recovery/bulk-payment-messages');
      const payload = recordFromResponse<BulkPayload>(res);
      setData(payload);
    } catch (err) {
      setError(getApiErrorMessage(err, 'فہرست لوڈ نہیں ہو سکی'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const items = data?.items ?? [];
  const withMobile = useMemo(() => items.filter((r) => r.customerMobile?.trim()), [items]);

  function openChannel(row: BulkRow, channel: 'WHATSAPP' | 'SMS'): boolean {
    const text = buildMessage(row);
    if (channel === 'WHATSAPP') {
      const href = whatsAppHrefWithText(row.customerMobile, text);
      if (!href) {
        notify.error('واٹس ایپ کے لیے موبائل درست نہیں');
        return false;
      }
      window.open(href, '_blank', 'noopener,noreferrer');
      return true;
    }
    const href = smsHrefWithBody(row.customerMobile, text);
    if (!href) {
      notify.error('SMS کے لیے موبائل درست نہیں');
      return false;
    }
    window.location.href = href;
    return true;
  }

  function startBulkQueue(channel: 'WHATSAPP' | 'SMS', list = withMobile, afterWhatsAppSms = false) {
    if (list.length === 0) {
      notify.error('بھیجنے کے لیے کوئی گاہک نہیں');
      return;
    }
    setQueue({ channel, index: 0, items: list, afterWhatsAppSms });
    openChannel(list[0], channel);
  }

  function startOneClickBulk() {
    if (withMobile.length === 0) {
      notify.error('موبائل والے کوئی گاہک نہیں');
      return;
    }
    startBulkQueue('WHATSAPP', withMobile, true);
    notify.saved('پہلے واٹس ایپ — ختم ہونے پر SMS شروع ہو گی');
  }

  async function advanceQueue() {
    if (!queue) return;
    const nextIndex = queue.index + 1;
    if (nextIndex >= queue.items.length) {
      if (queue.channel === 'WHATSAPP' && queue.afterWhatsAppSms) {
        notify.saved('واٹس ایپ مکمل — اب SMS');
        startBulkQueue('SMS', queue.items, false);
        return;
      }
      setQueue(null);
      notify.saved('تمام پیغامات کھول دیے گئے');
      return;
    }
    const next = { ...queue, index: nextIndex };
    setQueue(next);
    openChannel(next.items[nextIndex], next.channel);
  }

  function cancelQueue() {
    setQueue(null);
  }

  const currentRow = queue ? queue.items[queue.index] : null;

  const columns: DataTableColumn<BulkRow>[] = [
    {
      id: 'account',
      header: 'کھاتہ',
      cell: (row) => <span className="font-medium">#{row.accountNumber}</span>,
    },
    { id: 'name', header: 'گاہک', cell: (row) => row.customerName },
    {
      id: 'mobile',
      header: 'موبائل',
      cell: (row) => (
        <span dir="ltr" className="font-mono text-xs">
          {row.customerMobile}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'واجب',
      cell: (row) => (
        <span dir="ltr">
          {fmtMoney(row.amount)}
          {row.remainingBalance > row.amount ? (
            <span className="block text-xs text-slate-500">کل: {fmtMoney(row.remainingBalance)}</span>
          ) : null}
        </span>
      ),
    },
    {
      id: 'due',
      header: 'تاریخ',
      cell: (row) => fmtDate(row.dueDate),
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => openChannel(row, 'WHATSAPP')}>
            <MessageCircle className="h-3 w-3" />
            WA
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" onClick={() => openChannel(row, 'SMS')}>
            <Smartphone className="h-3 w-3" />
            SMS
          </Button>
        </div>
      ),
    },
  ];

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-500">تمام گاہکوں کی فہرست لوڈ…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card className="border-violet-100 bg-violet-50/40">
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-medium text-violet-950">
                <Users className="h-4 w-4" />
                تمام فعال گاہک — قسط کا پیغام
              </p>
              <p className="mt-1 text-sm leading-relaxed text-violet-900/90">
                ایک کلک: پہلے سب کو واٹس ایپ، پھر خودکار SMS قطار۔ ہر پیغام تیار ہو کر کھلے گا — بس «بھیجیں» دبائیں۔
              </p>
            </div>
            <Badge variant="muted">{withMobile.length} موبائل والے</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="gap-1.5" disabled={Boolean(queue) || withMobile.length === 0} onClick={startOneClickBulk}>
              <Zap className="h-4 w-4" />
              ایک کلک (WA + SMS)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={Boolean(queue) || withMobile.length === 0}
              onClick={() => startBulkQueue('WHATSAPP')}
            >
              <MessageCircle className="h-4 w-4" />
              سب واٹس ایپ ({withMobile.length})
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              disabled={Boolean(queue) || withMobile.length === 0}
              onClick={() => startBulkQueue('SMS')}
            >
              <Smartphone className="h-4 w-4" />
              سب SMS ({withMobile.length})
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={load} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              تازہ
            </Button>
          </div>
        </CardContent>
      </Card>

      {queue && currentRow ? (
        <Card className="border-emerald-200 bg-emerald-50/80 ring-1 ring-emerald-100">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 text-sm">
              <p className="font-medium text-emerald-900">
                {queue.channel === 'WHATSAPP' ? 'واٹس ایپ' : 'SMS'} — {queue.index + 1} / {queue.items.length}
                {queue.afterWhatsAppSms && queue.channel === 'WHATSAPP' ? ' (پھر SMS)' : ''}
              </p>
              <p className="mt-0.5 font-urdu text-emerald-800">
                {currentRow.customerName} · #{currentRow.accountNumber}
              </p>
              <p className="mt-1 text-xs text-emerald-700">بھیجنے کے بعد «اگلا» دبائیں</p>
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
        data={items}
        columns={columns}
        rowKey={(row) => row.leaseAccountId}
        loading={loading}
        pageSize={15}
        emptyTitle="کوئی فعال کھاتہ نہیں"
        emptyDescription="سب قسطیں ادا یا موبائل نمبر نہیں"
      />
    </div>
  );
}
