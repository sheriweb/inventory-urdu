'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { romanToUrdu } from '@/lib/roman-to-urdu';

type UrduNameInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  showRomanHelper?: boolean;
};

export function UrduNameInput({
  value,
  onChange,
  showRomanHelper = true,
  className,
  ...props
}: UrduNameInputProps) {
  const [roman, setRoman] = React.useState('');
  const preview = React.useMemo(() => romanToUrdu(roman), [roman]);

  function applyPreview() {
    if (preview.trim()) {
      onChange(preview);
      setRoman('');
    }
  }

  return (
    <div className="space-y-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn('font-urdu text-base leading-8', className)}
        {...props}
      />
      {showRomanHelper ? (
        <div className="rounded-lg border border-dashed border-emerald-200/80 bg-emerald-50/40 p-2.5">
          <p className="mb-1.5 text-xs text-slate-500">رومن سے اردو (مفت — انٹرنیٹ نہیں چاہیے)</p>
          <div className="flex flex-wrap gap-2">
            <Input
              value={roman}
              onChange={(e) => setRoman(e.target.value)}
              placeholder="مثلاً Muhammad Umar"
              dir="ltr"
              className="min-w-[10rem] flex-1 text-left font-sans"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyPreview();
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={applyPreview} disabled={!preview.trim()}>
              نام استعمال کریں
            </Button>
          </div>
          {preview ? <p className="mt-1.5 text-sm font-urdu leading-7 text-emerald-900">{preview}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
