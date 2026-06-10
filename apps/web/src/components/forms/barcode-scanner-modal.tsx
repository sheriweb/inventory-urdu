'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  BrowserCodeReader,
  BrowserMultiFormatReader,
  type IScannerControls,
} from '@zxing/browser';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

type BarcodeScannerModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  onScan: (value: string) => void;
};

function normalizeScannedValue(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\s+/g, '');
  if (/^\d{10,20}$/.test(digits)) return digits;
  return trimmed;
}

function safeStopControls(controls: IScannerControls | null | undefined) {
  if (!controls?.stop) return;
  try {
    const result = controls.stop() as void | Promise<void>;
    if (result && typeof result.then === 'function') {
      void (result as Promise<void>).catch(() => {});
    }
  } catch {
    /* scanner already stopped */
  }
}

export function BarcodeScannerModal({
  open,
  onClose,
  title = 'بارکوڈ / QR اسکین',
  onScan,
}: BarcodeScannerModalProps) {
  const videoId = useId().replace(/:/g, '');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const cancelledRef = useRef(false);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(false);

  const stopScanner = useCallback(() => {
    cancelledRef.current = true;
    safeStopControls(controlsRef.current);
    controlsRef.current = null;

    const video = videoRef.current ?? document.getElementById(videoId);
    if (video instanceof HTMLVideoElement) {
      try {
        BrowserCodeReader.cleanVideoSource(video);
      } catch {
        /* video already removed */
      }
    }

    try {
      BrowserCodeReader.releaseAllStreams();
    } catch {
      /* ignore */
    }

    handledRef.current = false;
    setStarting(false);
  }, [videoId]);

  const handleClose = useCallback(() => {
    stopScanner();
    onClose();
  }, [onClose, stopScanner]);

  useEffect(() => {
    if (!open) {
      stopScanner();
      return;
    }

    cancelledRef.current = false;
    handledRef.current = false;
    setStarting(true);

    const reader = new BrowserMultiFormatReader();
    let active = true;

    void reader
      .decodeFromVideoDevice(undefined, videoId, (result, _error, controls) => {
        if (controls && !controlsRef.current) {
          controlsRef.current = controls;
        }
        if (!result || handledRef.current || cancelledRef.current) return;

        const value = normalizeScannedValue(result.getText());
        if (!value) return;

        handledRef.current = true;
        onScan(value);
        stopScanner();
        onClose();
        notify.saved('اسکین ہو گیا');
      })
      .then((controls) => {
        if (!active || cancelledRef.current) {
          safeStopControls(controls);
          return;
        }
        controlsRef.current = controls;
        setStarting(false);
      })
      .catch(() => {
        if (!cancelledRef.current) {
          notify.error('کیمرہ نہیں کھل سکا — اجازت دیں یا دستی درج کریں');
        }
        setStarting(false);
      });

    return () => {
      active = false;
      stopScanner();
    };
  }, [open, onClose, onScan, stopScanner, videoId]);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <Button type="button" variant="outline" onClick={handleClose}>
          بند کریں
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          IMEI یا بارکوڈ کیمرے کے سامنے رکھیں — خود بھر جائے گا
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
          <video
            ref={videoRef}
            id={videoId}
            className="aspect-video w-full object-cover"
            muted
            playsInline
          />
        </div>
        {starting ? <p className="text-center text-xs text-slate-500">کیمرہ شروع ہو رہا ہے…</p> : null}
      </div>
    </Modal>
  );
}
