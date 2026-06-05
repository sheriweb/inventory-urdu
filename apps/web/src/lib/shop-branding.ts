export const DEFAULT_BRAND_COLOR = '#059669';

export const BRAND_PRESETS = [
  { hex: '#059669', label: 'سبز' },
  { hex: '#2563eb', label: 'نیلا' },
  { hex: '#7c3aed', label: 'جامنی' },
  { hex: '#db2777', label: 'گلابی' },
  { hex: '#d97706', label: 'نارنجی' },
  { hex: '#0891b2', label: 'فیروزئی' },
  { hex: '#dc2626', label: 'سرخ' },
  { hex: '#475569', label: 'سلیٹ' },
] as const;

export function normalizeBrandColor(value?: string | null): string {
  if (value && /^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return DEFAULT_BRAND_COLOR;
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export function applyShopBranding(brandColor?: string | null) {
  if (typeof document === 'undefined') return;
  const brand = normalizeBrandColor(brandColor);
  const rgb = hexToRgb(brand);
  document.documentElement.style.setProperty('--shop-brand', brand);
  document.documentElement.style.setProperty('--shop-brand-rgb', rgb);
}
