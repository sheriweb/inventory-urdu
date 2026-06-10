export type CustomerFieldPresetKey = 'caste' | 'profession' | 'city';

const STORAGE_PREFIX = 'inventory-customer-presets-';
const MAX_PRESETS = 40;

function storageKey(key: CustomerFieldPresetKey): string {
  return `${STORAGE_PREFIX}${key}`;
}

export function getCustomerFieldPresets(key: CustomerFieldPresetKey): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed)
      ? parsed.filter((v) => typeof v === 'string' && v.trim()).slice(0, MAX_PRESETS)
      : [];
  } catch {
    return [];
  }
}

export function addCustomerFieldPreset(key: CustomerFieldPresetKey, value: string): string[] {
  const trimmed = value.trim();
  if (!trimmed || typeof localStorage === 'undefined') {
    return getCustomerFieldPresets(key);
  }
  const next = [trimmed, ...getCustomerFieldPresets(key).filter((v) => v !== trimmed)].slice(
    0,
    MAX_PRESETS,
  );
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(next));
  } catch {
    /* storage blocked */
  }
  return next;
}

export function mergeCustomerFieldPresets(
  key: CustomerFieldPresetKey,
  values: Iterable<string | null | undefined>,
): string[] {
  const existing = new Set(getCustomerFieldPresets(key));
  for (const raw of values) {
    const v = raw?.trim();
    if (v) existing.add(v);
  }
  const next = [...existing].slice(0, MAX_PRESETS);
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}
