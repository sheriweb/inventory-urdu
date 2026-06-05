'use client';

import * as React from 'react';

export type TablePaginationResult = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  safePage: number;
  start: number;
  end: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  pageSlice: <T>(items: T[]) => T[];
};

export function useTablePagination(
  totalItems: number,
  pageSize = 10,
  resetDeps: React.DependencyList = [],
): TablePaginationResult {
  const [page, setPage] = React.useState(1);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = totalItems === 0 ? 0 : (safePage - 1) * pageSize;
  const end = Math.min(start + pageSize, totalItems);

  React.useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller controls reset via resetDeps
  }, [totalItems, pageSize, ...resetDeps]);

  React.useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageSlice = React.useCallback(
    <T,>(items: T[]) => items.slice(start, start + pageSize),
    [start, pageSize],
  );

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
    safePage,
    start,
    end,
    setPage,
    pageSlice,
  };
}
