'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { StepFormModal } from '@/components/ui/step-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { fmtMoney } from '@/lib/format';
import { useDebounce } from '@/hooks/use-debounce';
import { ItemIdentifierFieldsEditor } from '@/components/forms/item-identifier-fields-editor';
import type { Company, Item, ItemIdentifierField } from '@inventory-urdu/shared';
import { normalizeIdentifierFields } from '@inventory-urdu/shared';

type ItemRow = Item & { company?: { id: string; name: string } };

const emptyForm = {
  companyId: '',
  name: '',
  model: '',
  purchaseRate: '',
  saleRate: '',
  identifierFields: [] as ItemIdentifierField[],
};

export default function ItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<ItemRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<ItemRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const debouncedQ = useDebounce(searchQ, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [itemsRes, companiesRes] = await Promise.all([
        api.get('/items', { params: { page, limit: 12, q: debouncedQ.trim() || undefined } }),
        api.get('/companies'),
      ]);
      const rows = Array.isArray(itemsRes.data?.data) ? (itemsRes.data.data as ItemRow[]) : [];
      setItems(rows);
      setTotalItems(itemsRes.data?.meta?.total ?? rows.length);
      setCompanies(Array.isArray(companiesRes.data?.data) ? (companiesRes.data.data as Company[]) : []);
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ]);

  function openAdd() {
    setForm({ ...emptyForm, companyId: companies[0]?.id ?? '' });
    setAddOpen(true);
  }

  function openEdit(row: ItemRow) {
    setEditRow(row);
    setForm({
      companyId: row.company?.id ?? row.companyId,
      name: row.name,
      model: row.model ?? '',
      purchaseRate: String(row.purchaseRate),
      saleRate: String(row.saleRate),
      identifierFields: normalizeIdentifierFields(row.identifierFields),
    });
  }

  async function onAdd() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/items', {
        companyId: form.companyId,
        name: form.name,
        model: form.model || undefined,
        purchaseRate: Number(form.purchaseRate),
        saleRate: Number(form.saleRate),
        identifierFields: normalizeIdentifierFields(form.identifierFields),
      });
      setAddOpen(false);
      await load();
      notify.created('آئٹم');
    } catch (err) {
      setError('آئٹم شامل نہیں ہو سکا');
      notify.fail('آئٹم شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow) return;
    setSubmitting(true);
    try {
      await api.patch(`/items/${editRow.id}`, {
        companyId: form.companyId,
        name: form.name,
        model: form.model || undefined,
        purchaseRate: Number(form.purchaseRate),
        saleRate: Number(form.saleRate),
        identifierFields: normalizeIdentifierFields(form.identifierFields),
      });
      setEditRow(null);
      await load();
      notify.updated('آئٹم');
    } catch (err) {
      setError('آئٹم اپڈیٹ نہیں ہو سکا');
      notify.fail('آئٹم اپڈیٹ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/items/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('آئٹم');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const itemSteps = useMemo(
    () => [
      {
        title: 'مصنوعات',
        description: 'کمپنی، نام اور ماڈل',
        validate: () => Boolean(form.companyId && form.name.trim()),
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="کمپنی" className="sm:col-span-2">
              <QuickAddSelect
                entity="company"
                value={form.companyId}
                onChange={(id) => setForm({ ...form, companyId: id })}
                required
                options={companies.map((c) => ({ value: c.id, label: c.name }))}
                onOptionAdded={(record) => {
                  const company = record as Company;
                  setCompanies((prev) => [...prev, company]);
                  setForm((f) => ({ ...f, companyId: company.id }));
                }}
              >
                {companies.length === 0 ? <option value="">پہلے کمپنی شامل کریں</option> : null}
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </QuickAddSelect>
            </FormField>
            <FormField label="نام">
              <UrduNameInput value={form.name} onChange={(name) => setForm({ ...form, name })} required />
            </FormField>
            <FormField label="ماڈل">
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </FormField>
          </div>
        ),
      },
      {
        title: 'ریٹ',
        description: 'خرید اور فروخت ریٹ',
        validate: () => Number(form.purchaseRate) >= 0 && Number(form.saleRate) >= 0 && form.purchaseRate !== '' && form.saleRate !== '',
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="خرید ریٹ">
              <Input type="number" min={0} step="0.01" value={form.purchaseRate} onChange={(e) => setForm({ ...form, purchaseRate: e.target.value })} required dir="ltr" className="text-left" />
            </FormField>
            <FormField label="فروخت ریٹ">
              <Input type="number" min={0} step="0.01" value={form.saleRate} onChange={(e) => setForm({ ...form, saleRate: e.target.value })} required dir="ltr" className="text-left" />
            </FormField>
          </div>
        ),
      },
      {
        title: 'آئٹم کی قسم',
        description: 'موبائل یا موٹر سائیکل',
        validate: () => true,
        content: (
          <ItemIdentifierFieldsEditor
            value={form.identifierFields}
            onChange={(identifierFields) => setForm({ ...form, identifierFields })}
          />
        ),
      },
    ],
    [form, companies],
  );

  const columns: DataTableColumn<ItemRow>[] = [
    { id: 'code', header: 'کوڈ', cell: (r) => <span dir="ltr" className="font-mono text-slate-600">{r.itemCode}</span> },
    { id: 'name', header: 'نام', cell: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
    { id: 'company', header: 'کمپنی', cell: (r) => r.company?.name ?? '—' },
    { id: 'model', header: 'ماڈل', cell: (r) => r.model ?? '—' },
    {
      id: 'identifiers',
      header: 'شناخت',
      cell: (r) =>
        normalizeIdentifierFields(r.identifierFields).length > 0 ? (
          <span className="text-xs text-emerald-700">ہاں</span>
        ) : (
          '—'
        ),
    },
    { id: 'purchase', header: 'خرید', cell: (r) => <span dir="ltr">{fmtMoney(r.purchaseRate)}</span> },
    { id: 'sale', header: 'فروخت', cell: (r) => <span dir="ltr" className="font-medium text-emerald-800">{fmtMoney(r.saleRate)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} disabled={loading} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نیا آئٹم
        </Button>
      </PageToolbar>
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={items}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        pageSize={12}
        paginationMode="server"
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        searchValue={searchQ}
        onSearchChange={setSearchQ}
        searchPlaceholder="نام، ماڈل، کوڈ…"
        emptyDescription="پہلا آئٹم شامل کریں"
        emptyAction={
          <Button type="button" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            نیا آئٹم
          </Button>
        }
        actions={(row) => (
          <TableRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteRow(row)} />
        )}
      />

      <StepFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا آئٹم"
        description="مصنوعات کا ریکارڈ شامل کریں"
        size="lg"
        steps={itemSteps}
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="شامل کریں"
        formId="add-item-form"
      />

      <StepFormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="آئٹم ترمیم"
        size="lg"
        steps={itemSteps}
        onSubmit={onSaveEdit}
        submitting={submitting}
        formId="edit-item-form"
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="آئٹم حذف کریں"
        message={`کیا "${deleteRow?.name}" حذف کریں؟`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
