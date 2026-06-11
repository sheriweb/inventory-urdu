/** Safe parsing for Nest API envelopes: { message, data, meta? } */

export type ApiEnvelope<T = unknown> = {
  message?: string;
  data?: T;
  meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
};

export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord<T extends object>(value: unknown): T | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as T;
  }
  return null;
}

export function listFromResponse<T>(response: { data?: ApiEnvelope<T[]> | T[] }): {
  rows: T[];
  total: number;
} {
  const body = response.data;
  if (Array.isArray(body)) {
    return { rows: body as T[], total: body.length };
  }
  const rows = asArray<T>(body?.data);
  const total = typeof body?.meta?.total === 'number' ? body.meta.total : rows.length;
  return { rows, total };
}

export function recordFromResponse<T extends object>(response: {
  data?: ApiEnvelope<T> | T;
}): T | null {
  const body = response.data;
  if (body && typeof body === 'object' && 'data' in body) {
    return asRecord<T>((body as ApiEnvelope<T>).data);
  }
  return asRecord<T>(body);
}
