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
import type { Area } from '@inventory-urdu/shared';

export default function AreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<Area | null>(null);
  const [editName, setEditName] = useState('');
  const [deleteRow, setDeleteRow] = useState<Area | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/areas');
      setAreas(asArray<Area>(data?.data));
    } catch {
      setError('علاقے لوڈ نہیں ہو سکے');
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

  function openEdit(row: Area) {
    setEditRow(row);
    setEditName(row.name);
  }

  async function onAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      notify.error('علاقے کا نام درج کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post('/areas', { name: trimmed });
      setAddOpen(false);
      await load();
      notify.created('علاقہ');
    } catch (err) {
      setError('علاقہ شامل نہیں ہو سکا');
      notify.fail('علاقہ شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      notify.error('علاقے کا نام درج کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/areas/${editRow.id}`, { name: trimmed });
      setEditRow(null);
      await load();
      notify.updated('علاقہ');
    } catch (err) {
      setError('علاقہ اپڈیٹ نہیں ہو سکا');
      notify.fail('علاقہ اپڈیٹ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/areas/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('علاقہ');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const columns: DataTableColumn<Area>[] = [
    { id: 'name', header: 'علاقہ', cell: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نیا علاقہ
        </Button>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={areas}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchKeys={(r) => r.name}
        searchPlaceholder="علاقہ تلاش کریں…"
        emptyTitle="کوئی علاقہ نہیں"
        emptyDescription="اوپر بٹن سے پہلا علاقہ شامل کریں"
        actions={(row) => (
          <TableRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteRow(row)} />
        )}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا علاقہ"
        description="نیا علاقہ شامل کریں"
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="شامل کریں"
        formId="add-area-form"
      >
        <div className="grid gap-4">
          <FormField label="علاقہ">
            <UrduNameInput value={name} onChange={setName} required placeholder="علاقے کا نام" autoFocus />
          </FormField>
        </div>
      </FormModal>

      <FormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="علاقہ ترمیم"
        description="علاقے کی تفصیل اپڈیٹ کریں"
        onSubmit={onSaveEdit}
        submitting={submitting}
        formId="edit-area-form"
      >
        <div className="grid gap-4">
          <FormField label="علاقہ">
            <UrduNameInput value={editName} onChange={setEditName} required />
          </FormField>
        </div>
      </FormModal>

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="علاقہ حذف کریں"
        message={`کیا "${deleteRow?.name}" حذف کریں؟ یہ عمل واپس نہیں ہو سکتا۔`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
