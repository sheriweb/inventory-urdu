'use client';

import * as React from 'react';
import { Inbox, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useTablePagination } from '@/hooks/use-table-pagination';

export type DataTableColumn<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Fixed column width for wide tables — e.g. "7rem" */
  width?: string;
};

type DataTableProps<T> = {
  data: T[];
  columns: DataTableColumn<T>[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  searchPlaceholder?: string;
  searchKeys?: (row: T) => string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  pageSize?: number;
  paginationMode?: 'client' | 'server';
  totalItems?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  toolbar?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  actionsHeader?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  compact?: boolean;
  /** Minimum table width — enables horizontal scroll on wide reports */
  minTableWidth?: string;
};

export function tableTruncateCell(content: React.ReactNode, title?: string) {
  const label = title ?? (typeof content === 'string' ? content : undefined);
  return (
    <span className="block min-w-0 truncate" title={label}>
      {content}
    </span>
  );
}

function SkeletonBar({ className }: { className?: string }) {
  return <div className={cn('skeleton-bar h-3 rounded-md bg-slate-200/80', className)} />;
}

function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent even:bg-slate-50/50">
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j} className="py-3.5">
              <SkeletonBar className={j === 0 ? 'w-16' : j === cols - 1 ? 'w-12' : 'w-full max-w-[8rem]'} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function DataTable<T>({
  data,
  columns,
  rowKey,
  loading = false,
  emptyTitle = 'کوئی ریکارڈ نہیں',
  emptyDescription,
  emptyAction,
  searchPlaceholder = 'تلاش کریں…',
  searchKeys,
  searchValue,
  onSearchChange,
  pageSize = 10,
  paginationMode = 'client',
  totalItems,
  page,
  onPageChange,
  toolbar,
  actions,
  actionsHeader = 'عمل',
  onRowClick,
  rowClassName,
  compact = false,
  minTableWidth,
}: DataTableProps<T>) {
  const [internalQuery, setInternalQuery] = React.useState('');
  const isServer = paginationMode === 'server';
  const query = isServer && onSearchChange !== undefined ? (searchValue ?? '') : internalQuery;

  function handleSearchChange(value: string) {
    if (isServer && onSearchChange) {
      onSearchChange(value);
    } else {
      setInternalQuery(value);
    }
  }

  const filtered = React.useMemo(() => {
    if (isServer || !searchKeys) return data;
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter((row) => searchKeys(row).toLowerCase().includes(q));
  }, [data, query, searchKeys, isServer]);

  const clientPagination = useTablePagination(filtered.length, pageSize, [query]);
  const pageRows = isServer ? data : clientPagination.pageSlice(filtered);

  const totalCount = isServer ? (totalItems ?? data.length) : filtered.length;
  const serverPage = page ?? 1;
  const serverTotalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const serverSafePage = Math.min(serverPage, serverTotalPages);
  const serverStart = totalCount === 0 ? 0 : (serverSafePage - 1) * pageSize;
  const serverEnd = Math.min(serverStart + pageSize, totalCount);

  const colCount = columns.length + (actions ? 1 : 0);
  const showSearch = Boolean(searchKeys || onSearchChange);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/[0.03]">
      {(showSearch || toolbar) && (
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-l from-slate-50/90 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          {showSearch ? (
            <div className="relative max-w-sm flex-1">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={searchPlaceholder}
                className="pr-9"
              />
            </div>
          ) : (
            <div />
          )}
          {toolbar ? <div className="flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table style={minTableWidth ? { minWidth: minTableWidth } : undefined}>
          <colgroup>
            {columns.map((col) => (
              <col key={col.id} style={col.width ? { width: col.width } : undefined} />
            ))}
            {actions ? <col style={{ width: '6.5rem' }} /> : null}
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent even:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.id} className={cn(compact && 'h-9 px-3', col.headerClassName)}>
                  {col.header}
                </TableHead>
              ))}
              {actions ? (
                <TableHead className={cn('w-[6.5rem] text-end', compact && 'h-9 px-3')}>{actionsHeader}</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton cols={colCount} />
            ) : pageRows.length === 0 ? (
              <TableRow className="hover:bg-transparent even:bg-transparent">
                <TableCell colSpan={colCount} className="py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 ring-1 ring-slate-200/80">
                      <Inbox className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-slate-700">{emptyTitle}</p>
                      {emptyDescription ? (
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{emptyDescription}</p>
                      ) : null}
                      {emptyAction ? <div className="mt-3">{emptyAction}</div> : null}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => (
                <TableRow
                  key={rowKey(row)}
                  className={cn(onRowClick && 'cursor-pointer', rowClassName?.(row))}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.id}
                      className={cn('max-w-0 overflow-hidden', compact && 'px-3 py-2.5', col.className)}
                    >
                      {col.cell(row)}
                    </TableCell>
                  ))}
                  {actions ? (
                    <TableCell
                      className={cn('w-[6.5rem] text-end', compact && 'px-3 py-2.5')}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {actions(row)}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!loading ? (
        <TablePagination
          totalItems={totalCount}
          start={isServer ? serverStart : clientPagination.start}
          end={isServer ? serverEnd : clientPagination.end}
          safePage={isServer ? serverSafePage : clientPagination.safePage}
          totalPages={isServer ? serverTotalPages : clientPagination.totalPages}
          onPageChange={isServer ? (onPageChange ?? (() => {})) : clientPagination.setPage}
        />
      ) : null}
    </div>
  );
}
