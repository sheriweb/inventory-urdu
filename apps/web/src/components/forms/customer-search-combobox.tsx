'use client';

import * as React from 'react';
import { Plus, Search, User, X } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { getRecentCustomers, rememberCustomer } from '@/lib/recent-customers';
import { useDebounce } from '@/hooks/use-debounce';

export type CustomerOption = {
  id: string;
  name: string;
  mobile?: string | null;
  fatherOrHusbandName?: string | null;
};

type CustomerSearchComboboxProps = {
  value: string;
  onChange: (customerId: string) => void;
  onCustomerAdded?: (customer: CustomerOption) => void;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

function formatLabel(c: CustomerOption): string {
  const mobile = c.mobile ? ` — ${c.mobile}` : '';
  return `${c.name}${mobile}`;
}

export function CustomerSearchCombobox({
  value,
  onChange,
  onCustomerAdded,
  required,
  placeholder = 'گاہک تلاش کریں (نام یا موبائل)',
  disabled,
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<CustomerOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<CustomerOption[]>([]);
  const [selected, setSelected] = React.useState<CustomerOption | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const debouncedQ = useDebounce(query, 280);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setRecent(getRecentCustomers());
  }, []);

  React.useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    if (selected?.id === value) return;
    const fromRecent = recent.find((c) => c.id === value);
    if (fromRecent) {
      setSelected(fromRecent);
      return;
    }
    const fromResults = results.find((c) => c.id === value);
    if (fromResults) {
      setSelected(fromResults);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/customers/${value}`);
        if (active && data.data) setSelected(data.data as CustomerOption);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      active = false;
    };
  }, [value, recent, results, selected?.id]);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const params: Record<string, string | number> = { limit: 20, page: 1 };
        if (debouncedQ.trim()) params.q = debouncedQ.trim();
        const { data } = await api.get('/customers', { params });
        if (!active) return;
        setResults(Array.isArray(data.data) ? (data.data as CustomerOption[]) : []);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [open, debouncedQ]);

  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        if (selected) setQuery('');
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [selected]);

  function selectCustomer(customer: CustomerOption) {
    rememberCustomer(customer);
    setRecent(getRecentCustomers());
    setSelected(customer);
    onChange(customer.id);
    setQuery('');
    setOpen(false);
  }

  function clearSelection() {
    setSelected(null);
    onChange('');
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const recentFiltered = recent.filter((c) => {
    if (!debouncedQ.trim()) return true;
    const q = debouncedQ.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.mobile ?? '').includes(q) ||
      c.id === value
    );
  });

  const listItems = debouncedQ.trim()
    ? results
    : [...recentFiltered, ...results.filter((r) => !recentFiltered.some((x) => x.id === r.id))].slice(0, 20);

  const showDropdown = open && !disabled;

  return (
    <>
      <div ref={rootRef} className="relative min-w-0 w-full max-w-full">
        {selected && !open ? (
          <div
            className={cn(
              'box-border flex h-11 w-full max-w-full items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50/50 px-3 text-sm shadow-sm',
              disabled && 'cursor-not-allowed opacity-50',
            )}
          >
            <User className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 truncate font-urdu text-base text-slate-900">{formatLabel(selected)}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
                aria-label="گاہک بدلیں"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="relative min-w-0 w-full">
            <Search className="pointer-events-none absolute end-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              disabled={disabled}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              dir="auto"
              className={cn(
                'box-border h-11 w-full max-w-full rounded-lg border border-slate-300 bg-white py-2 ps-3 pe-10 text-sm text-slate-900 shadow-sm',
                'font-sans placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              autoComplete="off"
            />
          </div>
        )}

        <input type="hidden" name="customerId" value={value} required={required} />

        {showDropdown ? (
          <div className="absolute inset-x-0 z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
            {!debouncedQ.trim() && recentFiltered.length > 0 ? (
              <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-medium text-slate-400">حالیہ گاہک</p>
            ) : null}

            <ul className="max-h-52 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-3 text-center text-sm text-slate-500">تلاش…</li>
              ) : listItems.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-slate-500">
                  {debouncedQ.trim() ? 'کوئی گاہک نہیں ملا' : 'نام یا موبائل لکھیں'}
                </li>
              ) : (
                listItems.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm transition hover:bg-emerald-50',
                        value === c.id && 'bg-emerald-50/80',
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectCustomer(c)}
                    >
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-urdu text-base text-slate-900">{c.name}</span>
                        {c.mobile ? (
                          <span className="block truncate font-sans text-xs text-slate-500" dir="ltr">
                            {c.mobile}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t border-slate-100 p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setOpen(false);
                  router.push(
                    `/dashboard/customers/new?returnTo=${encodeURIComponent(pathname)}`,
                  );
                }}
              >
                <Plus className="h-4 w-4" />
                نیا گاہک شامل کریں
              </Button>
            </div>
          </div>
        ) : null}
      </div>

    </>
  );
}
