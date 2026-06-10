'use client';

import { MessageCircle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { telHref, whatsAppSendHref } from '@/lib/phone';

type PhoneActionsProps = {
  mobile?: string | null;
  additionalMobiles?: string[];
  className?: string;
  compact?: boolean;
};

function PhoneLine({ mobile, compact }: { mobile: string; compact?: boolean }) {
  const tel = telHref(mobile);
  const wa = whatsAppSendHref(mobile);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {tel ? (
        <a
          href={tel}
          dir="ltr"
          className="inline-flex items-center gap-1 rounded-md text-sm font-medium text-emerald-700 hover:underline"
        >
          <Phone className="h-3.5 w-3.5 shrink-0" />
          {mobile}
        </a>
      ) : (
        <span dir="ltr" className="text-sm">
          {mobile}
        </span>
      )}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100',
            compact && 'px-1.5',
          )}
        >
          <MessageCircle className="h-3 w-3" />
          واٹس ایپ
        </a>
      ) : null}
    </span>
  );
}

export function PhoneActions({
  mobile,
  additionalMobiles = [],
  className,
  compact = false,
}: PhoneActionsProps) {
  const phones = [
    mobile?.trim() ?? '',
    ...additionalMobiles.map((m) => m.trim()).filter(Boolean),
  ].filter((v, i, arr) => v && arr.indexOf(v) === i);

  if (phones.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  return (
    <span className={cn('flex flex-col gap-1', className)}>
      {phones.map((phone) => (
        <PhoneLine key={phone} mobile={phone} compact={compact} />
      ))}
    </span>
  );
}
