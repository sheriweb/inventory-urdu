'use client';

import { useEffect, useState } from 'react';
import { Printer, Search } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { asArray } from '@/lib/api-response';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { StaffType, type Staff } from '@inventory-urdu/shared';

type ReportFiltersProps = {
  from: string;
  to: string;
  recoveryManId: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  onRecoveryManChange: (v: string) => void;
  onSearch: () => void;
  searching?: boolean;
  showRecoveryMan?: boolean;
  printHref?: string;
};

export function ReportFilters({
  from,
  to,
  recoveryManId,
  onFromChange,
  onToChange,
  onRecoveryManChange,
  onSearch,
  searching = false,
  showRecoveryMan = true,
  printHref,
}: ReportFiltersProps) {
  const [recoveryMen, setRecoveryMen] = useState<Staff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(showRecoveryMan);

  useEffect(() => {
    if (!showRecoveryMan) return;
    (async () => {
      setLoadingStaff(true);
      try {
        const { data } = await api.get('/staff');
        setRecoveryMen(asArray<Staff>(data?.data).filter((s) => s.type === StaffType.RECOVERY_MAN));
      } catch {
        setRecoveryMen([]);
      } finally {
        setLoadingStaff(false);
      }
    })();
  }, [showRecoveryMan]);

  return (
    <Card>
      <CardContent className="space-y-3 p-4 no-print">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">از</label>
            <Input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} dir="ltr" className="text-left" />
          </div>
          <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
            <label className="mb-1 block text-sm font-medium text-slate-700">تا</label>
            <Input type="date" value={to} onChange={(e) => onToChange(e.target.value)} dir="ltr" className="text-left" />
          </div>
          {showRecoveryMan ? (
            <div className="min-w-[200px] flex-1 sm:max-w-[280px]">
              <label className="mb-1 block text-sm font-medium text-slate-700">ریکوری مین</label>
              <Select
                value={recoveryManId}
                onChange={(e) => onRecoveryManChange(e.target.value)}
                disabled={loadingStaff}
              >
                <option value="">— تمام —</option>
                {recoveryMen.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          <Button type="button" onClick={onSearch} disabled={searching} className="gap-2">
            <Search className="h-4 w-4" />
            {searching ? 'تلاش…' : 'تلاش'}
          </Button>
          {printHref ? (
            <Link href={printHref} target="_blank">
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Printer className="h-4 w-4" />
                پرنٹ
              </Button>
            </Link>
          ) : null}
        </div>
        <p className="text-xs text-slate-500">تاریخ منتخب کریں اور تلاش بٹن دبائیں — نتائج نیچے دکھائی دیں گے</p>
      </CardContent>
    </Card>
  );
}

export function buildReportParams(from: string, to: string, recoveryManId?: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (recoveryManId) params.recoveryManId = recoveryManId;
  return params;
}
