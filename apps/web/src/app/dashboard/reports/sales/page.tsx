'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, tableTruncateCell, type DataTableColumn } from '@/components/ui/data-table';
import { AlertBanner } from '@/components/ui/alert-banner';
import {
  SalesReportFilters,
  buildSalesReportParams,
  type SalesStaffFilterMode,
} from '@/components/reports/sales-report-filters';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type SaleRow = {
  id: string;
  accountNumber: number;
  accountDate: string;
  customerName: string;
  fatherOrHusbandName?: string | null;
  presentAddress?: string | null;
  totalAmount: number;
  advanceAmount: number;
  remainingBalance: number;
  installmentAmount: number;
  installmentCount: number;
  itemsSummary: string;
  salesman: { id: string; name: string } | null;
  recoveryMan: { id: string; name: string } | null;
  outdoorMan: { id: string; name: string } | null;
};

type SalesResponse = {
  rows: SaleRow[];
  summary: {
    count: number;
    totalSales: number;
    totalAdvance: number;
    totalInstallment: number;
    totalRemaining: number;
  };
};

function toReportNum(value: unknown): number {
  if (value == null) return 0;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeSaleRow(row: SaleRow): SaleRow {
  return {
    ...row,
    totalAmount: toReportNum(row.totalAmount),
    advanceAmount: toReportNum(row.advanceAmount),
    remainingBalance: toReportNum(row.remainingBalance),
    installmentAmount: toReportNum(row.installmentAmount),
  };
}

function summarizeRows(rows: SaleRow[]) {
  return {
    count: rows.length,
    totalSales: rows.reduce((sum, r) => sum + r.totalAmount, 0),
    totalAdvance: rows.reduce((sum, r) => sum + r.advanceAmount, 0),
    totalInstallment: rows.reduce((sum, r) => sum + r.installmentAmount, 0),
    totalRemaining: rows.reduce((sum, r) => sum + r.remainingBalance, 0),
  };
}

type SummaryStat = {
  key: string;
  label: string;
  value: string;
  valueClass: string;
};

function SalesSummaryCards({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <div
          key={stat.key}
          className="flex min-h-[5.5rem] flex-col items-center justify-center rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/90 px-3 py-4 text-center shadow-sm"
        >
          <p className="mb-2 text-sm font-semibold leading-snug text-slate-600">{stat.label}</p>
          <p className={`text-xl font-bold tabular-nums sm:text-2xl ${stat.valueClass}`} dir="ltr">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function SalesReportPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [filterMode, setFilterMode] = useState<SalesStaffFilterMode>('sales_team');
  const [staffId, setStaffId] = useState('');
  const [data, setData] = useState<SalesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/reports/sales', {
        params: buildSalesReportParams(from, to, filterMode, staffId),
      });
      const payload = res.data as SalesResponse;
      const rows = Array.isArray(payload?.rows)
        ? payload.rows.map((row) => normalizeSaleRow(row as SaleRow))
        : [];
      const fromRows = summarizeRows(rows);
      const apiSummary = payload?.summary;
      const pick = (apiVal: unknown, rowVal: number) => {
        const n = toReportNum(apiVal);
        return n > 0 ? n : rowVal;
      };
      setData({
        rows,
        summary: {
          count: apiSummary?.count ?? fromRows.count,
          totalSales: pick(apiSummary?.totalSales, fromRows.totalSales),
          totalAdvance: pick(apiSummary?.totalAdvance, fromRows.totalAdvance),
          totalInstallment: pick(apiSummary?.totalInstallment, fromRows.totalInstallment),
          totalRemaining: pick(apiSummary?.totalRemaining, fromRows.totalRemaining),
        },
      });
    } catch {
      setError('سیل رپورٹ لوڈ نہیں ہو سکی');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, filterMode, staffId]);

  useEffect(() => {
    load();
  }, [load]);

  const columns: DataTableColumn<SaleRow>[] = useMemo(
    () => [
      {
        id: 'account',
        header: 'کھاتہ',
        width: '4.5rem',
        cell: (row) => (
          <Link href={`/dashboard/leases/${row.id}`} className="block truncate font-medium text-emerald-700 hover:underline">
            {row.accountNumber}
          </Link>
        ),
      },
      {
        id: 'date',
        header: 'تاریخ',
        width: '7rem',
        className: 'whitespace-nowrap',
        cell: (row) => fmtDate(row.accountDate),
      },
      {
        id: 'customer',
        header: 'گاہک',
        width: '6.5rem',
        cell: (row) => tableTruncateCell(row.customerName),
      },
      {
        id: 'father',
        header: 'والد / زوجہ',
        width: '8rem',
        cell: (row) => tableTruncateCell(row.fatherOrHusbandName ?? '—', row.fatherOrHusbandName ?? undefined),
      },
      {
        id: 'address',
        header: 'ایڈریس',
        width: '9rem',
        cell: (row) => tableTruncateCell(row.presentAddress ?? '—', row.presentAddress ?? undefined),
      },
      {
        id: 'items',
        header: 'آئٹم / اشیاء',
        width: '10rem',
        cell: (row) => tableTruncateCell(row.itemsSummary || '—', row.itemsSummary),
      },
      {
        id: 'advance',
        header: 'ایڈوانس',
        width: '6rem',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span dir="ltr" className="block truncate tabular-nums">
            {fmtMoney(row.advanceAmount)}
          </span>
        ),
      },
      {
        id: 'salesman',
        header: 'سیلز مین',
        width: '7rem',
        cell: (row) => tableTruncateCell(row.salesman?.name ?? '—', row.salesman?.name ?? undefined),
      },
      {
        id: 'recovery',
        header: 'ریکوری مین',
        width: '7rem',
        cell: (row) => tableTruncateCell(row.recoveryMan?.name ?? '—', row.recoveryMan?.name ?? undefined),
      },
      {
        id: 'partner',
        header: 'پارٹنر',
        width: '7rem',
        cell: (row) => tableTruncateCell(row.outdoorMan?.name ?? '—', row.outdoorMan?.name ?? undefined),
      },
      {
        id: 'installment',
        header: 'قسط',
        width: '6.5rem',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span dir="ltr" className="block truncate tabular-nums">
            {fmtMoney(row.installmentAmount)}
          </span>
        ),
      },
      {
        id: 'remaining',
        header: 'بقایا',
        width: '6.5rem',
        className: 'whitespace-nowrap',
        cell: (row) => (
          <span dir="ltr" className="block truncate font-medium tabular-nums text-red-600">
            {fmtMoney(row.remainingBalance)}
          </span>
        ),
      },
    ],
    [],
  );

  const rows = data?.rows ?? [];

  const summaryStats = useMemo((): SummaryStat[] => {
    const fromRows = summarizeRows(rows);
    const s = data?.summary;
    const count = s?.count ?? fromRows.count;
    const pick = (apiVal: unknown, rowVal: number) => {
      const n = toReportNum(apiVal);
      return n > 0 ? n : rowVal;
    };
    const totalSales = pick(s?.totalSales, fromRows.totalSales);
    const totalAdvance = pick(s?.totalAdvance, fromRows.totalAdvance);
    const totalInstallment = pick(s?.totalInstallment, fromRows.totalInstallment);
    const totalRemaining = pick(s?.totalRemaining, fromRows.totalRemaining);

    return [
      { key: 'count', label: 'کل کھاتے', value: String(count), valueClass: 'text-slate-900' },
      { key: 'sales', label: 'کل فروخت', value: fmtMoney(totalSales), valueClass: 'text-emerald-800' },
      { key: 'advance', label: 'کل ایڈوانس', value: fmtMoney(totalAdvance), valueClass: 'text-blue-700' },
      { key: 'installment', label: 'کل قسط', value: fmtMoney(totalInstallment), valueClass: 'text-indigo-800' },
      { key: 'remaining', label: 'کل بقایا', value: fmtMoney(totalRemaining), valueClass: 'text-red-600' },
    ];
  }, [data, rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">سیل رپورٹ</h1>
        <p className="text-sm text-slate-500">
          صرف فعال مارکیٹ — بقایا والے کھاتے (نل / بند کھاتے شامل نہیں)
        </p>
      </div>

      <SalesReportFilters
        from={from}
        to={to}
        filterMode={filterMode}
        staffId={staffId}
        onFromChange={setFrom}
        onToChange={setTo}
        onFilterModeChange={setFilterMode}
        onStaffIdChange={setStaffId}
        onSearch={load}
        searching={loading}
      />

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {data ? (
        <Card>
          <CardContent className="p-4">
            <SalesSummaryCards stats={summaryStats} />
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        pageSize={15}
        minTableWidth="92rem"
        compact
        searchKeys={(row) =>
          `${row.accountNumber} ${row.customerName} ${row.itemsSummary} ${row.salesman?.name ?? ''} ${row.recoveryMan?.name ?? ''} ${row.outdoorMan?.name ?? ''}`
        }
        emptyTitle="اس مدت میں کوئی سیل نہیں"
        emptyDescription="ریکوری / سیلز / پارٹنر یا تاریخ بدل کر دوبارہ سرچ کریں"
      />
    </div>
  );
}
