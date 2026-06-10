'use client';

import {
  getDisplayFieldsFromUnit,
  type LeaseItemUnitDetail,
} from '@inventory-urdu/shared';

type Props = {
  itemName: string;
  unitDetails?: LeaseItemUnitDetail[] | null;
};

export function LeaseItemUnitDetails({ itemName, unitDetails }: Props) {
  const rows = Array.isArray(unitDetails) ? unitDetails : [];
  if (rows.length === 0) return null;

  const hasAny = rows.some((unit) => getDisplayFieldsFromUnit(unit).length > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2">
      {rows.map((unit) => {
        const fields = getDisplayFieldsFromUnit(unit);
        if (fields.length === 0) return null;
        return (
          <div key={unit.unitIndex} className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <p className="mb-1 font-semibold text-slate-800">
              {itemName}
              {rows.length > 1 ? ` — یونٹ #${unit.unitIndex}` : ''}
            </p>
            <dl className="grid gap-1 sm:grid-cols-2">
              {fields.map((field, index) => (
                <div key={`${unit.unitIndex}-${field.label}-${index}`}>
                  <dt className="text-slate-500">{field.label}</dt>
                  <dd dir="ltr" className="font-mono text-slate-900">
                    {field.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}
