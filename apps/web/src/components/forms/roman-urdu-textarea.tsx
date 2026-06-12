'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { romanToUrdu } from '@/lib/roman-to-urdu';

type RomanUrduTextareaProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
  showRomanHelper?: boolean;
};

export function RomanUrduTextarea({
  value,
  onChange,
  className,
  rows = 3,
  placeholder,
  disabled,
  showRomanHelper = true,
}: RomanUrduTextareaProps) {
  const [roman, setRoman] = React.useState('');
  const preview = React.useMemo(() => romanToUrdu(roman), [roman]);

  function applyPreview() {
    if (!preview.trim()) return;
    onChange(preview);
    setRoman('');
  }

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className={cn('font-urdu text-base leading-7', className)}
      />
      {showRomanHelper ? (
        <div className="rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 p-2.5">
          <p className="mb-1.5 text-xs text-slate-500">انگریزی / رومن لکھیں → اردو (مفت)</p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={roman}
              onChange={(e) => setRoman(e.target.value)}
              placeholder="e.g. Main Bazar Lahore"
              dir="ltr"
              disabled={disabled}
              className="min-w-[10rem] flex-1 text-left font-sans text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyPreview();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={applyPreview} disabled={!preview.trim() || disabled}>
              اردو استعمال کریں
            </Button>
          </div>
          {preview ? <p className="mt-1.5 text-sm font-urdu leading-7 text-emerald-900">{preview}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
