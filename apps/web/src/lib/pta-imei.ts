/** PTA / mobile IMEI verification helpers (Pakistan) */

export const PTA_DIRBS_URL = 'https://dirbs.pta.gov.pk/';
export const PTA_DVS_ANDROID =
  'https://play.google.com/store/apps/details?id=pk.gov.pta.dvs';
export const PTA_DVS_IOS = 'https://apps.apple.com/app/pta-device-verification/id6449254694';

/** Client shops often say "Selmo" — link PTA official app for IMEI check */
export const SELMO_PTA_APP_LABEL = 'Selmo / PTA ایپ';

export function normalizeImei(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 15) return null;
  return digits.slice(0, 15);
}

/** SMS IMEI to 8484 for PTA status (standard PK method) */
export function pta8484SmsHref(imei: string): string | null {
  const normalized = normalizeImei(imei);
  if (!normalized) return null;
  return `sms:8484?body=${encodeURIComponent(normalized)}`;
}

/** Open phone dialer for *#06# to show IMEI on device */
export function showImeiDialHref(): string {
  return 'tel:*%2306%23';
}
