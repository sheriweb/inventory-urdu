'use client';

import { useEffect } from 'react';
import { IdentifierFieldInput } from '@/components/forms/identifier-field-input';
import { MobileImeiActions } from '@/components/forms/mobile-imei-actions';
import { compactInputClass } from '@/components/forms/customer-form-fields';
import { cn } from '@/lib/utils';
import {
  fieldsForSaleType,
  resizeUnitDetailRowsWithFields,
  type ItemIdentifierField,
  type ItemSaleType,
  type SaleUnitDetailRows,
} from '@inventory-urdu/shared';

type Props = {
  saleType: ItemSaleType;
  itemName: string;
  quantity: number;
  unitDetailRows: SaleUnitDetailRows[];
  onChange: (rows: SaleUnitDetailRows[]) => void;
  /** کیٹلاگ یا دستی — موبائل IMEI / بائیک فریم وغیرہ */
  fields?: ItemIdentifierField[];
  compact?: boolean;
  lineIndex?: number;
};

export function SaleItemDetailsEditor({
  saleType,
  itemName,
  quantity,
  unitDetailRows,
  onChange,
  fields,
  compact = false,
  lineIndex,
}: Props) {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const presetFields = fields?.length ? fields : fieldsForSaleType(saleType);

  const fieldSignature = presetFields.map((f) => f.key).join('|');

  useEffect(() => {
    if (presetFields.length === 0) {
      if (unitDetailRows.length > 0) onChange([]);
      return;
    }
    const needsSync =
      unitDetailRows.length !== qty ||
      unitDetailRows.some(
        (unit) =>
          !Array.isArray(unit.rows) ||
          unit.rows.length !== presetFields.length ||
          !presetFields.every((field) => unit.rows.some((row) => row.label === field.label)) ||
          unit.rows.some((row) => !presetFields.some((field) => field.label === row.label)),
      );
    if (needsSync) {
      onChange(resizeUnitDetailRowsWithFields([], qty, presetFields));
    }
  }, [qty, saleType, fieldSignature, onChange, presetFields, unitDetailRows]);

  if (presetFields.length === 0) {
    return null;
  }

  const units =
    unitDetailRows.length > 0
      ? unitDetailRows.slice(0, qty)
      : resizeUnitDetailRowsWithFields([], qty, presetFields);

  function updateValue(unitIndex: number, label: string, value: string) {
    onChange(
      units.map((unit) =>
        unit.unitIndex === unitIndex
          ? {
              ...unit,
              rows: (unit.rows ?? []).map((row) =>
                row.label === label ? { ...row, value } : row,
              ),
            }
          : unit,
      ),
    );
  }

  const titlePrefix = lineIndex != null ? `آئٹم ${lineIndex}` : 'بابت خریداری';

  return (
    <div className={cn('min-w-0', compact ? 'space-y-2' : 'space-y-3')}>
      {!compact ? (
        <div className="border-b border-slate-100 pb-2">
          <p className="text-sm font-semibold text-slate-800">
            {titlePrefix}
            {itemName ? <span className="font-normal text-slate-500"> — {itemName}</span> : null}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {saleType === 'mobile'
              ? 'موبائل — IMEI 1 اور IMEI 2 درج کریں'
              : 'موٹر سائیکل — رجسٹریشن، ماڈل، ہارس پاور، میکر، چیسز اور انجن نمبر'}
          </p>
        </div>
      ) : null}

      {units
        .filter((unit) => unit.unitIndex <= qty)
        .map((unit) => (
          <div key={unit.unitIndex} className="min-w-0">
            {qty > 1 ? (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                یونٹ #{unit.unitIndex}
              </p>
            ) : null}
            <ReceiptFieldGrid
              fields={presetFields}
              unit={unit}
              compact={compact}
              saleType={saleType}
              onValueChange={(label, value) => updateValue(unit.unitIndex, label, value)}
            />
          </div>
        ))}
    </div>
  );
}

function ReceiptFieldGrid({
  fields,
  unit,
  onValueChange,
  compact,
  saleType,
}: {
  fields: ItemIdentifierField[];
  unit: SaleUnitDetailRows;
  onValueChange: (label: string, value: string) => void;
  compact?: boolean;
  saleType?: ItemSaleType;
}) {
  return (
    <div className={cn('grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2', compact && 'lg:grid-cols-3')}>
      {fields.map((field) => {
        const row = (unit.rows ?? []).find((entry) => entry.label === field.label);
        return (
          <div key={field.key} className="min-w-0">
            <label className={cn('mb-0.5 block font-medium text-slate-700', compact ? 'text-xs' : 'text-sm')}>
              {field.label}
              {field.required ? <span className="text-red-600"> *</span> : null}
            </label>
            <IdentifierFieldInput
              value={row?.value ?? ''}
              onChange={(e) => onValueChange(field.label, e.target.value)}
              placeholder={field.label}
              voiceMode="number"
              voiceTitle={`${field.label} بولیں`}
              scanTitle={`${field.label} اسکین`}
              showScan={
                field.key.includes('imei') ||
                field.key.includes('serial') ||
                field.key.includes('registration') ||
                field.key.includes('engine') ||
                field.key.includes('chassis') ||
                field.key.includes('frame')
              }
              compact={compact}
              dir="ltr"
              className={cn(
                'min-w-0 bg-white text-left font-mono',
                compact ? compactInputClass : 'text-sm',
              )}
              required={Boolean(field.required)}
            />
            {saleType === 'mobile' && field.key === 'imei_1' ? (
              <MobileImeiActions imei={row?.value ?? ''} compact={compact} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
