'use client';

import { Select } from '@/components/ui/select';
import {
  ITEM_SALE_TYPE_LABELS,
  identifierFieldsForSaleType,
  saleTypeFromIdentifierFields,
  type ItemIdentifierField,
  type ItemSaleType,
} from '@inventory-urdu/shared';

type Props = {
  value: ItemIdentifierField[];
  onChange: (fields: ItemIdentifierField[]) => void;
};

const SALE_TYPES: ItemSaleType[] = ['mobile', 'bike', 'general'];

export function ItemIdentifierFieldsEditor({ value, onChange }: Props) {
  const saleType = saleTypeFromIdentifierFields(value);

  function onTypeChange(type: ItemSaleType) {
    onChange(identifierFieldsForSaleType(type));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">آئٹم کی قسم</p>
        <p className="mt-1">
          موبائل = IMEI 1، IMEI 2 + سٹوریج (4/64، 8/128) · موٹر سائیکل = رجسٹریشن، ماڈل، ہارس پاور، میکر، چیسز، انجن
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">قسم منتخب کریں</label>
        <Select
          value={saleType}
          onChange={(e) => onTypeChange(e.target.value as ItemSaleType)}
        >
          {SALE_TYPES.map((type) => (
            <option key={type} value={type}>
              {ITEM_SALE_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>

      {saleType !== 'general' ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3 text-sm text-emerald-900">
          <p className="font-medium">فروخت پر یہ فیلڈز خود ظاہر ہوں گی:</p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-emerald-800">
            {identifierFieldsForSaleType(saleType).map((field) => (
              <li key={field.key}>{field.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
