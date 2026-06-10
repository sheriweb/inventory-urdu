/** Normalize Pakistani mobile for tel:/WhatsApp links */
export function normalizePakPhone(raw: string): string | null {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('0092') && digits.length >= 12) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith('3')) return `0${digits}`;
  if (digits.length === 11 && digits.startsWith('03')) return digits;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

/** International digits for WhatsApp (no + sign) — e.g. 923001234567 */
export function whatsAppIntlPhone(mobile: string): string | null {
  const n = normalizePakPhone(mobile);
  if (!n) return null;
  return n.startsWith('0') ? `92${n.slice(1)}` : n;
}

export function telHref(mobile: string): string | null {
  const n = normalizePakPhone(mobile);
  return n ? `tel:${n}` : null;
}

/** Opens chat with unsaved numbers — api.whatsapp.com works on mobile + desktop */
export function whatsAppSendHref(mobile: string, text?: string): string | null {
  const intl = whatsAppIntlPhone(mobile);
  if (!intl) return null;
  const base = `https://api.whatsapp.com/send?phone=${intl}`;
  if (!text?.trim()) return base;
  return `${base}&text=${encodeURIComponent(text)}`;
}

export function whatsAppHref(mobile: string): string | null {
  const intl = whatsAppIntlPhone(mobile);
  return intl ? `https://wa.me/${intl}` : null;
}

export function whatsAppHrefWithText(mobile: string, text: string): string | null {
  return whatsAppSendHref(mobile, text);
}

/** Share text only — user picks contact in WhatsApp */
export function whatsAppShareTextHref(text: string): string {
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
}

export function smsHrefWithBody(mobile: string, body: string): string | null {
  const n = normalizePakPhone(mobile);
  if (!n) return null;
  return `sms:${n}?body=${encodeURIComponent(body)}`;
}
