'use client';

import { CloudOff, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatOfflineDraftAge, isBrowserOnline } from '@/lib/offline-draft-queue';

type OfflineDraftRestoreBannerProps = {
  label: string;
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
};

export function OfflineDraftRestoreBanner({
  label,
  savedAt,
  onRestore,
  onDiscard,
}: OfflineDraftRestoreBannerProps) {
  const online = isBrowserOnline();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="flex min-w-0 items-start gap-2">
        <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-amber-800">
            {formatOfflineDraftAge(savedAt)} محفوظ — {online ? 'آن لائن' : 'آف لائن موڈ'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button type="button" size="sm" variant="outline" className="gap-1" onClick={onDiscard}>
          <Trash2 className="h-3.5 w-3.5" />
          حذف
        </Button>
        <Button type="button" size="sm" className="gap-1" onClick={onRestore}>
          <RotateCcw className="h-3.5 w-3.5" />
          بحال کریں
        </Button>
      </div>
    </div>
  );
}
