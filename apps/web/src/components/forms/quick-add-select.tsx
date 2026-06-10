'use client';

import { useState } from 'react';
import { SelectWithAdd } from '@/components/forms/select-with-add';
import { QuickAddModal } from '@/components/forms/quick-add-modal';
import { StaffType } from '@inventory-urdu/shared';

export type QuickAddEntity = 'area' | 'company' | 'customer' | 'staff' | 'item' | 'expense-account';

export type QuickAddOption = { value: string; label: string };

type QuickAddSelectProps = {
  entity: QuickAddEntity;
  value: string;
  onChange: (value: string) => void;
  options: QuickAddOption[];
  onOptionAdded?: (record: unknown) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  staffType?: StaffType;
  showAdd?: boolean;
  compact?: boolean;
  children?: React.ReactNode;
};

const ADD_LABELS: Record<QuickAddEntity, string> = {
  area: 'نیا علاقہ',
  company: 'نئی کمپنی',
  customer: 'نیا گاہک',
  staff: 'نیا عملہ',
  item: 'نیا آئٹم',
  'expense-account': 'خرچہ اکاؤنٹ',
};

export function QuickAddSelect({
  entity,
  value,
  onChange,
  options,
  onOptionAdded,
  placeholder,
  disabled,
  required,
  className,
  staffType,
  showAdd = true,
  compact = false,
  children,
}: QuickAddSelectProps) {
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreated(record: unknown) {
    onOptionAdded?.(record);
    const id = (record as { id?: string })?.id;
    if (id) onChange(id);
    setModalOpen(false);
  }

  return (
    <>
      <SelectWithAdd
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={className}
        showAdd={showAdd}
        compact={compact}
        onAddClick={() => setModalOpen(true)}
        addTitle={ADD_LABELS[entity]}
      >
        {children ?? (
          <>
            {placeholder ? <option value="">{placeholder}</option> : null}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </>
        )}
      </SelectWithAdd>

      {modalOpen ? (
        <QuickAddModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          entity={entity}
          staffType={staffType}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}
