/** Parse API/storage additional mobiles */
export function parseAdditionalMobiles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function sanitizeAdditionalMobiles(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function allCustomerMobiles(primary: string, additional: string[]): string[] {
  const list = [primary.trim(), ...additional.map((m) => m.trim())].filter(Boolean);
  return [...new Set(list)];
}
