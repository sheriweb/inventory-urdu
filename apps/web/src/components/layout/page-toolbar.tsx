import * as React from 'react';
import { cn } from '@/lib/utils';

/** Action buttons row — page title already shows in the app shell bar. */
export function PageToolbar({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <div className={cn('mb-4 flex flex-wrap items-center justify-end gap-2', className)}>{children}</div>
  );
}
