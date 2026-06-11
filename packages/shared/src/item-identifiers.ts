export interface ItemIdentifierField {
  key: string;
  label: string;
  required?: boolean;
}

export interface LeaseItemDetailField {
  label: string;
  value: string;
}

export interface LeaseItemUnitDetail {
  unitIndex: number;
  /** نیا فارمیٹ — لیبل + ویلیو */
  fields?: LeaseItemDetailField[];
  /** پرانا فارمیٹ — سازگاری */
  values?: Record<string, string>;
}

export type SaleDetailFieldRow = {
  id: string;
  label: string;
  value: string;
};

export type SaleUnitDetailRows = {
  unitIndex: number;
  rows: SaleDetailFieldRow[];
};

export type ItemIdentifierPresetKey = 'mobile' | 'bike' | 'electronics' | 'general' | 'custom';

/** فروخت / کیٹلاگ — آئٹم کی قسم */
export type ItemSaleType = 'mobile' | 'bike' | 'general';

export const ITEM_SALE_TYPE_LABELS: Record<ItemSaleType, string> = {
  mobile: 'موبائل',
  bike: 'موٹر سائیکل / بائیک',
  general: 'عام آئٹم',
};

export const ITEM_IDENTIFIER_PRESETS: Record<
  Exclude<ItemIdentifierPresetKey, 'custom' | 'general'>,
  { label: string; fields: ItemIdentifierField[] }
> = {
  mobile: {
    label: 'موبائل',
    fields: [
      { key: 'imei_1', label: 'IMEI 1', required: true },
      { key: 'imei_2', label: 'IMEI 2', required: false },
    ],
  },
  bike: {
    label: 'موٹر سائیکل / بائیک',
    fields: [
      { key: 'registration_no', label: 'رجسٹریشن نمبر', required: true },
      { key: 'model', label: 'ماڈل', required: false },
      { key: 'horse_power', label: 'ہارس پاور', required: false },
      { key: 'maker', label: 'میکر', required: false },
      { key: 'chassis_no', label: 'چیسز نمبر', required: true },
      { key: 'engine_no', label: 'انجن نمبر', required: true },
    ],
  },
  electronics: {
    label: 'الیکٹرانکس',
    fields: [{ key: 'serial_no', label: 'سیریل نمبر', required: true }],
  },
};

export function fieldsForSaleType(type: ItemSaleType): ItemIdentifierField[] {
  if (type === 'mobile') {
    return ITEM_IDENTIFIER_PRESETS.mobile.fields.map((field) => ({ ...field }));
  }
  if (type === 'bike') {
    return ITEM_IDENTIFIER_PRESETS.bike.fields.map((field) => ({ ...field }));
  }
  return [];
}

export function saleTypeFromIdentifierFields(
  fields: ItemIdentifierField[] | null | undefined,
): ItemSaleType {
  const keys = new Set(normalizeIdentifierFields(fields).map((field) => field.key));
  if (keys.has('imei') || keys.has('imei_1') || keys.has('imei_2')) return 'mobile';
  if (
    keys.has('frame_no') ||
    keys.has('engine_no') ||
    keys.has('chassis_no') ||
    keys.has('registration_no') ||
    keys.has('horse_power') ||
    keys.has('maker') ||
    (keys.has('model') && !keys.has('imei_1'))
  ) {
    return 'bike';
  }
  return 'general';
}

export function identifierFieldsForSaleType(type: ItemSaleType): ItemIdentifierField[] {
  return fieldsForSaleType(type);
}

export function buildUnitDetailRowsFromFields(
  quantity: number,
  fields: ItemIdentifierField[],
): SaleUnitDetailRows[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const normalized = normalizeIdentifierFields(fields);
  if (normalized.length === 0) return buildUnitDetailRows(qty);

  return Array.from({ length: qty }, (_, index) => ({
    unitIndex: index + 1,
    rows: normalized.map((field) => newSaleDetailRow(field.label, '')),
  }));
}

