'use client';

import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarcodeScannerModal } from '@/components/forms/barcode-scanner-modal';

type BarcodeScanButtonProps = {
  onScan: (value: string) => void;
  disabled?: boolean;
  compact?: boolean;
  title?: string;
  modalTitle?: string;
};

export function BarcodeScanButton({
  onScan,
  disabled,
  compact = false,
  title = 'بارکوڈ اسکین',
  modalTitle,
}: BarcodeScanButtonProps) {
  const [open, setOpen] = useState(false);
  const btnClass = compact ? 'h-8 w-8' : 'h-11 w-11';
  const iconClass = compact ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <>
      <button
        type="button"
        title={title}
        aria-label={title}
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 text-violet-700',
          btnClass,
          'transition hover:border-violet-300 hover:bg-violet-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40',
          'disabled:pointer-events-none disabled:opacity-50',
        )}
      >
        <ScanLine className={iconClass} />
      </button>

      <BarcodeScannerModal
        open={open}
        onClose={() => setOpen(false)}
        title={modalTitle ?? title}
        onScan={onScan}
      />
    </>
  );
}
