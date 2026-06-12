'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { romanToUrdu } from '@/lib/roman-to-urdu';
import { VoiceInputButton } from '@/components/forms/voice-input-button';
import { useSpeechInput } from '@/hooks/use-speech-input';
import { notify } from '@/lib/notify';
import { useRomanUrduEnabled } from '@/lib/roman-urdu-settings';

type UrduNameInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  showRomanHelper?: boolean;
  showVoice?: boolean;
};

export function UrduNameInput({
  value,
  onChange,
  showRomanHelper,
  showVoice = true,
  className,
  disabled,
  ...props
}: UrduNameInputProps) {
  const shopRomanUrdu = useRomanUrduEnabled();
  const showHelper = showRomanHelper !== undefined ? showRomanHelper : shopRomanUrdu;
  const [roman, setRoman] = React.useState('');
  const preview = React.useMemo(() => romanToUrdu(roman), [roman]);
  const compact = Boolean(className?.includes('h-8'));

  const speech = useSpeechInput({
    mode: 'roman-urdu',
    onResult: (text) => onChange(text),
    onError: (msg) => notify.error(msg),
  });

  function applyPreview() {
    if (preview.trim()) {
      onChange(preview);
      setRoman('');
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn('min-w-0 flex-1 font-urdu text-base leading-8', className)}
          {...props}
        />
        {showVoice && speech.supported ? (
          <VoiceInputButton
            listening={speech.listening}
            supported={speech.supported}
            disabled={disabled}
            compact={compact}
            title="نام بولیں (رومن)"
            onClick={speech.toggle}
          />
        ) : null}
      </div>
      {showHelper ? (
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
