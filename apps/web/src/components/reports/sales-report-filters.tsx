'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import api from '@/lib/api';
import { asArray } from '@/lib/api-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StaffType, type Staff } from '@inventory-urdu/shared';

export type SalesStaffFilterMode = 'recovery_man' | 'sales_team';

const MODE_OPTIONS: { value: SalesStaffFilterMode; label: string }[] = [
  { value: 'recovery_man', label: 'ریکوری مین' },
  { value: 'sales_team', label: 'سیلز مین / اوونر پارٹنر' },
];

/** Combined dropdown value: salesman:uuid or partner:uuid */
export function encodeSalesTeamStaffId(role: 'salesman' | 'partner', id: string): string {
  return `${role}:${id}`;
}

export function decodeSalesTeamStaffId(value: string): { role: 'salesman' | 'partner'; id: string } | null {
  if (value.startsWith('salesman:')) {
    return { role: 'salesman', id: value.slice('salesman:'.length) };
  }
  if (value.startsWith('partner:')) {
    return { role: 'partner', id: value.slice('partner:'.length) };
  }
  return null;
}

type SalesReportFiltersProps = {
  from: string;
  to: string;
  filterMode: SalesStaffFilterMode;
  staffId: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onFilterModeChange: (v: SalesStaffFilterMode) => void;
  onStaffIdChange: (v: string) => void;
  onSearch: () => void;
  searching?: boolean;
};

export function buildSalesReportParams(
  from: string,
  to: string,
  filterMode: SalesStaffFilterMode,
  staffId: string,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (staffId) {
    if (filterMode === 'recovery_man') {
      params.recoveryManId = staffId;
    } else {
      const decoded = decodeSalesTeamStaffId(staffId);
      if (decoded?.role === 'salesman') params.salesmanId = decoded.id;
      if (decoded?.role === 'partner') params.outdoorManId = decoded.id;
    }
  }
  return params;
}

export function SalesReportFilters({
  from,
  to,
  filterMode,
  staffId,
  onFromChange,
  onToChange,
  onFilterModeChange,
  onStaffIdChange,
  onSearch,
  searching = false,
}: SalesReportFiltersProps) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(true);

  useEffect(() => {
    (async () => {
      setLoadingStaff(true);
      try {
        const { data } = await api.get('/staff');
        setStaff(asArray<Staff>(data?.data));
      } catch {
        setStaff([]);
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, []);

  const recoveryOptions = useMemo(
    () => staff.filter((s) => s.type === StaffType.RECOVERY_MAN && s.isActive),
    [staff],
  );

  const salesmen = useMemo(
    () => staff.filter((s) => s.type === StaffType.SALESMAN && s.isActive),
    [staff],
  );

  const partners = useMemo(
    () => staff.filter((s) => s.type === StaffType.OUTDOOR_MAN && s.isActive),
    [staff],
  );

  const staffLabel =
    filterMode === 'recovery_man' ? 'ریکوری مین' : 'سیلز مین / اوونر پارٹنر';

  return (
    <Card>
      <CardContent className="space-y-4 p-4 no-print">
        <div>
          <p className="mb-2 text-sm font-semibold text-slate-800">سرچ فارم</p>
          <div className="flex flex-wrap gap-4">
            {MODE_OPTIONS.map((opt) => (
              <label key={opt.value} className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="sales-staff-filter"
                  value={opt.value}
                  checked={filterMode === opt.value}
                  onChange={() => {
                    onFilterModeChange(opt.value);
                    onStaffIdChange('');
                  }}
                  className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 sm:max-w-[280px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">{staffLabel}</label>
            <Select
              value={staffId}
              onChange={(e) => onStaffIdChange(e.target.value)}
              disabled={loadingStaff}
            >
              <option value="">— تمام —</option>
              {filterMode === 'recovery_man' ? (
                recoveryOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))
              ) : (
                <>
                  {salesmen.length > 0 ? (
                    <optgroup label="سیلز مین">
                      {salesmen.map((s) => (
                        <option key={`salesman-${s.id}`} value={encodeSalesTeamStaffId('salesman', s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {partners.length > 0 ? (
                    <optgroup label="اوونر / پارٹنر">
                      {partners.map((s) => (
                        <option key={`partner-${s.id}`} value={encodeSalesTeamStaffId('partner', s.id)}>
                          {s.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </>
              )}
            </Select>
          </div>
          <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">از</label>
            <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">تا</label>
            <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <Button type="button" onClick={onSearch} disabled={searching} className="gap-2">
            <Search className="h-4 w-4" />
            {searching ? 'سرچ…' : 'سرچ کریں'}
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          ریکوری مین الگ — سیلز مین اور اوونر پارٹنر ایک ڈراپ ڈاؤن میں — صرف فعال مارکیٹ (بقایا والے) کھاتے
        </p>
      </CardContent>
    </Card>
  );
}