export function resizeUnitDetailRowsWithFields(
  current: SaleUnitDetailRows[],
  quantity: number,
  fields: ItemIdentifierField[],
): SaleUnitDetailRows[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const normalized = normalizeIdentifierFields(fields);
  if (normalized.length === 0) return resizeUnitDetailRows(current, qty);

  return Array.from({ length: qty }, (_, index) => {
    const unitIndex = index + 1;
    const existing = current.find((unit) => unit.unitIndex === unitIndex);
    return {
      unitIndex,
      rows: normalized.map((field) => {
        const existingRow = existing?.rows.find((row) => row.label === field.label);
        return newSaleDetailRow(field.label, existingRow?.value ?? '');
      }),
    };
  });
}

function slugKey(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return base || `field_${index + 1}`;
}

export function normalizeIdentifierFields(
  fields: ItemIdentifierField[] | null | undefined,
): ItemIdentifierField[] {
  if (!Array.isArray(fields)) return [];
  return fields
    .map((field, index) => ({
      key: (field?.key?.trim() || slugKey(field?.label ?? '', index)).trim(),
      label: (field?.label ?? '').trim(),
      required: Boolean(field?.required),
    }))
    .filter((field) => field.label);
}

export function newSaleDetailRow(label = '', value = ''): SaleDetailFieldRow {
  return { id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, label, value };
}

export function buildUnitDetailRows(
  quantity: number,
  seedLabels: string[] = [],
): SaleUnitDetailRows[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  return Array.from({ length: qty }, (_, index) => ({
    unitIndex: index + 1,
    rows: seedLabels.map((label) => newSaleDetailRow(label, '')),
  }));
}

export function resizeUnitDetailRows(
  current: SaleUnitDetailRows[],
  quantity: number,
  seedLabels: string[] = [],
): SaleUnitDetailRows[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const next = buildUnitDetailRows(qty, seedLabels);
  return next.map((unit) => {
    const existing = current.find((row) => row.unitIndex === unit.unitIndex);
    if (!existing) return unit;
    return {
      unitIndex: unit.unitIndex,
      rows: existing.rows.length > 0 ? existing.rows : unit.rows,
    };
  });
}

export function catalogFieldsToSeedLabels(fields: ItemIdentifierField[] | null | undefined): string[] {
  return normalizeIdentifierFields(fields).map((field) => field.label);
}

export function unitDetailRowsToLeaseFormat(rows: SaleUnitDetailRows[]): LeaseItemUnitDetail[] {
  return rows
    .map((unit) => ({
      unitIndex: unit.unitIndex,
      fields: unit.rows
        .filter((row) => row.label.trim())
        .map((row) => ({
          label: row.label.trim(),
          value: row.value.trim(),
        })),
    }))
    .filter((unit) => unit.fields.length > 0);
}

export function leaseUnitDetailsToRows(
  unitDetails: LeaseItemUnitDetail[] | null | undefined,
  quantity: number,
): SaleUnitDetailRows[] {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const stored = Array.isArray(unitDetails) ? unitDetails : [];
  const base = buildUnitDetailRows(qty);

  return base.map((unit) => {
    const match = stored.find((row) => row.unitIndex === unit.unitIndex);
    if (!match) return unit;

    if (Array.isArray(match.fields) && match.fields.length > 0) {
      return {
        unitIndex: unit.unitIndex,
        rows: match.fields.map((field) =>
          newSaleDetailRow(field.label ?? '', field.value ?? ''),
        ),
      };
    }

    if (match.values && typeof match.values === 'object') {
      return {
        unitIndex: unit.unitIndex,
        rows: Object.entries(match.values).map(([label, value]) =>
          newSaleDetailRow(label.replace(/_/g, ' '), String(value ?? '')),
        ),
      };
    }

    return unit;
  });
}

