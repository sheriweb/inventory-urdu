'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Undo2 } from 'lucide-react';
import api from '@/lib/api';
import { asArray, listFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { StaffType, type Item, type Staff } from '@inventory-urdu/shared';
import { fmtMoney, todayInputValue } from '@/lib/format';

type ItemRow = Item & { company?: { name: string } };

type InventoryRow = {
  staffId: string;
  staffName: string;
  itemCode: number;
  itemName: string;
  quantity: number;
  saleRate: string | number;
};

type UnloadInventoryRow = {
  itemId: string;
  itemCode: number;
  itemName: string;
  staffId: string;
  quantity: number;
};

const columns: DataTableColumn<InventoryRow>[] = [
  { id: 'staff', header: 'سیلز مین', cell: (row) => row.staffName },
  { id: 'code', header: 'کوڈ', cell: (row) => <span dir="ltr">{row.itemCode}</span> },
  { id: 'item', header: 'آئٹم', cell: (row) => row.itemName },
  { id: 'qty', header: 'مقدار', cell: (row) => <span className="font-medium">{row.quantity}</span> },
  { id: 'rate', header: 'ریٹ', cell: (row) => <span dir="ltr">{fmtMoney(row.saleRate)}</span> },
];

export default function LoadMgmtHubPage() {
  const [salesmen, setSalesmen] = useState<Staff[]>([]);
  const [staffFilter, setStaffFilter] = useState('');
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [loadOpen, setLoadOpen] = useState(false);
  const [unloadOpen, setUnloadOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [loadItemId, setLoadItemId] = useState('');
  const [loadStaffId, setLoadStaffId] = useState('');
  const [loadQty, setLoadQty] = useState('');
  const [loadNote, setLoadNote] = useState('');
  const [loadDate, setLoadDate] = useState(todayInputValue());

  const [unloadStaffId, setUnloadStaffId] = useState('');
  const [unloadInventory, setUnloadInventory] = useState<UnloadInventoryRow[]>([]);
  const [unloadItemId, setUnloadItemId] = useState('');
  const [unloadQty, setUnloadQty] = useState('');
  const [unloadNote, setUnloadNote] = useState('');
  const [unloadDate, setUnloadDate] = useState(todayInputValue());
  const [formLoading, setFormLoading] = useState(false);

  const load = useCallback(async (sid?: string) => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/loading/inventory', { params: sid ? { staffId: sid } : {} });
      setRows(asArray<InventoryRow>(data?.data));
    } catch {
      setError('اسٹاک لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/staff');
        setSalesmen(
          asArray<Staff>(data?.data).filter((s) => s.isActive && s.type === StaffType.SALESMAN),
        );
      } catch {
        /* ignore */
      }
      await load();
    })();
  }, [load]);

  useEffect(() => {
    load(staffFilter || undefined);
  }, [staffFilter, load]);

  async function loadFormData() {
    setFormLoading(true);
    try {
      const [itemsRes, staffRes] = await Promise.all([api.get('/items'), api.get('/staff')]);
      const itemList = listFromResponse<ItemRow>(itemsRes).rows.filter((i) => i.isActive);
      const staffList = listFromResponse<Staff>(staffRes).rows.filter(
        (s) => s.isActive && s.type === StaffType.SALESMAN,
      );
      setItems(itemList);
      setSalesmen(staffList);
      setLoadItemId(itemList[0]?.id ?? '');
      setLoadStaffId(staffList[0]?.id ?? '');
      setUnloadStaffId(staffList[0]?.id ?? '');
      if (staffList[0]?.id) await refreshUnloadInventory(staffList[0].id);
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا');
    } finally {
      setFormLoading(false);
    }
  }

  async function refreshUnloadInventory(sid: string) {
    if (!sid) {
      setUnloadInventory([]);
      setUnloadItemId('');
      return;
    }
    const { data } = await api.get('/loading/inventory', { params: { staffId: sid } });
    const list = asArray<UnloadInventoryRow>(data?.data);
    setUnloadInventory(list);
    setUnloadItemId(list[0]?.itemId ?? '');
  }

  function openLoad() {
    setLoadQty('');
    setLoadNote('');
    setLoadDate(todayInputValue());
    setLoadOpen(true);
    if (items.length === 0) loadFormData();
  }

  function openUnload() {
    setUnloadQty('');
    setUnloadNote('');
    setUnloadDate(todayInputValue());
    setUnloadOpen(true);
    if (items.length === 0) loadFormData();
  }

  async function onLoad() {
    const qty = Number(loadQty);
    if (!loadItemId || !loadStaffId || !qty) {
      setError('تمام فیلڈز درست بھریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/loading/assign', {
        itemId: loadItemId,
        staffId: loadStaffId,
        quantity: qty,
        note: loadNote.trim() || undefined,
        movementDate: loadDate,
      });
      setLoadOpen(false);
      await load(staffFilter || undefined);
      notify.created('لوڈنگ');
    } catch (err) {
      setError('لوڈنگ نہیں ہو سکی — شاپ اسٹاک چیک کریں');
      notify.fail('لوڈنگ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onUnload() {
    const qty = Number(unloadQty);
    if (!unloadItemId || !unloadStaffId || !qty) {
      setError('تمام فیلڈز درست بھریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/loading/unload', {
        itemId: unloadItemId,
        staffId: unloadStaffId,
        quantity: qty,
        note: unloadNote.trim() || undefined,
        movementDate: unloadDate,
      });
      setUnloadOpen(false);
      await load(staffFilter || undefined);
      notify.created('ان لوڈنگ');
    } catch (err) {
      setError('ان لوڈنگ نہیں ہو سکی');
      notify.fail('ان لوڈنگ', err);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedLoadItem = items.find((i) => i.id === loadItemId);
  const selectedUnload = unloadInventory.find((r) => r.itemId === unloadItemId);

  return (
    <div className="space-y-6">
      <PageToolbar>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openLoad} className="gap-1.5">
            <Plus className="h-4 w-4" />
            لوڈ کریں
          </Button>
          <Button onClick={openUnload} variant="outline" className="gap-1.5">
            <Undo2 className="h-4 w-4" />
            ان لوڈ
          </Button>
        </div>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card>
        <CardContent className="p-4">
          <FormField label="سیلز مین فلٹر" className="max-w-xs">
            <Select value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)}>
              <option value="">— تمام —</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => `${row.staffId}-${row.itemCode}`}
        loading={loading}
        pageSize={12}
        emptyTitle="کوئی اسٹاک نہیں"
        emptyDescription="سیلزمین منتخب کریں یا اوپر لوڈنگ بٹن سے اسٹاک دیں"
        searchKeys={(row) => `${row.staffName} ${row.itemCode} ${row.itemName}`}
      />

      <FormModal
        open={loadOpen}
        onClose={() => setLoadOpen(false)}
        title="سیلزمین لوڈنگ"
        description="گودام سے سیلزمین کو اسٹاک دیں"
        onSubmit={onLoad}
        submitting={submitting}
        submitLabel="لوڈ کریں"
        formId="load-form"
      >
        {formLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="آئٹم" className="sm:col-span-2">
              <QuickAddSelect
                entity="item"
                value={loadItemId}
                onChange={setLoadItemId}
                required
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.itemCode} — ${item.name} (اسٹاک: ${item.stockQuantity ?? 0})`,
                }))}
                onOptionAdded={(record) => {
                  const item = record as ItemRow;
                  setItems((prev) => [...prev, item]);
                  setLoadItemId(item.id);
                }}
              />
            </FormField>
            <FormField label="سیلز مین">
              <QuickAddSelect
                entity="staff"
                staffType={StaffType.SALESMAN}
                value={loadStaffId}
                onChange={setLoadStaffId}
                required
                options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                onOptionAdded={(record) => {
                  const s = record as Staff;
                  setSalesmen((prev) => [...prev, s]);
                  setLoadStaffId(s.id);
                }}
              />
            </FormField>
            <FormField label="مقدار">
              <Input type="number" min={1} value={loadQty} onChange={(e) => setLoadQty(e.target.value)} required dir="ltr" className="text-left" />
            </FormField>
            <FormField label="تاریخ">
              <Input type="date" value={loadDate} onChange={(e) => setLoadDate(e.target.value)} dir="ltr" className="text-left" />
            </FormField>
            <FormField label="نوٹ" className="sm:col-span-2">
              <Input value={loadNote} onChange={(e) => setLoadNote(e.target.value)} />
            </FormField>
            {selectedLoadItem ? (
              <p className="sm:col-span-2 text-sm text-slate-500">دستیاب گودام اسٹاک: {selectedLoadItem.stockQuantity ?? 0}</p>
            ) : null}
          </div>
        )}
      </FormModal>

      <FormModal
        open={unloadOpen}
        onClose={() => setUnloadOpen(false)}
        title="ان لوڈنگ"
        description="سیلزمین سے گودام میں واپسی"
        onSubmit={onUnload}
        submitting={submitting}
        submitLabel="ان لوڈ کریں"
        formId="unload-form"
      >
        {formLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="سیلز مین" className="sm:col-span-2">
              <QuickAddSelect
                entity="staff"
                staffType={StaffType.SALESMAN}
                value={unloadStaffId}
                onChange={async (id) => {
                  setUnloadStaffId(id);
                  await refreshUnloadInventory(id);
                }}
                required
                options={salesmen.map((s) => ({ value: s.id, label: s.name }))}
                onOptionAdded={(record) => {
                  const s = record as Staff;
                  setSalesmen((prev) => [...prev, s]);
                  setUnloadStaffId(s.id);
                }}
              />
            </FormField>
            <FormField label="آئٹم" className="sm:col-span-2">
              <Select value={unloadItemId} onChange={(e) => setUnloadItemId(e.target.value)} required disabled={unloadInventory.length === 0}>
                {unloadInventory.length === 0 ? (
                  <option value="">اس سیلزمین کے پاس اسٹاک نہیں</option>
                ) : (
                  unloadInventory.map((row) => (
                    <option key={row.itemId} value={row.itemId}>
                      {row.itemCode} — {row.itemName} (مقدار: {row.quantity})
                    </option>
                  ))
                )}
              </Select>
            </FormField>
            <FormField label="مقدار">
              <Input
                type="number"
                min={1}
                max={selectedUnload?.quantity}
                value={unloadQty}
                onChange={(e) => setUnloadQty(e.target.value)}
                required
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="تاریخ">
              <Input type="date" value={unloadDate} onChange={(e) => setUnloadDate(e.target.value)} dir="ltr" className="text-left" />
            </FormField>
            <FormField label="نوٹ" className="sm:col-span-2">
              <Input value={unloadNote} onChange={(e) => setUnloadNote(e.target.value)} />
            </FormField>
          </div>
        )}
      </FormModal>
    </div>
  );
}
