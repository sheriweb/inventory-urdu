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
import { TableRowActions } from '@/components/ui/table-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { ClaimType, type Item, type Staff } from '@inventory-urdu/shared';
import { CLAIM_TYPE_LABELS } from '@/lib/labels';
import { fmtDate, todayInputValue } from '@/lib/format';

type ClaimRow = {
  id: string;
  type: ClaimType;
  itemCode: number;
  itemName: string;
  staffName: string | null;
  customerName: string | null;
  quantity: number;
  detail?: string | null;
  claimDate: string;
};

type ItemRow = Item;
type CustomerRow = { id: string; name: string };

const emptyClaimForm = {
  type: ClaimType.SHOP as ClaimType,
  itemId: '',
  staffId: '',
  customerId: '',
  quantity: '',
  detail: '',
  claimDate: todayInputValue(),
};

export default function ClaimsPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [rows, setRows] = useState<ClaimRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [claimForm, setClaimForm] = useState(emptyClaimForm);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<ClaimRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      const { data } = await api.get('/claims', { params });
      setRows(data.data as ClaimRow[]);
    } catch {
      setError('کلیم ریکارڈ لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  const loadFormData = useCallback(async () => {
    setFormLoading(true);
    try {
      const [itemsRes, staffRes, customersRes] = await Promise.all([
        api.get('/items'),
        api.get('/staff'),
        api.get('/customers'),
      ]);
      const itemList = (itemsRes.data.data as ItemRow[]).filter((i) => i.isActive);
      setItems(itemList);
      setStaff((staffRes.data.data as Staff[]).filter((s) => s.isActive));
      setCustomers(customersRes.data.data as CustomerRow[]);
      setClaimForm((prev) => ({
        ...prev,
        itemId: prev.itemId || itemList[0]?.id || '',
        claimDate: todayInputValue(),
      }));
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا');
    } finally {
      setFormLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setClaimForm({ ...emptyClaimForm, claimDate: todayInputValue() });
    setAddOpen(true);
    if (items.length === 0) loadFormData();
  }

  async function onAddClaim() {
    const qty = Number(claimForm.quantity);
    if (!claimForm.itemId || !qty) {
      setError('آئٹم اور مقدار درج کریں');
      return;
    }
    if (claimForm.type === ClaimType.CUSTOMER && !claimForm.customerId) {
      setError('گاہک منتخب کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/claims', {
        type: claimForm.type,
        itemId: claimForm.itemId,
        staffId: claimForm.staffId || undefined,
        customerId: claimForm.type === ClaimType.CUSTOMER ? claimForm.customerId : undefined,
        quantity: qty,
        detail: claimForm.detail.trim() || undefined,
        claimDate: claimForm.claimDate,
      });
      setAddOpen(false);
      await load();
      notify.created('کلیم');
    } catch (err) {
      setError('کلیم درج نہیں ہو سکی');
      notify.fail('کلیم درج', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/claims/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('کلیم');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<ClaimRow>[] = useMemo(
    () => [
      { id: 'date', header: 'تاریخ', cell: (r) => fmtDate(r.claimDate) },
      {
        id: 'type',
        header: 'قسم',
        cell: (r) => (
          <Badge variant={r.type === ClaimType.SHOP ? 'default' : 'warning'}>{CLAIM_TYPE_LABELS[r.type]}</Badge>
        ),
      },
      { id: 'item', header: 'آئٹم', cell: (r) => `${r.itemCode} — ${r.itemName}` },
      { id: 'qty', header: 'مقدار', cell: (r) => r.quantity },
      { id: 'staff', header: 'عملہ', cell: (r) => r.staffName ?? '—' },
      { id: 'customer', header: 'گاہک', cell: (r) => r.customerName ?? '—' },
      {
        id: 'detail',
        header: 'تفصیل',
        cell: (r) => <span className="block max-w-[200px] truncate">{r.detail ?? '—'}</span>,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نیا کلیم
        </Button>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card>
        <CardContent className="p-4">
          <FormField label="قسم کا فلٹر" className="max-w-xs">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">— تمام —</option>
              <option value={ClaimType.SHOP}>{CLAIM_TYPE_LABELS[ClaimType.SHOP]}</option>
              <option value={ClaimType.CUSTOMER}>{CLAIM_TYPE_LABELS[ClaimType.CUSTOMER]}</option>
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchKeys={(r) => `${r.itemName} ${r.itemCode} ${r.staffName ?? ''} ${r.customerName ?? ''} ${r.detail ?? ''}`}
        emptyTitle="کوئی کلیم نہیں"
        emptyDescription="اوپر «نیا کلیم» بٹن سے کلیم درج کریں"
        actions={(row) => <TableRowActions onDelete={() => setDeleteRow(row)} />}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا کلیم"
        description="دکان یا گاہک کی کلیم درج کریں"
        size="md"
        onSubmit={onAddClaim}
        submitting={submitting}
        submitLabel="کلیم درج کریں"
        formId="add-claim-form"
      >
        {formLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="کلیم کی قسم" className="sm:col-span-2">
              <Select
                value={claimForm.type}
                onChange={(e) => setClaimForm({ ...claimForm, type: e.target.value as ClaimType })}
              >
                <option value={ClaimType.SHOP}>دکان کلیم</option>
                <option value={ClaimType.CUSTOMER}>گاہک کلیم</option>
              </Select>
            </FormField>
            <FormField label="آئٹم" className="sm:col-span-2">
              <QuickAddSelect
                entity="item"
                value={claimForm.itemId}
                onChange={(id) => setClaimForm({ ...claimForm, itemId: id })}
                required
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.itemCode} — ${item.name}`,
                }))}
                onOptionAdded={(record) => {
                  const item = record as ItemRow;
                  setItems((prev) => [...prev, item]);
                  setClaimForm((prev) => ({ ...prev, itemId: item.id }));
                }}
              />
            </FormField>
            <FormField label="عملہ (اختیاری)">
              <QuickAddSelect
                entity="staff"
                value={claimForm.staffId}
                onChange={(id) => setClaimForm({ ...claimForm, staffId: id })}
                placeholder="—"
                options={staff.map((s) => ({ value: s.id, label: s.name }))}
                onOptionAdded={(record) => setStaff((prev) => [...prev, record as Staff])}
              />
            </FormField>
            <FormField label="مقدار">
              <Input
                type="number"
                min={1}
                value={claimForm.quantity}
                onChange={(e) => setClaimForm({ ...claimForm, quantity: e.target.value })}
                required
                dir="ltr"
                className="text-left"
              />
            </FormField>
            {claimForm.type === ClaimType.CUSTOMER ? (
              <FormField label="گاہک" className="sm:col-span-2">
                <QuickAddSelect
                  entity="customer"
                  value={claimForm.customerId}
                  onChange={(id) => setClaimForm({ ...claimForm, customerId: id })}
                  required
                  placeholder="گاہک منتخب کریں"
                  options={customers.map((c) => ({ value: c.id, label: c.name }))}
                  onOptionAdded={(record) => {
                    const c = record as CustomerRow;
                    setCustomers((prev) => [...prev, c]);
                    setClaimForm((prev) => ({ ...prev, customerId: c.id }));
                  }}
                />
              </FormField>
            ) : null}
            <FormField label="تاریخ">
              <Input
                type="date"
                value={claimForm.claimDate}
                onChange={(e) => setClaimForm({ ...claimForm, claimDate: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="تفصیل" className="sm:col-span-2">
              <Input value={claimForm.detail} onChange={(e) => setClaimForm({ ...claimForm, detail: e.target.value })} />
            </FormField>
          </div>
        )}
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="کلیم حذف کریں"
        message="کیا یہ کلیم ریکارڈ حذف کریں؟"
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
