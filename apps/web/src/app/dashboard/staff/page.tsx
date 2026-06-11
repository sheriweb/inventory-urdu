'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { asArray, listFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { StepFormModal } from '@/components/ui/step-form-modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { Badge } from '@/components/ui/badge';
import { StaffType, type Area, type Staff } from '@inventory-urdu/shared';
import { STAFF_TYPE_LABELS } from '@/lib/labels';
import { cn } from '@/lib/utils';
import { tableMixedTextClassName } from '@/components/ui/table';

type StaffRow = Staff & { area?: { id: string; name: string } | null };

const emptyForm = { name: '', mobile: '', type: StaffType.SALESMAN, areaId: '' };

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<StaffRow | null>(null);
  const [deleteRow, setDeleteRow] = useState<StaffRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [staffRes, areasRes] = await Promise.all([api.get('/staff'), api.get('/areas')]);
      setStaff(listFromResponse<StaffRow>(staffRes).rows);
      setAreas(listFromResponse<Area>(areasRes).rows);
    } catch {
      setError('ڈیٹا لوڈ نہیں ہو سکا');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    setForm(emptyForm);
    setAddOpen(true);
  }

  function openEdit(row: StaffRow) {
    setEditRow(row);
    setForm({
      name: row.name,
      mobile: row.mobile ?? '',
      type: row.type,
      areaId: row.area?.id ?? '',
    });
  }

  async function onAdd() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/staff', {
        name: form.name,
        mobile: form.mobile || undefined,
        type: form.type,
        areaId: form.areaId || undefined,
      });
      setAddOpen(false);
      await load();
      notify.created('عملہ');
    } catch (err) {
      setError('عملہ شامل نہیں ہو سکا');
      notify.fail('عملہ شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onSaveEdit() {
    if (!editRow) return;
    setSubmitting(true);
    try {
      await api.patch(`/staff/${editRow.id}`, {
        name: form.name,
        mobile: form.mobile || undefined,
        type: form.type,
        areaId: form.areaId || undefined,
      });
      setEditRow(null);
      await load();
      notify.updated('عملہ');
    } catch (err) {
      setError('عملہ اپڈیٹ نہیں ہو سکا');
      notify.fail('عملہ اپڈیٹ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/staff/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('عملہ');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  const staffSteps = useMemo(
    () => [
      {
        title: 'بنیادی معلومات',
        description: 'نام اور رابطہ',
        validate: () => form.name.trim().length > 0,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="نام">
              <UrduNameInput value={form.name} onChange={(name) => setForm({ ...form, name })} required autoFocus />
            </FormField>
            <FormField label="موبائل">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} dir="ltr" className="text-left" />
            </FormField>
          </div>
        ),
      },
      {
        title: 'قسم و علاقہ',
        description: 'عملے کی قسم اور علاقہ',
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="قسم">
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as StaffType })}>
                {(Object.keys(STAFF_TYPE_LABELS) as StaffType[]).map((t) => (
                  <option key={t} value={t}>{STAFF_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="علاقہ">
              <QuickAddSelect
                entity="area"
                value={form.areaId}
                onChange={(id) => setForm({ ...form, areaId: id })}
                placeholder="— منتخب کریں —"
                options={areas.map((a) => ({
                  value: a.id,
                  label: `${a.name}${a.city ? ` (${a.city})` : ''}`,
                }))}
                onOptionAdded={(record) => setAreas((prev) => [...prev, record as Area])}
              />
            </FormField>
          </div>
        ),
      },
    ],
    [form, areas],
  );

  const columns: DataTableColumn<StaffRow>[] = [
    { id: 'name', header: 'نام', cell: (r) => <span className={cn('font-semibold text-slate-900', tableMixedTextClassName())}>{r.name}</span> },
    { id: 'mobile', header: 'موبائل', cell: (r) => <span dir="ltr" className="inline-block tabular-nums">{r.mobile ?? '—'}</span> },
    {
      id: 'type',
      header: 'قسم',
      cell: (r) => <Badge variant="success">{STAFF_TYPE_LABELS[r.type]}</Badge>,
    },
    { id: 'area', header: 'علاقہ', cell: (r) => <span className={tableMixedTextClassName()}>{r.area?.name ?? '—'}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نیا عملہ
        </Button>
      </PageToolbar>
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={staff}
        columns={columns}
        rowKey={(r) => r.id}
        loading={loading}
        searchKeys={(r) => `${r.name} ${r.mobile ?? ''} ${STAFF_TYPE_LABELS[r.type]} ${r.area?.name ?? ''}`}
        emptyTitle="کوئی عملہ نہیں"
        emptyDescription="اوپر بٹن سے پہلا عملہ شامل کریں"
        actions={(row) => (
          <TableRowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteRow(row)} />
        )}
      />

      <StepFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا عملہ"
        description="عملے کا ریکارڈ شامل کریں"
        steps={staffSteps}
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="شامل کریں"
        formId="add-staff-form"
      />

      <StepFormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title="عملہ ترمیم"
        steps={staffSteps}
        onSubmit={onSaveEdit}
        submitting={submitting}
        formId="edit-staff-form"
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="عملہ حذف کریں"
        message={`کیا "${deleteRow?.name}" حذف کریں؟`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