export function getDisplayFieldsFromUnit(unit: LeaseItemUnitDetail): LeaseItemDetailField[] {
  if (Array.isArray(unit.fields) && unit.fields.length > 0) {
    return unit.fields
      .filter((field) => field.label?.trim() || field.value?.trim())
      .map((field) => ({
        label: (field.label ?? '').trim(),
        value: (field.value ?? '').trim(),
      }));
  }

  if (unit.values && typeof unit.values === 'object') {
    return Object.entries(unit.values)
      .filter(([, value]) => String(value ?? '').trim())
      .map(([key, value]) => ({
        label: key.replace(/_/g, ' '),
        value: String(value ?? '').trim(),
      }));
  }

  return [];
}

export function validateSaleDetailRows(
  rows: SaleUnitDetailRows[],
  quantity: number,
  presetFields: ItemIdentifierField[] = [],
): string | null {
  const qty = Math.max(1, Math.floor(quantity) || 1);
  const normalized = normalizeIdentifierFields(presetFields);

  for (let i = 0; i < qty; i += 1) {
    const unit = rows.find((row) => row.unitIndex === i + 1);
    if (!unit && normalized.length > 0) {
      return qty > 1 ? `یونٹ ${i + 1} کی تفصیل درج کریں` : 'آئٹم کی تفصیل درج کریں';
    }
    if (!unit) continue;

    for (const field of normalized) {
      const row = unit.rows.find((entry) => entry.label === field.label);
      if (field.required && !String(row?.value ?? '').trim()) {
        return qty > 1
          ? `${field.label} (یونٹ ${unit.unitIndex}) درج کریں`
          : `${field.label} درج کریں`;
      }
    }

    for (const row of unit.rows) {
      const label = row.label.trim();
      const value = row.value.trim();
      if (label && !value && normalized.length === 0) {
        return qty > 1
          ? `${label} (یونٹ ${unit.unitIndex}) کی ویلیو درج کریں`
          : `${label} کی ویلیو درج کریں`;
      }
    }
  }

  return null;
}

/** @deprecated پرانے کوڈ کے لیے */
export function buildEmptyUnitDetails(
  quantity: number,
  fields: ItemIdentifierField[],
): LeaseItemUnitDetail[] {
  return unitDetailRowsToLeaseFormat(buildUnitDetailRows(quantity, catalogFieldsToSeedLabels(fields)));
}

/** @deprecated پرانے کوڈ کے لیے */
export function resizeUnitDetails(
  current: LeaseItemUnitDetail[],
  quantity: number,
  fields: ItemIdentifierField[],
): LeaseItemUnitDetail[] {
  const rows = leaseUnitDetailsToRows(current, quantity);
  return unitDetailRowsToLeaseFormat(
    resizeUnitDetailRows(rows, quantity, catalogFieldsToSeedLabels(fields)),
  );
}

/** @deprecated پرانے کوڈ کے لیے */
export function validateUnitDetails(
  fields: ItemIdentifierField[],
  unitDetails: LeaseItemUnitDetail[] | undefined,
  quantity: number,
): string | null {
  const rows = leaseUnitDetailsToRows(unitDetails, quantity);
  const seedLabels = catalogFieldsToSeedLabels(fields);
  if (seedLabels.length === 0) {
    return validateSaleDetailRows(rows, quantity);
  }

  const normalized = normalizeIdentifierFields(fields);
  const qty = Math.max(1, Math.floor(quantity) || 1);
  for (let i = 0; i < qty; i += 1) {
    const unit = rows.find((row) => row.unitIndex === i + 1);
    if (!unit) continue;
    for (const field of normalized) {
      if (!field.required) continue;
      const match = unit.rows.find(
        (row) => row.label.trim() === field.label && row.value.trim(),
      );
      if (!match) {
        return qty > 1
          ? `${field.label} (یونٹ ${i + 1}) درج کریں`
          : `${field.label} درج کریں`;
      }
    }
  }
  return validateSaleDetailRows(rows, quantity);
}
