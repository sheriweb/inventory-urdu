import { AxiosError } from 'axios';
import { toast } from '@/components/ui/toast';

export function getApiErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AxiosError) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message) && message[0]) return String(message[0]);
  }
  return fallback;
}

export const notify = {
  created(entity: string, detail?: string) {
    toast.created(`${entity} شامل ہو گیا`, detail);
  },
  updated(entity: string, detail?: string) {
    toast.updated(`${entity} اپڈیٹ ہو گیا`, detail);
  },
  deleted(entity: string, detail?: string) {
    toast.deleted(`${entity} حذف ہو گیا`, detail);
  },
  saved(message = 'کامیابی سے محفوظ ہو گیا') {
    toast.success(message);
  },
  error(message: string) {
    toast.error('خرابی', message);
  },
  fail(action: string, err?: unknown, fallback?: string) {
    toast.error(`${action} نہیں ہو سکا`, getApiErrorMessage(err, fallback ?? 'دوبارہ کوشش کریں'));
  },
};
