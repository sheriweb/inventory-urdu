'use client';

import { useCallback, useEffect, useState } from 'react';
import { CloudUpload, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  discardAllOfflineSyncJobs,
  flushOfflineSyncQueue,
  getOfflineSyncQueue,
  getOfflineSyncQueueCount,
  type OfflineSyncJob,
} from '@/lib/offline-sync-queue';
import { formatOfflineDraftAge, isBrowserOnline } from '@/lib/offline-draft-queue';

export function OfflineSyncBanner() {
  const [jobs, setJobs] = useState<OfflineSyncJob[]>([]);
  const [online, setOnline] = useState(true);
  const [flushing, setFlushing] = useState(false);

  const refresh = useCallback(() => {
    setJobs(getOfflineSyncQueue());
    setOnline(isBrowserOnline());
  }, []);

  useEffect(() => {
    refresh();
    if (isBrowserOnline() && getOfflineSyncQueueCount() > 0) {
      void (async () => {
        setFlushing(true);
        try {
          await flushOfflineSyncQueue();
        } finally {
          setFlushing(false);
          refresh();
        }
      })();
    }

    function onQueueChanged() {
      refresh();
    }
    async function onOnline() {
      setOnline(true);
      if (getOfflineSyncQueueCount() === 0) return;
      setFlushing(true);
      try {
        await flushOfflineSyncQueue();
      } finally {
        setFlushing(false);
        refresh();
      }
    }
    function onOffline() {
      setOnline(false);
    }

    window.addEventListener('offline-sync-queue-changed', onQueueChanged);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('offline-sync-queue-changed', onQueueChanged);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refresh]);

  async function flushNow() {
    if (!isBrowserOnline() || getOfflineSyncQueueCount() === 0) return;
    setFlushing(true);
    try {
      await flushOfflineSyncQueue();
    } finally {
      setFlushing(false);
      refresh();
    }
  }

  if (jobs.length === 0) return null;

  const oldest = jobs[0]?.createdAt;

  return (
    <div className="no-print fixed bottom-20 left-4 right-4 z-[99997] mx-auto max-w-lg sm:left-auto sm:right-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 shadow-lg">
        <div className="flex min-w-0 items-start gap-2">
          {flushing ? (
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-sky-700" />
          ) : (
            <CloudUpload className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          )}
          <div>
            <p className="font-medium">
              {flushing
                ? 'آف لائن فارم بھیجے جا رہے ہیں…'
                : `${jobs.length} فارم بھیجنے کا انتظار`}
            </p>
            <p className="text-xs text-sky-800">
              {oldest ? `${formatOfflineDraftAge(oldest)} — ` : ''}
              {online ? 'آن لائن — خود بھیجا جائے گا' : 'آف لائن — انٹرنیٹ آنے پر بھیجا جائے گا'}
            </p>
            <ul className="mt-1 text-xs text-sky-900">
              {jobs.slice(0, 3).map((job) => (
                <li key={job.id}>• {job.label}</li>
              ))}
              {jobs.length > 3 ? <li>• +{jobs.length - 3} مزید</li> : null}
            </ul>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={flushing}
            onClick={() => {
              discardAllOfflineSyncJobs();
              refresh();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </Button>
          <Button type="button" size="sm" disabled={flushing || !online} onClick={() => void flushNow()}>
            ابھی بھیجیں
          </Button>
        </div>
      </div>
    </div>
  );
}
