'use client';

import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type VoiceInputButtonProps = {
  listening?: boolean;
  disabled?: boolean;
  supported?: boolean;
  compact?: boolean;
  title?: string;
  onClick: () => void;
};

export function VoiceInputButton({
  listening = false,
  disabled,
  supported = true,
  compact = false,
  title = 'بول کر بھریں',
  onClick,
}: VoiceInputButtonProps) {
  if (!supported) return null;

  const btnClass = compact ? 'h-8 w-8' : 'h-11 w-11';
  const iconClass = compact ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <button
      type="button"
      title={listening ? 'بند کریں' : title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg border transition',
        btnClass,
        listening
          ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
          : 'border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
    >
      {listening ? <MicOff className={iconClass} /> : <Mic className={iconClass} />}
    </button>
  );
}
