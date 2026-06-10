'use client';

import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { openWhatsAppMessage } from '@/lib/whatsapp-messages';

type WhatsAppMessageButtonProps = {
  mobile?: string | null;
  message: string;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
};

export function WhatsAppMessageButton({
  mobile,
  message,
  label = 'واٹس ایپ',
  className,
  size = 'sm',
}: WhatsAppMessageButtonProps) {
  function handleClick() {
    const ok = openWhatsAppMessage(mobile, message);
    if (!ok) notify.error('موبائل نمبر درست نہیں');
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 font-medium text-emerald-800 transition hover:bg-emerald-100',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        className,
      )}
    >
      <MessageCircle className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      {label}
    </button>
  );
}
