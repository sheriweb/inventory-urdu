'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { compactInputClass } from '@/components/forms/customer-form-fields';
import { SaleItemDetailsEditor } from '@/components/forms/sale-item-details-editor';
import {
  applyCatalogToLine,
  grandTotalFromLines,
  identifierFieldsForLine,
  newSaleItemLine,
  syncLineUnitDetails,
  saleLineTotal,
  type SaleItemLine,
} from '@/lib/sale-item-lines';
import { ITEM_SALE_TYPE_LABELS, itemCatalogLabel, type Item, type ItemSaleType } from '@inventory-urdu/shared';

const SALE_TYPES: ItemSaleType[] = ['mobile', 'bike', 'general'];

function fmtMoney(n: number): string {
  return n.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

type SaleItemsCompactTableProps = {
  lines: SaleItemLine[];
  catalog: Item[];
  onChange: (lines: SaleItemLine[]) => void;
  onCatalogAdded?: (item: Item) => void;
};

export function SaleItemsCompactTable({
  lines: linesProp,
  catalog: catalogProp,
  onChange,
  onCatalogAdded,
}: SaleItemsCompactTableProps) {
  const lines = linesProp ?? [];
  const catalog = catalogProp ?? [];

  function emitChange(next: SaleItemLine[]) {
    onChange(Array.isArray(next) ? next : []);
  }

  function updateLine(key: string, patch: Partial<SaleItemLine>) {
    emitChange(lines.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function onCatalogSelect(key: string, itemId: string) {
    const line = lines.find((row) => row.key === key);
    if (!line) return;
    const item = catalog.find((i) => i.id === itemId);
    if (!item) {
      emitChange(
        lines.map((row) =>
          row.key === key
            ? syncLineUnitDetails(
                {
                  ...row,
                  catalogItemId: '',
                  itemName: '',
                  rate: '',
                },
                catalog,
                true,
              )
            : row,
        ),
      );
      return;
    }
    emitChange(lines.map((row) => (row.key === key ? applyCatalogToLine(row, item, itemId) : row)));
  }

  function onSaleTypeChange(key: string, saleType: ItemSaleType) {
    emitChange(
      lines.map((line) => {
        if (line.key !== key) return line;
        return syncLineUnitDetails(
          {
            ...line,
            saleType,
            catalogItemId: '',
            unitDetailRows: [],
          },
          catalog,
          true,
        );
      }),
    );
  }

  function onQuantityChange(key: string, quantityValue: string) {
    emitChange(
      lines.map((line) => {
        if (line.key !== key) return line;
        return syncLineUnitDetails({ ...line, quantity: quantityValue }, catalog);
      }),
    );
  }

  function addRow() {
    emitChange([...lines, newSaleItemLine()]);
  }

  function removeRow(key: string) {
    if (lines.length <= 1) return;
    emitChange(lines.filter((row) => row.key !== key));
  }

  const total = grandTotalFromLines(lines);

  return (
    <div className="min-w-0 space-y-2">
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-right">
              <th className="w-8 px-2 py-2 font-semibold text-slate-600">#</th>
              <th className="w-24 px-2 py-2 font-semibold text-slate-600">قسم</th>
              <th className="min-w-[8rem] px-2 py-2 font-semibold text-slate-600">کیٹلاگ</th>
              <th className="min-w-[9rem] px-2 py-2 font-semibold text-slate-600">نام</th>
              <th className="w-24 px-2 py-2 font-semibold text-slate-600">ریٹ</th>
              <th className="w-16 px-2 py-2 font-semibold text-slate-600">مقدار</th>
              <th className="w-24 px-2 py-2 font-semibold text-slate-600">کل</th>
              <th className="w-10 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.key} className="border-b border-slate-100 align-top last:border-b-0">
                <td className="px-2 py-1.5 text-center text-slate-500">{index + 1}</td>
                <td className="px-2 py-1.5">
                  <Select
                    value={line.saleType}
                    onChange={(e) => onSaleTypeChange(line.key, e.target.value as ItemSaleType)}
                    className={compactInputClass}
                  >
                    {SALE_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ITEM_SALE_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                </td>
                <td className="px-2 py-1.5">
                  <QuickAddSelect
                    entity="item"
                    value={line.catalogItemId}
                    onChange={(id) => onCatalogSelect(line.key, id)}
                    options={catalog.map((item) => ({
                      value: item.id,
                      label: itemCatalogLabel(item),
                    }))}
                    onOptionAdded={(record) => {
                      const item = record as Item;
                      onCatalogAdded?.(item);
                      onCatalogSelect(line.key, item.id);
                    }}
                    className={compactInputClass}
                  >
                    <option value="">دستی</option>
                    {catalog.map((item) => (
                      <option key={item.id} value={item.id}>
                        {itemCatalogLabel(item)}
                      </option>
                    ))}
                  </QuickAddSelect>
                </td>
                <td className="px-2 py-1.5">
                  <UrduNameInput
                    value={line.itemName}
                    onChange={(itemName) => updateLine(line.key, { itemName })}
                    placeholder="آئٹم نام"
                    className={compactInputClass}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.rate}
                    onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                    dir="ltr"
                    className={`text-left ${compactInputClass}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={line.quantity}
                    onChange={(e) => onQuantityChange(line.key, e.target.value)}
                    dir="ltr"
                    className={`text-left ${compactInputClass}`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <span className="inline-flex h-8 w-full items-center justify-end font-semibold text-slate-900" dir="ltr">
                    {fmtMoney(saleLineTotal(line))}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeRow(line.key)}
                    disabled={lines.length <= 1}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                    aria-label="لائن حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-emerald-50/60">
              <td colSpan={6} className="px-3 py-2 text-end font-medium text-slate-700">
                مجموعی کل
              </td>
              <td className="px-2 py-2 text-end text-sm font-bold text-emerald-900" dir="ltr" colSpan={2}>
                {fmtMoney(total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow} className="gap-1.5">
        <Plus className="h-4 w-4" />
        آئٹم شامل کریں
      </Button>

      {lines.some((line) => line.saleType !== 'general') ? (
        <div className="space-y-2 border-t border-slate-100 pt-3">
          {lines.map((line, index) => {
            if (line.saleType === 'general') return null;
            const detailFields = identifierFieldsForLine(line, catalog);
            if (detailFields.length === 0) return null;
            return (
              <div
                key={`details-${line.key}-${line.saleType}-${line.catalogItemId || 'manual'}`}
                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
              >
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  {line.itemName || `آئٹم ${index + 1}`} — {ITEM_SALE_TYPE_LABELS[line.saleType]}
                </p>
                <SaleItemDetailsEditor
                  key={`editor-${line.key}-${line.saleType}-${detailFields.map((f) => f.key).join('-')}`}
                  saleType={line.saleType}
                  itemName={line.itemName}
                  quantity={Number(line.quantity) || 1}
                  unitDetailRows={line.unitDetailRows}
                  fields={detailFields}
                  compact
                  lineIndex={index + 1}
                  onChange={(unitDetailRows) => updateLine(line.key, { unitDetailRows })}
                />
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
