'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { asArray } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { FormModal } from '@/components/ui/form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import type { Company } from '@inventory-urdu/shared';

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Company | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteRow, setDeleteRow] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/companies');
      setCompanies(asArray<Company>(data?.data));
    } catch {
      setError('کمپنیاں لوڈ نہیں ہو سکیں');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setName('');
    setAddOpen(true);
  }

  function openEdit(row: Company) {
    setEditRow(row);
    setEditName(row.name);
  }

  async function onAdd() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/companies', { name });
      setAddOpen(false);
      setName('');
      await load();
      notify.created('کمپنی');
    } catch (err) {
      setError('کمپنی شامل نہیں ہو سکی');
      notify.fail('کمپنی شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow) return;
    setSubmitting(true);
    try {
      await api.patch(`/companies/${editRow.id}`, { name: editName });
      setEditRow(null);
      await load();
      notify.updated('کمپنی');
    } catch (err) {
      setError('کمپنی اپڈیٹ نہیں ہو سکی');
      notify.fail('کمپنی اپڈیٹ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/companies/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('کمپنی');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<Company>[] = [
    { id: 'name', header: 'نام', cell: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نئی کمپنی
        </Button>
      </PageToolbar>
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={companies}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchKeys={(r) => r.name}
        emptyTitle="کوئی کمپنی نہیں"
        emptyDescription="اوپر بٹن سے پہلی کمپنی شامل کریں"
        actions={(row) => (
          <TableRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteRow(row)} />
        )}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نئی کمپنی"
        description="مصنوعات کی کمپنی شامل کریں"
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="شامل کریں"
        formId="add-company-form"
      >
        <FormField label="نام">
          <UrduNameInput value={name} onChange={setName} required placeholder="کمپنی کا نام" autoFocus />
        </FormField>
      </FormModal>

      <FormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="کمپنی ترمیم"
        onSubmit={onSaveEdit}
        submitting={submitting}
        formId="edit-company-form"
      >
        <FormField label="نام">
          <UrduNameInput value={editName} onChange={setEditName} required />
        </FormField>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="کمپنی حذف کریں"
        message={`کیا "${deleteRow?.name}" حذف کریں؟`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
