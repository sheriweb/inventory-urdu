'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { VoiceInputButton } from '@/components/forms/voice-input-button';
import { useSpeechInput } from '@/hooks/use-speech-input';
import type { SpeechInputMode } from '@/lib/speech-text';
import { notify } from '@/lib/notify';

type InputWithVoiceProps = React.InputHTMLAttributes<HTMLInputElement> & {
  voiceMode?: SpeechInputMode;
  showVoice?: boolean;
  compact?: boolean;
  voiceTitle?: string;
};

export const InputWithVoice = React.forwardRef<HTMLInputElement, InputWithVoiceProps>(
  (
    {
      className,
      voiceMode = 'number',
      showVoice = true,
      compact = false,
      voiceTitle = 'بول کر بھریں',
      disabled,
      onChange,
      ...props
    },
    ref,
  ) => {
    const handleVoiceResult = React.useCallback(
      (value: string) => {
        if (!onChange) return;
        onChange({
          target: { value },
        } as React.ChangeEvent<HTMLInputElement>);
      },
      [onChange],
    );

    const speech = useSpeechInput({
      mode: voiceMode,
      onResult: handleVoiceResult,
      onError: (msg) => notify.error(msg),
    });

    if (!showVoice || !speech.supported) {
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
        <VoiceInputButton
          listening={speech.listening}
          supported={speech.supported}
          disabled={disabled}
          compact={compact}
          title={voiceTitle}
          onClick={speech.toggle}
        />
      </div>
    );
  },
);
InputWithVoice.displayName = 'InputWithVoice';
