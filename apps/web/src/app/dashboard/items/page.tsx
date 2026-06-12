'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { listFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CompanySearchSelect } from '@/components/forms/company-search-select';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { FormModal } from '@/components/ui/form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { getApiErrorMessage } from '@/lib/notify';
import { fmtMoney } from '@/lib/format';
import { useDebounce } from '@/hooks/use-debounce';
import {
  MOBILE_STORAGE_PRESETS,
  identifierFieldsForSaleType,
  itemCatalogLabel,
  normalizeIdentifierFields,
  saleTypeFromIdentifierFields,
  type Company,
  type Item,
  type ItemIdentifierField,
} from '@inventory-urdu/shared';

type ItemRow = Item & { company?: { id: string; name: string } };

type ItemFormState = {
  companyId: string;
  name: string;
  model: string;
  storage: string;
  purchaseRate: string;
  saleRate: string;
  identifierFields: ItemIdentifierField[];
};

const emptyForm: ItemFormState = {
  companyId: '',
  name: '',
  model: '',
  storage: '',
  purchaseRate: '',
  saleRate: '',
  identifierFields: identifierFieldsForSaleType('mobile'),
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="col-span-full border-b border-slate-100 pb-1 text-xs font-semibold text-slate-600">
      {children}
    </p>
  );
}

