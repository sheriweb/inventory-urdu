'use client';

import Link from 'next/link';
import { Eye, Pencil, Trash2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionBtnProps = {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'edit' | 'delete' | 'view' | 'extra';
  disabled?: boolean;
};

const variantClass = {
  edit: 'text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 ring-emerald-200',
  delete: 'text-red-600 hover:bg-red-50 hover:text-red-700 ring-red-200',
  view: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 ring-slate-200',
  extra: 'text-violet-700 hover:bg-violet-50 hover:text-violet-800 ring-violet-200',
};

function ActionButton({ label, onClick, href, variant = 'edit', disabled }: ActionBtnProps) {
  const Icon = variant === 'delete' ? Trash2 : variant === 'view' ? Eye : variant === 'extra' ? Users : Pencil;
  const className = cn(
    'inline-flex h-8 w-8 items-center justify-center rounded-lg ring-1 transition-all duration-150',
    variantClass[variant],
    disabled && 'pointer-events-none opacity-40',
  );

  if (href) {
    return (
      <Link href={href} title={label} className={className}>
        <Icon className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <button type="button" title={label} className={className} onClick={onClick} disabled={disabled}>
      <Icon className="h-4 w-4" />
    </button>
  );
}

type TableRowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onExtra?: () => void;
  viewHref?: string;
  editHref?: string;
  editLabel?: string;
  deleteLabel?: string;
  viewLabel?: string;
  extraLabel?: string;
};

export function TableRowActions({
  onEdit,
  onDelete,
  onExtra,
  viewHref,
  editHref,
  editLabel = 'ترمیم',
  deleteLabel = 'حذف',
  viewLabel = 'دیکھیں',
  extraLabel = 'ضمانتی',
}: TableRowActionsProps) {
  return (
    <div className="flex items-center justify-start gap-1.5">
      {viewHref ? <ActionButton label={viewLabel} href={viewHref} variant="view" /> : null}
      {editHref ? <ActionButton label={editLabel} href={editHref} variant="edit" /> : null}
      {onEdit && !editHref ? <ActionButton label={editLabel} onClick={onEdit} variant="edit" /> : null}
      {onExtra ? <ActionButton label={extraLabel} onClick={onExtra} variant="extra" /> : null}
      {onDelete ? <ActionButton label={deleteLabel} onClick={onDelete} variant="delete" /> : null}
    </div>
  );
}
