'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { VoiceInputButton } from '@/components/forms/voice-input-button';
import { BarcodeScanButton } from '@/components/forms/barcode-scan-button';
import { useSpeechInput } from '@/hooks/use-speech-input';
import { notify } from '@/lib/notify';
import type { SpeechInputMode } from '@/lib/speech-text';

type IdentifierFieldInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  voiceMode?: SpeechInputMode;
  showVoice?: boolean;
  showScan?: boolean;
  compact?: boolean;
  voiceTitle?: string;
  scanTitle?: string;
};

export const IdentifierFieldInput = React.forwardRef<HTMLInputElement, IdentifierFieldInputProps>(
  (
    {
      className,
      voiceMode = 'number',
      showVoice = true,
      showScan = true,
      compact = false,
      voiceTitle = 'بول کر بھریں',
      scanTitle = 'بارکوڈ اسکین',
      disabled,
      onChange,
      ...props
    },
    ref,
  ) => {
    const setValue = React.useCallback(
      (value: string) => {
        onChange?.({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
      },
      [onChange],
    );

    const speech = useSpeechInput({
      mode: voiceMode,
      onResult: setValue,
      onError: (msg) => notify.error(msg),
    });

    const hasActions = (showVoice && speech.supported) || showScan;

    if (!hasActions) {
      return <Input ref={ref} className={className} disabled={disabled} onChange={onChange} {...props} />;
    }

    return (
      <div className="flex items-stretch gap-2">
        <Input
          ref={ref}
          className={cn('min-w-0 flex-1', className)}
          disabled={disabled}
          onChange={onChange}
          {...props}
        />
        {showScan ? (
          <BarcodeScanButton
            disabled={disabled}
            compact={compact}
            title={scanTitle}
            modalTitle={scanTitle}
            onScan={setValue}
          />
        ) : null}
        {showVoice && speech.supported ? (
          <VoiceInputButton
            listening={speech.listening}
            supported={speech.supported}
            disabled={disabled}
            compact={compact}
            title={voiceTitle}
            onClick={speech.toggle}
          />
        ) : null}
      </div>
    );
  },
);
IdentifierFieldInput.displayName = 'IdentifierFieldInput';