function ItemFormBody({
  form,
  setForm,
  companies,
  setCompanies,
}: {
  form: ItemFormState;
  setForm: React.Dispatch<React.SetStateAction<ItemFormState>>;
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
}) {
  const isMobile = saleTypeFromIdentifierFields(form.identifierFields) === 'mobile';

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SectionTitle>مصنوعات</SectionTitle>
      <div className="col-span-full grid gap-4 sm:grid-cols-3">
        <FormField label="نام">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
        </FormField>
        <FormField label="ماڈل">
          <Input
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            dir="ltr"
            className="text-left"
            placeholder="Note 60 Pro"
          />
        </FormField>
        <FormField label="کمپنی">
          <CompanySearchSelect
            companies={companies}
            value={form.companyId}
            onChange={(companyId) => setForm({ ...form, companyId })}
            onCompanyAdded={(company) => {
              setCompanies((prev) => [...prev, company]);
              setForm((f) => ({ ...f, companyId: company.id }));
            }}
            required
            placeholder={companies.length === 0 ? 'پہلے کمپنی شامل کریں' : 'کمپنی تلاش کریں'}
          />
        </FormField>
      </div>
      {isMobile ? (
        <FormField label="سٹوریج (RAM/GB)" className="sm:col-span-2">
          <div className="grid gap-2 sm:grid-cols-2">
            <Select
              value={MOBILE_STORAGE_PRESETS.includes(form.storage as (typeof MOBILE_STORAGE_PRESETS)[number]) ? form.storage : ''}
              onChange={(e) => setForm({ ...form, storage: e.target.value })}
            >
              <option value="">— تیز انتخاب —</option>
              {MOBILE_STORAGE_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset}
                </option>
              ))}
            </Select>
            <Input
              value={form.storage}
              onChange={(e) => setForm({ ...form, storage: e.target.value })}
              dir="ltr"
              className="text-left"
              placeholder="4/64 یا 8/128"
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">مثلاً 8/128 = 8GB RAM، 128GB سٹوریج</p>
        </FormField>
      ) : null}

      <SectionTitle>ریٹ</SectionTitle>
      <FormField label="خرید ریٹ">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.purchaseRate}
          onChange={(e) => setForm({ ...form, purchaseRate: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
      </FormField>
      <FormField label="فروخت ریٹ">
        <Input
          type="number"
          min={0}
          step="0.01"
          value={form.saleRate}
          onChange={(e) => setForm({ ...form, saleRate: e.target.value })}
          required
          dir="ltr"
          className="text-left"
        />
      </FormField>

    </div>
  );
}

function formIsValid(form: ItemFormState): boolean {
  if (!form.companyId || !form.name.trim()) return false;
  if (form.purchaseRate === '' || form.saleRate === '') return false;
  if (Number(form.purchaseRate) < 0 || Number(form.saleRate) < 0) return false;
  return true;
}

function toApiPayload(form: ItemFormState) {
  const identifierFields = normalizeIdentifierFields(form.identifierFields);
  return {
    companyId: form.companyId,
    name: form.name.trim(),
    model: form.model.trim() || undefined,
    storage:
      saleTypeFromIdentifierFields(form.identifierFields) === 'mobile' && form.storage.trim()
        ? form.storage.trim()
        : undefined,
    purchaseRate: Number(form.purchaseRate),
    saleRate: Number(form.saleRate),
    ...(identifierFields.length > 0 ? { identifierFields } : {}),
  };
}

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
      const { rows, total } = listFromResponse<ItemRow>(itemsRes);
      setItems(rows);
      setTotalItems(total);
      setCompanies(listFromResponse<Company>(companiesRes).rows);
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
      storage: row.storage ?? '',
      purchaseRate: String(row.purchaseRate),
      saleRate: String(row.saleRate),
      identifierFields: normalizeIdentifierFields(row.identifierFields),
    });
  }

  async function onAdd() {
    if (!formIsValid(form)) {
      notify.error('تمام ضروری فیلڈز بھریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/items', toApiPayload(form));
      setAddOpen(false);
      await load();
      notify.created('آئٹم');
    } catch (err) {
      setError(getApiErrorMessage(err, 'آئٹم شامل نہیں ہو سکا'));
      notify.fail('آئٹم شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow || !formIsValid(form)) {
      notify.error('تمام ضروری فیلڈز بھریں');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/items/${editRow.id}`, toApiPayload(form));
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

  const columns: DataTableColumn<ItemRow>[] = useMemo(
    () => [
      {
        id: 'code',
        header: 'کوڈ',
        cell: (r) => (
          <span dir="ltr" className="font-mono text-slate-600">
            {r.itemCode}
          </span>
        ),
      },
      {
        id: 'name',
        header: 'نام',
        cell: (r) => <span className="font-semibold text-slate-900">{itemCatalogLabel(r)}</span>,
      },
      { id: 'company', header: 'کمپنی', cell: (r) => r.company?.name ?? '—' },
      { id: 'model', header: 'ماڈل', cell: (r) => r.model ?? '—' },
      { id: 'storage', header: 'سٹوریج', cell: (r) => (r.storage ? <span dir="ltr">{r.storage}</span> : '—') },
      {
        id: 'identifiers',
        header: 'قسم',
        cell: (r) => {
          const type = saleTypeFromIdentifierFields(r.identifierFields);
          if (type === 'mobile') return <span className="text-xs text-emerald-700">موبائل</span>;
          if (type === 'bike') return <span className="text-xs text-emerald-700">بائیک</span>;
          return '—';
        },
      },
      { id: 'purchase', header: 'خرید', cell: (r) => <span dir="ltr">{fmtMoney(r.purchaseRate)}</span> },
      {
        id: 'sale',
        header: 'فروخت',
        cell: (r) => (
          <span dir="ltr" className="font-medium text-emerald-800">
            {fmtMoney(r.saleRate)}
          </span>
        ),
      },
    ],
    [],
  );

  const formBody = (
    <ItemFormBody form={form} setForm={setForm} companies={companies} setCompanies={setCompanies} />
  );

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
        searchPlaceholder="نام، ماڈل، سٹوریج، کوڈ…"
        emptyDescription="پہلا آئٹم شامل کریں"
        emptyAction={
          <Button type="button" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            نیا آئٹم
          </Button>
        }
        actions={(row) => <TableRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteRow(row)} />}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا آئٹم"
        description="مصنوعات کا ریکارڈ شامل کریں"
        size="lg"
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="شامل کریں"
        formId="add-item-form"
      >
        {formBody}
      </FormModal>

      <FormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="آئٹم ترمیم"
        size="lg"
        onSubmit={onSaveEdit}
        submitting={submitting}
        formId="edit-item-form"
      >
        {formBody}
      </FormModal>

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
