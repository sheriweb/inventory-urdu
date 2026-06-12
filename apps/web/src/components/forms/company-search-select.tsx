'use client';

import * as React from 'react';
import { Building2, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CompanyQuickAddModal } from '@/components/forms/leaf-quick-add-modals';
import type { Company } from '@inventory-urdu/shared';

type CompanySearchSelectProps = {
  companies: Company[];
  value: string;
  onChange: (companyId: string) => void;
  onCompanyAdded?: (company: Company) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

export function CompanySearchSelect({
  companies,
  value,
  onChange,
  onCompanyAdded,
  required,
  disabled,
  placeholder = 'کمپنی تلاش کریں',
}: CompanySearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [addOpen, setAddOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const validCompanies = React.useMemo(
    () => companies.filter((company): company is Company => Boolean(company?.id && company?.name)),
    [companies],
  );

  const selected = React.useMemo(
    () => validCompanies.find((company) => company.id === value) ?? null,
    [validCompanies, value],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return validCompanies;
    return validCompanies.filter((company) => company.name.toLowerCase().includes(q));
  }, [validCompanies, query]);

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

  function selectCompany(company: Company) {
    onChange(company.id);
    setQuery('');
    setOpen(false);
  }

  function clearSelection() {
    onChange('');
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleCreated(company: Company) {
    if (!company?.id) return;
    onCompanyAdded?.(company);
    onChange(company.id);
    setAddOpen(false);
  }

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
            <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="min-w-0 flex-1 truncate font-urdu text-base text-slate-900">{selected.name}</span>
            {!disabled ? (
              <button
                type="button"
                onClick={clearSelection}
                className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-600"
                aria-label="کمپنی بدلیں"
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
              required={required && !value}
              className={cn(
                'box-border h-11 w-full max-w-full rounded-lg border border-slate-300 bg-white py-2 ps-3 pe-10 text-sm text-slate-900 shadow-sm',
                'font-sans placeholder:text-slate-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30',
                disabled && 'cursor-not-allowed opacity-50',
              )}
              autoComplete="off"
            />
          </div>
        )}

        {showDropdown ? (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">کوئی کمپنی نہیں ملی</p>
            ) : (
              filtered.map((company) => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => selectCompany(company)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-emerald-50',
                    company.id === value && 'bg-emerald-50 font-medium text-emerald-900',
                  )}
                >
                  <Building2 className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="truncate font-urdu">{company.name}</span>
                </button>
              ))
            )}
            <div className="border-t border-slate-100 p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => {
                  setOpen(false);
                  setAddOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                نئی کمپنی
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <CompanyQuickAddModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} />
    </>
  );
}
