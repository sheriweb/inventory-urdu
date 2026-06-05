'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type TablePaginationProps = {
  totalItems: number;
  start: number;
  end: number;
  safePage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function TablePagination({
  totalItems,
  start,
  end,
  safePage,
  totalPages,
  onPageChange,
  className,
}: TablePaginationProps) {
  if (totalItems === 0) {
    return null;
  }

  const rangeStart = start + 1;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:flex-row',
        className,
      )}
    >
      <p className="text-xs text-slate-500">
        {totalItems} میں سے {rangeStart}–{end} دکھائے جا رہے ہیں
      </p>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage <= 1}
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          className="h-8 w-8 p-0"
          aria-label="پچھلا صفحہ"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="min-w-[4rem] text-center text-xs font-medium text-slate-600" dir="ltr">
          {safePage} / {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          className="h-8 w-8 p-0"
          aria-label="اگلا صفحہ"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
