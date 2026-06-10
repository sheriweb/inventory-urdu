'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputWithVoice } from '@/components/forms/input-with-voice';
import { FormField } from '@/components/ui/form-section';
import { compactInputClass } from '@/components/forms/customer-form-fields';

const MOBILES_PER_ROW = 3;
const DEFAULT_VISIBLE = 3;

type MultiMobileFieldsProps = {
  primary: string;
  additional: string[];
  onPrimaryChange: (value: string) => void;
  onAdditionalChange: (values: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
};

function displaySlots(primary: string, additional: string[]): string[] {
  const slots = [primary, ...additional];
  while (slots.length < DEFAULT_VISIBLE) slots.push('');
  return slots;
}

function chunkRows<T>(items: T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export function MultiMobileFields({
  primary,
  additional,
  onPrimaryChange,
  onAdditionalChange,
  disabled,
  compact = true,
}: MultiMobileFieldsProps) {
  const fieldClass = compact ? compactInputClass : '';
  const slots = displaySlots(primary, additional);
  const rows = chunkRows(slots, MOBILES_PER_ROW);

  function setSlot(index: number, value: string) {
    if (index === 0) {
      onPrimaryChange(value);
      return;
    }
    const extras = [...additional];
    const extraIndex = index - 1;
    while (extras.length <= extraIndex) extras.push('');
    extras[extraIndex] = value;
    onAdditionalChange(extras);
  }

  function addExtra() {
    onAdditionalChange([...additional, '']);
  }

  function removeSlot(index: number) {
    if (index <= 0) return;
    onAdditionalChange(additional.filter((_, i) => i !== index - 1));
  }

  return (
    <div className="col-span-full space-y-2">
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {row.map((value, colIndex) => {
            const slotIndex = rowIndex * MOBILES_PER_ROW + colIndex;
            const canRemove = slotIndex >= DEFAULT_VISIBLE;
            return (
              <FormField key={slotIndex} label={`موبائل ${slotIndex + 1}`} compact>
                <div className="flex min-w-0 items-center gap-1">
                  <InputWithVoice
                    value={value}
                    onChange={(e) => setSlot(slotIndex, e.target.value)}
                    disabled={disabled}
                    voiceMode="phone"
                    voiceTitle="موبائل بولیں"
                    compact={compact}
                    dir="ltr"
                    className={`min-w-0 flex-1 text-left ${fieldClass}`}
                  />
                  {canRemove ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 shrink-0 px-0"
                      disabled={disabled}
                      onClick={() => removeSlot(slotIndex)}
                      aria-label="موبائل حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
              </FormField>
            );
          })}
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        disabled={disabled}
        onClick={addExtra}
      >
        <Plus className="h-3.5 w-3.5" />
        موبائل نمبر شامل کریں
      </Button>
    </div>
  );
}
