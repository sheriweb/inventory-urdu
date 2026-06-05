/** Normalize Pakistani mobile for tel:/WhatsApp links */
export function normalizePakPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('03')) return digits;
  if (digits.length === 12 && digits.startsWith('923')) return `0${digits.slice(2)}`;
  if (digits.length === 10 && digits.startsWith('3')) return `0${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

export function telHref(mobile: string): string | null {
  const n = normalizePakPhone(mobile);
  return n ? `tel:${n}` : null;
}

export function whatsAppHref(mobile: string): string | null {
  const n = normalizePakPhone(mobile);
  if (!n) return null;
  const intl = n.startsWith('0') ? `92${n.slice(1)}` : n;
  return `https://wa.me/${intl}`;
}

export function whatsAppHrefWithText(mobile: string, text: string): string | null {
  const base = whatsAppHref(mobile);
  if (!base) return null;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function smsHrefWithBody(mobile: string, body: string): string | null {
  const n = normalizePakPhone(mobile);
  if (!n) return null;
  return `sms:${n}?body=${encodeURIComponent(body)}`;
}
