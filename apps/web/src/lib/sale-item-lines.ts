import {
  fieldsForSaleType,
  normalizeIdentifierFields,
  resizeUnitDetailRowsWithFields,
  saleTypeFromIdentifierFields,
  type ItemIdentifierField,
  type ItemSaleType,
  type SaleUnitDetailRows,
} from '@inventory-urdu/shared';
import { generateId } from '@/lib/generate-id';

export type SaleItemLine = {
  key: string;
  catalogItemId: string;
  itemName: string;
  rate: string;
  quantity: string;
  saleType: ItemSaleType;
  unitDetailRows: SaleUnitDetailRows[];
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function newSaleItemLine(): SaleItemLine {
  return {
    key: generateId(),
    catalogItemId: '',
    itemName: '',
    rate: '',
    quantity: '1',
    saleType: 'general',
    unitDetailRows: [],
  };
}

function ensureMobileImeiFields(fields: ItemIdentifierField[]): ItemIdentifierField[] {
  const defaults = fieldsForSaleType('mobile');
  const byKey = new Map(defaults.map((field) => [field.key, { ...field }]));
  for (const field of fields) {
    byKey.set(field.key, field);
  }
  const ordered = defaults.map((field) => byKey.get(field.key)!).filter(Boolean);
  const extra = fields.filter((field) => !defaults.some((entry) => entry.key === field.key));
  return [...ordered, ...extra];
}

function ensureBikeDetailFields(fields: ItemIdentifierField[]): ItemIdentifierField[] {
  const defaults = fieldsForSaleType('bike');
  const byKey = new Map(defaults.map((field) => [field.key, { ...field }]));
  for (const field of fields) {
    byKey.set(field.key, field);
  }
  const ordered = defaults.map((field) => byKey.get(field.key)!).filter(Boolean);
  const extra = fields.filter((field) => !defaults.some((entry) => entry.key === field.key));
  return [...ordered, ...extra];
}

export function identifierFieldsForLine(
  line: Pick<SaleItemLine, 'saleType' | 'catalogItemId'>,
  catalog: CatalogItem[] = [],
): ItemIdentifierField[] {
  if (line.saleType === 'general') return [];

  const typeFields = fieldsForSaleType(line.saleType);
  let fields = typeFields;

  if (line.catalogItemId) {
    const item = catalog.find((entry) => entry.id === line.catalogItemId);
    const custom = normalizeIdentifierFields(item?.identifierFields);
    if (custom.length > 0) {
      const catalogType = saleTypeFromIdentifierFields(custom);
      if (catalogType === line.saleType) {
        fields = custom;
      }
    }
  }

  if (line.saleType === 'mobile') {
    return ensureMobileImeiFields(fields);
  }

  if (line.saleType === 'bike') {
    return ensureBikeDetailFields(fields);
  }

  return fields;
}

function unitRowsMatchFields(
  fields: ItemIdentifierField[],
  rows: SaleUnitDetailRows[],
  quantity: number,
): boolean {
  if (fields.length === 0) return rows.length === 0;
  const qty = Math.max(1, Math.floor(quantity) || 1);
  if (rows.length !== qty) return false;
  return rows.every(
    (unit) =>
      unit.rows.length === fields.length &&
      fields.every((field) => unit.rows.some((row) => row.label === field.label)),
  );
}

export function rowsForSaleLine(
  saleType: ItemSaleType,
  quantity: number,
  current: SaleUnitDetailRows[] = [],
  fields?: ItemIdentifierField[],
): SaleUnitDetailRows[] {
  const preset = fields?.length ? fields : fieldsForSaleType(saleType);
  if (preset.length === 0) return [];
  return resizeUnitDetailRowsWithFields(current, quantity, preset);
}

export function syncLineUnitDetails(
  line: SaleItemLine,
  catalog: CatalogItem[] = [],
  resetDetails = false,
): SaleItemLine {
  const quantity = Number(line.quantity) || 1;
  const fields = identifierFieldsForLine(line, catalog);
  const keepCurrent =
    !resetDetails && unitRowsMatchFields(fields, line.unitDetailRows, quantity);
  return {
    ...line,
    unitDetailRows: rowsForSaleLine(
      line.saleType,
      quantity,
      keepCurrent ? line.unitDetailRows : [],
      fields,
    ),
  };
}

export function saleLineTotal(line: Pick<SaleItemLine, 'rate' | 'quantity'>): number {
  const rate = Number(line.rate) || 0;
  const qty = Number(line.quantity) || 0;
  return roundMoney(rate * qty);
}

export function grandTotalFromLines(lines: SaleItemLine[]): number {
  return roundMoney(
    lines.reduce((sum, line) => {
      if (!line.itemName.trim() || Number(line.rate) <= 0) return sum;
      return sum + saleLineTotal(line);
    }, 0),
  );
}

type CatalogItem = {
  id: string;
  name: string;
  saleRate: number | string;
  identifierFields?: ItemIdentifierField[] | null;
};

export function applyCatalogToLine(
  line: SaleItemLine,
  item: CatalogItem | undefined,
  itemId: string,
): SaleItemLine {
  if (!item) {
    return {
      ...line,
      catalogItemId: '',
      itemName: '',
      rate: '',
      saleType: 'general',
      unitDetailRows: [],
    };
  }
  const catalogSaleType = saleTypeFromIdentifierFields(item.identifierFields);
  const saleType = catalogSaleType !== 'general' ? catalogSaleType : line.saleType;
  const typeChanged = saleType !== line.saleType;
  const nextLine: SaleItemLine = {
    ...line,
    catalogItemId: itemId,
    itemName: item.name,
    rate: String(item.saleRate),
    saleType,
    unitDetailRows: typeChanged ? [] : line.unitDetailRows,
  };
  return syncLineUnitDetails(nextLine, [item], typeChanged);
}
