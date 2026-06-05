'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info, Trash2, Pencil, PlusCircle, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info' | 'created' | 'updated' | 'deleted';

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

function emit() {
  listeners.forEach((fn) => fn([...toasts]));
}

function push(type: ToastType, title: string, message?: string) {
  const id = `toast-${++counter}`;
  toasts = [{ id, type, title, message }, ...toasts].slice(0, 5);
  emit();
  window.setTimeout(() => dismiss(id), 3800);
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (title: string, message?: string) => push('success', title, message),
  error: (title: string, message?: string) => push('error', title, message),
  info: (title: string, message?: string) => push('info', title, message),
  created: (title: string, message?: string) => push('created', title, message),
  updated: (title: string, message?: string) => push('updated', title, message),
  deleted: (title: string, message?: string) => push('deleted', title, message),
  dismiss,
};

const styles: Record<ToastType, { ring: string; bg: string; icon: React.ReactNode }> = {
  success: {
    ring: 'ring-emerald-200',
    bg: 'from-emerald-50 to-white',
    icon: <CheckCircle2 className="h-6 w-6 text-emerald-600" />,
  },
  created: {
    ring: 'ring-emerald-200',
    bg: 'from-emerald-50 to-white',
    icon: <PlusCircle className="h-6 w-6 text-emerald-600" />,
  },
  updated: {
    ring: 'ring-sky-200',
    bg: 'from-sky-50 to-white',
    icon: <Pencil className="h-6 w-6 text-sky-600" />,
  },
  deleted: {
    ring: 'ring-amber-200',
    bg: 'from-amber-50 to-white',
    icon: <Trash2 className="h-6 w-6 text-amber-600" />,
  },
  error: {
    ring: 'ring-red-200',
    bg: 'from-red-50 to-white',
    icon: <XCircle className="h-6 w-6 text-red-600" />,
  },
  info: {
    ring: 'ring-slate-200',
    bg: 'from-slate-50 to-white',
    icon: <Info className="h-6 w-6 text-slate-600" />,
  },
};

export function ToastProvider() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed left-4 right-4 top-4 z-[99999] mx-auto flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 sm:left-4 sm:right-auto max-sm:bottom-20 max-sm:top-auto"
      aria-live="polite"
    >
      {items.map((item) => {
        const style = styles[item.type];
        return (
          <div
            key={item.id}
            role="alert"
            className={cn(
              'pointer-events-auto toast-enter overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-l shadow-xl shadow-black/10 ring-1',
              style.bg,
              style.ring,
            )}
          >
            <div className="flex items-start gap-3 p-4">
              <div className="mt-0.5 shrink-0 rounded-full bg-white/80 p-1 shadow-sm">{style.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">{item.title}</p>
                {item.message ? <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{item.message}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => toast.dismiss(item.id)}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-white/70 hover:text-slate-700"
                aria-label="بند کریں"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="h-1 w-full bg-slate-100">
              <div className="toast-progress h-full bg-emerald-500/70" />
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
