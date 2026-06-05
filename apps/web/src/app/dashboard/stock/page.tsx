'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FormModal } from '@/components/ui/form-modal';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { fmtMoney, todayInputValue } from '@/lib/format';
import type { Item } from '@inventory-urdu/shared';
import { STOCK_STATUS_LABELS } from '@/lib/labels';

type ItemOption = Item & { company?: { name: string } };

type StockRow = {
  id: string;
  itemCode: number;
  name: string;
  companyName: string;
  model?: string | null;
  stockQuantity: number;
  status: 'OK' | 'LOW' | 'OUT';
  stockValue: number;
};

type StockResponse = {
  rows: StockRow[];
  summary: { totalItems: number; outOfStock: number; lowStock: number; totalValue: number };
};

type StatusFilter = '' | 'OK' | 'LOW' | 'OUT';

const STATUS_LABELS = STOCK_STATUS_LABELS;

const emptyAddForm = {
  itemId: '',
  quantity: '',
  supplier: '',
  note: '',
  movementDate: todayInputValue(),
};

export default function StockPage() {
  const [data, setData] = useState<StockResponse | null>(null);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: res } = await api.get('/stock/status');
      setData(res.data as StockResponse);
    } catch {
      setError('اسٹاک لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const { data: res } = await api.get('/items');
      const list = (res.data as ItemOption[]).filter((i) => i.isActive);
      setItems(list);
      setAddForm((prev) => ({ ...prev, itemId: prev.itemId || list[0]?.id || '' }));
    } catch {
      setError('آئٹمز لوڈ نہیں ہو سکے');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setAddForm({ ...emptyAddForm, movementDate: todayInputValue() });
    setAddOpen(true);
    if (items.length === 0) loadItems();
  }

  async function onAddStock() {
    const qty = Number(addForm.quantity);
    if (!addForm.itemId || !qty || qty < 1) {
      setError('درست آئٹم اور مقدار درج کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/stock/in', {
        itemId: addForm.itemId,
        quantity: qty,
        supplier: addForm.supplier.trim() || undefined,
        note: addForm.note.trim() || undefined,
        movementDate: addForm.movementDate,
      });
      setAddOpen(false);
      await load();
      notify.created('اسٹاک', 'اسٹاک کامیابی سے شامل ہو گیا');
    } catch (err) {
      setError('اسٹاک شامل نہیں ہو سکا');
      notify.fail('اسٹاک شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  const filteredRows = useMemo(() => {
    const rows = data?.rows ?? [];
    if (!statusFilter) return rows;
    return rows.filter((r) => r.status === statusFilter);
  }, [data?.rows, statusFilter]);

  const selectedItem = items.find((i) => i.id === addForm.itemId);

  const columns: DataTableColumn<StockRow>[] = useMemo(
    () => [
      { id: 'code', header: 'کوڈ', cell: (r) => <span dir="ltr" className="font-mono">{r.itemCode}</span> },
      { id: 'name', header: 'نام', cell: (r) => <span className="font-semibold">{r.name}</span> },
      { id: 'company', header: 'کمپنی', cell: (r) => r.companyName },
      { id: 'model', header: 'ماڈل', cell: (r) => r.model ?? '—' },
      {
        id: 'qty',
        header: 'مقدار',
        cell: (r) => (
          <Badge variant={r.stockQuantity > 0 ? 'success' : 'warning'}>{r.stockQuantity}</Badge>
        ),
      },
      {
        id: 'status',
        header: 'حالت',
        cell: (r) => (
          <Badge variant={r.status === 'OK' ? 'success' : r.status === 'LOW' ? 'warning' : 'default'}>
            {STATUS_LABELS[r.status]}
          </Badge>
        ),
      },
      { id: 'value', header: 'قیمت', cell: (r) => <span dir="ltr">{fmtMoney(r.stockValue)}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          اسٹاک شامل کریں
        </Button>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      {data?.summary ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل آئٹمز</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{data.summary.totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کم اسٹاک</p>
              <p className="mt-1 text-2xl font-bold text-amber-800">{data.summary.lowStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">خالی</p>
              <p className="mt-1 text-2xl font-bold text-red-700">{data.summary.outOfStock}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل قیمت</p>
              <p className="mt-1 text-2xl font-bold text-emerald-800">{fmtMoney(data.summary.totalValue)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardContent className="p-4">
          <FormField label="حالت کا فلٹر" className="max-w-xs">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="">— تمام —</option>
              <option value="OK">{STATUS_LABELS.OK}</option>
              <option value="LOW">{STATUS_LABELS.LOW}</option>
              <option value="OUT">{STATUS_LABELS.OUT}</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <DataTable
        data={filteredRows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        pageSize={15}
        searchKeys={(r) => `${r.itemCode} ${r.name} ${r.companyName} ${r.model ?? ''} ${STATUS_LABELS[r.status]}`}
        emptyTitle="کوئی آئٹم نہیں"
        emptyDescription={statusFilter ? 'اس فلٹر کے تحت کوئی ریکارڈ نہیں' : undefined}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="اسٹاک شامل کریں"
        description="گودام میں آئٹم کی مقدار بڑھائیں"
        size="md"
        onSubmit={onAddStock}
        submitting={submitting}
        submitLabel="اسٹاک شامل کریں"
        formId="add-stock-form"
      >
        {itemsLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">آئٹمز لوڈ ہو رہے ہیں…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="آئٹم" className="sm:col-span-2">
              <QuickAddSelect
                entity="item"
                value={addForm.itemId}
                onChange={(id) => setAddForm({ ...addForm, itemId: id })}
                required
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.itemCode} — ${item.name}${item.company?.name ? ` (${item.company.name})` : ''}`,
                }))}
                onOptionAdded={(record) => {
                  const item = record as ItemOption;
                  setItems((prev) => [...prev, item]);
                  setAddForm((prev) => ({ ...prev, itemId: item.id }));
                }}
              >
                {items.length === 0 ? <option value="">پہلے آئٹم بنائیں</option> : null}
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.itemCode} — {item.name}
                  </option>
                ))}
              </QuickAddSelect>
            </FormField>
            {selectedItem ? (
              <div className="sm:col-span-2">
                <Badge variant="muted">موجودہ اسٹاک: {selectedItem.stockQuantity ?? 0}</Badge>
              </div>
            ) : null}
            <FormField label="مقدار">
              <Input
                type="number"
                min={1}
                step={1}
                value={addForm.quantity}
                onChange={(e) => setAddForm({ ...addForm, quantity: e.target.value })}
                required
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="تاریخ">
              <Input
                type="date"
                value={addForm.movementDate}
                onChange={(e) => setAddForm({ ...addForm, movementDate: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="سپلائر (اختیاری)" className="sm:col-span-2">
              <Input
                value={addForm.supplier}
                onChange={(e) => setAddForm({ ...addForm, supplier: e.target.value })}
                placeholder="سپلائر کا نام"
              />
            </FormField>
            <FormField label="نوٹ (اختیاری)" className="sm:col-span-2">
              <Input value={addForm.note} onChange={(e) => setAddForm({ ...addForm, note: e.target.value })} />
            </FormField>
          </div>
        )}
      </FormModal>
    </div>
  );
}
