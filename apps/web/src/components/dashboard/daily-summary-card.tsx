'use client';

import { useState } from 'react';
import { Copy, MessageCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notify } from '@/lib/notify';
import { whatsAppShareTextHref } from '@/lib/phone';

type DailySummaryCardProps = {
  paragraph: string;
  loading?: boolean;
  onRefresh?: () => void;
};

export function DailySummaryCard({ paragraph, loading, onRefresh }: DailySummaryCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!paragraph) return;
    try {
      await navigator.clipboard.writeText(paragraph);
      setCopied(true);
      notify.saved('خلاصہ کاپی ہو گیا');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error('کاپی نہیں ہو سکی');
    }
  }

  function handleWhatsAppShare() {
    if (!paragraph) return;
    const href = whatsAppShareTextHref(paragraph);
    const isMobile =
      typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.assign(href);
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }

  return (
    <Card className="border-emerald-100 bg-gradient-to-l from-emerald-50/60 via-white to-white">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">روزانہ خلاصہ</p>
            <p className="text-xs text-slate-500">وصولی، تاخیر، کل کی ہدف — ایک نظر میں</p>
          </div>
          <div className="flex gap-2">
            {onRefresh ? (
              <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                تازہ
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => void handleCopy()} disabled={!paragraph || loading}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'کاپی!' : 'کاپی'}
            </Button>
            <Button type="button" size="sm" className="gap-1" onClick={handleWhatsAppShare} disabled={!paragraph || loading}>
              <MessageCircle className="h-3.5 w-3.5" />
              واٹس ایپ
            </Button>
          </div>
        </div>
        <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white/80 p-4 font-urdu text-sm leading-relaxed text-slate-800">
          {loading ? 'لوڈ ہو رہا ہے…' : paragraph || '—'}
        </pre>
      </CardContent>
    </Card>
  );
}
