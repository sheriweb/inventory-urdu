'use client';

import * as React from 'react';
import { ChevronDown, Plus, Search, User } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QuickAddModal } from '@/components/forms/quick-add-modal';
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
  placeholder = 'نام یا موبائل سے تلاش…',
  disabled,
}: CustomerSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<CustomerOption[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [recent, setRecent] = React.useState<CustomerOption[]>([]);
  const [addOpen, setAddOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState('');
  const debouncedQ = useDebounce(query, 280);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setRecent(getRecentCustomers());
  }, []);

  React.useEffect(() => {
    if (!value) {
      setSelectedLabel('');
      return;
    }
    const fromRecent = recent.find((c) => c.id === value);
    if (fromRecent) {
      setSelectedLabel(formatLabel(fromRecent));
      return;
    }
    const fromResults = results.find((c) => c.id === value);
    if (fromResults) {
      setSelectedLabel(formatLabel(fromResults));
    }
  }, [value, recent, results]);

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
        setResults(data.data as CustomerOption[]);
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
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function selectCustomer(customer: CustomerOption) {
    rememberCustomer(customer);
    setRecent(getRecentCustomers());
    setSelectedLabel(formatLabel(customer));
    onChange(customer.id);
    setOpen(false);
    setQuery('');
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

  return (
    <>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'form-control-input flex h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm shadow-sm',
            'focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <span className={cn('truncate font-urdu text-base', !selectedLabel && 'font-sans text-slate-400')}>
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
        <input type="hidden" value={value} required={required} />

        {open ? (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-slate-900/5">
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="نام، موبائل…"
                  className="pr-9"
                  autoFocus
                />
              </div>
            </div>

            {!debouncedQ.trim() && recentFiltered.length > 0 ? (
              <p className="px-3 pt-2 text-[11px] font-medium text-slate-400">حالیہ / اکثر استعمال</p>
            ) : null}

            <ul className="max-h-56 overflow-y-auto py-1">
              {loading ? (
                <li className="px-3 py-3 text-center text-sm text-slate-500">تلاش…</li>
              ) : listItems.length === 0 ? (
                <li className="px-3 py-3 text-center text-sm text-slate-500">کوئی گاہک نہیں ملا</li>
              ) : (
                listItems.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2.5 text-start text-sm hover:bg-emerald-50',
                        value === c.id && 'bg-emerald-50/80',
                      )}
                      onClick={() => selectCustomer(c)}
                    >
                      <User className="h-4 w-4 shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate font-urdu">{formatLabel(c)}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="border-t border-slate-100 p-2">
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                نیا گاہک شامل کریں
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <QuickAddModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        entity="customer"
        onCreated={(record) => {
          const customer = record as CustomerOption;
          onCustomerAdded?.(customer);
          selectCustomer(customer);
        }}
      />
    </>
  );
}
