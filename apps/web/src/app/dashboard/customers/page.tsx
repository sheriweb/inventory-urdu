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
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { ImageUpload } from '@/components/ui/image-upload';
import { useDebounce } from '@/hooks/use-debounce';
import type { Area } from '@inventory-urdu/shared';

type Guarantor = {
  id: string;
  name: string;
  cnic?: string | null;
  phone?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
};

type CustomerRow = {
  id: string;
  name: string;
  fatherOrHusbandName?: string | null;
  caste?: string | null;
  profession?: string | null;
  mobile?: string | null;
  cnic?: string | null;
  city?: string | null;
  areaId?: string | null;
  presentAddress?: string | null;
  permanentAddress?: string | null;
  bankName?: string | null;
  chequeNumber?: string | null;
  cnicPhotoUrl?: string | null;
  cnicFrontPhotoUrl?: string | null;
  cnicBackPhotoUrl?: string | null;
  chequePhotoUrl?: string | null;
  area?: { id: string; name: string; city?: string | null } | null;
  guarantors?: Guarantor[];
};

const emptyCustomer = {
  name: '',
  fatherOrHusbandName: '',
  caste: '',
  profession: '',
  mobile: '',
  cnic: '',
  city: '',
  areaId: '',
  presentAddress: '',
  permanentAddress: '',
  bankName: '',
  chequeNumber: '',
  cnicPhotoUrl: '',
  cnicFrontPhotoUrl: '',
  cnicBackPhotoUrl: '',
  chequePhotoUrl: '',
};

const emptyGuarantor = {
  name: '',
  cnic: '',
  phone: '',
  cnicFrontPhotoUrl: '',
  cnicBackPhotoUrl: '',
  presentAddress: '',
  permanentAddress: '',
};

const textareaClass =
  'flex min-h-[4.5rem] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600';

function customerPayload(form: typeof emptyCustomer) {
  return {
    name: form.name,
    areaId: form.areaId || undefined,
    fatherOrHusbandName: form.fatherOrHusbandName || undefined,
    caste: form.caste || undefined,
    profession: form.profession || undefined,
    mobile: form.mobile || undefined,
    cnic: form.cnic || undefined,
    city: form.city || undefined,
    presentAddress: form.presentAddress || undefined,
    permanentAddress: form.permanentAddress || undefined,
    bankName: form.bankName || undefined,
    chequeNumber: form.chequeNumber || undefined,
    cnicPhotoUrl: form.cnicPhotoUrl || undefined,
    cnicFrontPhotoUrl: form.cnicFrontPhotoUrl || undefined,
    cnicBackPhotoUrl: form.cnicBackPhotoUrl || undefined,
    chequePhotoUrl: form.chequePhotoUrl || undefined,
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [form, setForm] = useState(emptyCustomer);
  const [guarantorForm, setGuarantorForm] = useState(emptyGuarantor);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [guarantorSubmitting, setGuarantorSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<CustomerRow | null>(null);
  const [guarantorCustomer, setGuarantorCustomer] = useState<CustomerRow | null>(null);
  const [guarantorAddOpen, setGuarantorAddOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<CustomerRow | null>(null);
  const [deleteGuarantorId, setDeleteGuarantorId] = useState<string | null>(null);
  const [deletingGuarantor, setDeletingGuarantor] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [searchQ, setSearchQ] = useState('');
  const [totalItems, setTotalItems] = useState(0);
  const debouncedQ = useDebounce(searchQ, 300);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [customersRes, areasRes] = await Promise.all([
        api.get('/customers', { params: { page, limit: 10, q: debouncedQ.trim() || undefined } }),
        api.get('/areas'),
      ]);
      setCustomers(customersRes.data.data as CustomerRow[]);
      setTotalItems(customersRes.data.meta?.total ?? customersRes.data.data.length);
      setAreas(areasRes.data.data as Area[]);
    } catch {
      setError('گاہک لوڈ نہیں ہو سکے');
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

  async function loadGuarantors(customerId: string) {
    try {
      const { data } = await api.get(`/customers/${customerId}/guarantors`);
      setGuarantors(data.data as Guarantor[]);
    } catch {
      const row = customers.find((c) => c.id === customerId);
      setGuarantors(row?.guarantors ?? []);
    }
  }

  function openAdd() {
    setForm(emptyCustomer);
    setAddOpen(true);
  }

  function openEdit(customer: CustomerRow) {
    setEditRow(customer);
    setForm({
      name: customer.name,
      fatherOrHusbandName: customer.fatherOrHusbandName ?? '',
      caste: customer.caste ?? '',
      profession: customer.profession ?? '',
      mobile: customer.mobile ?? '',
      cnic: customer.cnic ?? '',
      city: customer.city ?? '',
      areaId: customer.areaId ?? customer.area?.id ?? '',
      presentAddress: customer.presentAddress ?? '',
      permanentAddress: customer.permanentAddress ?? '',
      bankName: customer.bankName ?? '',
      chequeNumber: customer.chequeNumber ?? '',
      cnicPhotoUrl: customer.cnicPhotoUrl ?? '',
      cnicFrontPhotoUrl: customer.cnicFrontPhotoUrl ?? customer.cnicPhotoUrl ?? '',
      cnicBackPhotoUrl: customer.cnicBackPhotoUrl ?? '',
      chequePhotoUrl: customer.chequePhotoUrl ?? '',
    });
  }

  async function openGuarantors(customer: CustomerRow) {
    setGuarantorCustomer(customer);
    setGuarantorForm(emptyGuarantor);
    await loadGuarantors(customer.id);
  }

  async function onAdd() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/customers', customerPayload(form));
      setAddOpen(false);
      await load();
      notify.created('گاہک');
    } catch (err) {
      setError('گاہک شامل نہیں ہو سکا');
      notify.fail('گاہک شامل', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onUpdate() {
    if (!editRow) return;
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/customers/${editRow.id}`, customerPayload(form));
      setEditRow(null);
      await load();
      notify.updated('گاہک');
    } catch (err) {
      setError('گاہک اپڈیٹ نہیں ہو سکا');
      notify.fail('گاہک اپڈیٹ', err);
    } finally {
      setSubmitting(false);
    }
  }

  async function onDeleteCustomer(id: string) {
    try {
      await api.delete(`/customers/${id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('گاہک');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  async function onAddGuarantor() {
    if (!guarantorCustomer) return;
    setGuarantorSubmitting(true);
    setError('');
    try {
      await api.post(`/customers/${guarantorCustomer.id}/guarantors`, {
        name: guarantorForm.name,
        cnic: guarantorForm.cnic || undefined,
        phone: guarantorForm.phone || undefined,
        cnicFrontPhotoUrl: guarantorForm.cnicFrontPhotoUrl || undefined,
        cnicBackPhotoUrl: guarantorForm.cnicBackPhotoUrl || undefined,
        presentAddress: guarantorForm.presentAddress || undefined,
        permanentAddress: guarantorForm.permanentAddress || undefined,
      });
      setGuarantorForm(emptyGuarantor);
      await loadGuarantors(guarantorCustomer.id);
      await load();
      notify.created('ضمانتی');
    } catch (err) {
      setError('ضمانتی شامل نہیں ہو سکا');
      notify.fail('ضمانتی شامل', err);
    } finally {
      setGuarantorSubmitting(false);
    }
  }

  async function onDeleteGuarantor(guarantorId: string) {
    if (!guarantorCustomer) return;
    setDeletingGuarantor(true);
    try {
      await api.delete(`/customers/${guarantorCustomer.id}/guarantors/${guarantorId}`);
      setDeleteGuarantorId(null);
      await loadGuarantors(guarantorCustomer.id);
      await load();
      notify.deleted('ضمانتی');
    } catch (err) {
      setError('ضمانتی حذف نہیں ہو سکا');
      notify.fail('ضمانتی حذف', err);
    } finally {
      setDeletingGuarantor(false);
    }
  }

  const customerSteps = useMemo(
    () => [
      {
        title: 'ذاتی معلومات',
        description: 'نام، ذات اور پیشہ',
        validate: () => form.name.trim().length > 0,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="نام">
              <UrduNameInput value={form.name} onChange={(name) => setForm({ ...form, name })} required autoFocus />
            </FormField>
            <FormField label="والد/شوہر کا نام">
              <UrduNameInput value={form.fatherOrHusbandName} onChange={(fatherOrHusbandName) => setForm({ ...form, fatherOrHusbandName })} showRomanHelper={false} />
            </FormField>
            <FormField label="ذات">
              <UrduNameInput value={form.caste} onChange={(caste) => setForm({ ...form, caste })} showRomanHelper={false} />
            </FormField>
            <FormField label="پیشہ">
              <UrduNameInput value={form.profession} onChange={(profession) => setForm({ ...form, profession })} showRomanHelper={false} />
            </FormField>
          </div>
        ),
      },
      {
        title: 'رابطہ و شناخت',
        description: 'موبائل، CNIC، شہر اور علاقہ',
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="موبائل">
              <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} dir="ltr" className="text-left" />
            </FormField>
            <FormField label="CNIC">
              <Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} dir="ltr" className="text-left" />
            </FormField>
            <FormField label="شہر">
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
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
      {
        title: 'پتہ',
        description: 'موجودہ اور مستقل پتہ',
        content: (
          <div className="grid gap-4">
            <FormField label="موجودہ پتہ">
              <textarea className={textareaClass} value={form.presentAddress} onChange={(e) => setForm({ ...form, presentAddress: e.target.value })} />
            </FormField>
            <FormField label="مستقل پتہ">
              <textarea className={textareaClass} value={form.permanentAddress} onChange={(e) => setForm({ ...form, permanentAddress: e.target.value })} />
            </FormField>
          </div>
        ),
      },
      {
        title: 'بینک و دستاویز',
        description: 'بینک، چیک اور CNIC تصاویر',
        content: (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="بینک">
                <Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
              </FormField>
              <FormField label="چیک نمبر">
                <Input value={form.chequeNumber} onChange={(e) => setForm({ ...form, chequeNumber: e.target.value })} dir="ltr" className="text-left" />
              </FormField>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <ImageUpload
                label="CNIC سامنے"
                hint="اختیاری"
                value={form.cnicFrontPhotoUrl}
                onChange={(url) => setForm({ ...form, cnicFrontPhotoUrl: url })}
              />
              <ImageUpload
                label="CNIC پیچھے"
                hint="اختیاری"
                value={form.cnicBackPhotoUrl}
                onChange={(url) => setForm({ ...form, cnicBackPhotoUrl: url })}
              />
              <ImageUpload
                label="چیک کی تصویر"
                hint="اختیاری"
                value={form.chequePhotoUrl}
                onChange={(url) => setForm({ ...form, chequePhotoUrl: url })}
              />
            </div>
          </div>
        ),
      },
    ],
    [form, areas],
  );

  const guarantorSteps = useMemo(
    () => [
      {
        title: 'ضمانتی کی معلومات',
        description: 'نام، CNIC اور فون',
        validate: () => guarantorForm.name.trim().length > 0,
        content: (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ضمانتی نام">
              <UrduNameInput value={guarantorForm.name} onChange={(name) => setGuarantorForm({ ...guarantorForm, name })} required autoFocus />
            </FormField>
            <FormField label="CNIC">
              <Input value={guarantorForm.cnic} onChange={(e) => setGuarantorForm({ ...guarantorForm, cnic: e.target.value })} dir="ltr" className="text-left" />
            </FormField>
            <FormField label="فون" className="sm:col-span-2">
              <Input value={guarantorForm.phone} onChange={(e) => setGuarantorForm({ ...guarantorForm, phone: e.target.value })} dir="ltr" className="text-left" />
            </FormField>
          </div>
        ),
      },
      {
        title: 'پتہ',
        description: 'موجودہ اور مستقل پتہ',
        content: (
          <div className="grid gap-4">
            <FormField label="موجودہ پتہ">
              <textarea className={textareaClass} value={guarantorForm.presentAddress} onChange={(e) => setGuarantorForm({ ...guarantorForm, presentAddress: e.target.value })} />
            </FormField>
            <FormField label="مستقل پتہ">
              <textarea className={textareaClass} value={guarantorForm.permanentAddress} onChange={(e) => setGuarantorForm({ ...guarantorForm, permanentAddress: e.target.value })} />
            </FormField>
          </div>
        ),
      },
      {
        title: 'CNIC تصاویر',
        description: 'سامنے اور پیچھے (اختیاری)',
        content: (
          <div className="grid gap-6 sm:grid-cols-2">
            <ImageUpload
              label="CNIC سامنے"
              hint="اختیاری"
              value={guarantorForm.cnicFrontPhotoUrl}
              onChange={(url) => setGuarantorForm({ ...guarantorForm, cnicFrontPhotoUrl: url })}
            />
            <ImageUpload
              label="CNIC پیچھے"
              hint="اختیاری"
              value={guarantorForm.cnicBackPhotoUrl}
              onChange={(url) => setGuarantorForm({ ...guarantorForm, cnicBackPhotoUrl: url })}
            />
          </div>
        ),
      },
    ],
    [guarantorForm],
  );

  const customerColumns: DataTableColumn<CustomerRow>[] = useMemo(
    () => [
      { id: 'name', header: 'نام', cell: (c) => <span className="font-semibold font-urdu text-slate-900">{c.name}</span> },
      { id: 'father', header: 'والد/شوہر', cell: (c) => c.fatherOrHusbandName ?? '—' },
      { id: 'mobile', header: 'موبائل', cell: (c) => <span dir="ltr">{c.mobile ?? '—'}</span> },
      { id: 'cnic', header: 'CNIC', cell: (c) => <span dir="ltr">{c.cnic ?? '—'}</span> },
      { id: 'area', header: 'علاقہ', cell: (c) => c.area?.name ?? '—' },
      { id: 'city', header: 'شہر', cell: (c) => c.city ?? c.area?.city ?? '—' },
    ],
    [],
  );

  const guarantorColumns: DataTableColumn<Guarantor>[] = useMemo(
    () => [
      { id: 'name', header: 'نام', cell: (g) => g.name },
      { id: 'cnic', header: 'CNIC', cell: (g) => <span dir="ltr">{g.cnic ?? '—'}</span> },
      { id: 'phone', header: 'فون', cell: (g) => <span dir="ltr">{g.phone ?? '—'}</span> },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نیا گاہک
        </Button>
      </PageToolbar>
      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <DataTable
        data={customers}
        columns={customerColumns}
        rowKey={(c) => c.id}
        loading={loading}
        pageSize={10}
        paginationMode="server"
        totalItems={totalItems}
        page={page}
        onPageChange={setPage}
        searchValue={searchQ}
        onSearchChange={setSearchQ}
        searchPlaceholder="نام، موبائل، CNIC…"
        emptyDescription="پہلا گاہک شامل کریں"
        emptyAction={
          <Button type="button" onClick={openAdd} className="gap-1.5">
            <Plus className="h-4 w-4" />
            نیا گاہک
          </Button>
        }
        actions={(c) => (
          <TableRowActions
            onEdit={() => openEdit(c)}
            onExtra={() => openGuarantors(c)}
            extraLabel="ضمانتی"
            onDelete={() => setDeleteRow(c)}
          />
        )}
      />

      <StepFormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نیا گاہک"
        description="مکمل تفصیل مرحلہ وار درج کریں"
        size="xl"
        steps={customerSteps}
        onSubmit={onAdd}
        submitting={submitting}
        submitLabel="گاہک شامل کریں"
        formId="add-customer-form"
      />

      <StepFormModal
        open={Boolean(editRow)}
        onClose={() => setEditRow(null)}
        title={`گاہک ترمیم — ${editRow?.name ?? ''}`}
        size="xl"
        steps={customerSteps}
        onSubmit={onUpdate}
        submitting={submitting}
        formId="edit-customer-form"
      />

      <Modal
        open={Boolean(guarantorCustomer)}
        onClose={() => {
          setGuarantorCustomer(null);
          setGuarantorAddOpen(false);
        }}
        title={`ضمانتی — ${guarantorCustomer?.name ?? ''}`}
        description="اس گاہک کے ضمانتی"
        size="lg"
        footer={
          <Button type="button" onClick={() => { setGuarantorForm(emptyGuarantor); setGuarantorAddOpen(true); }}>
            <Plus className="ml-1.5 h-4 w-4" />
            نیا ضمانتی
          </Button>
        }
      >
        {guarantors.length === 0 ? (
          <p className="mb-4 text-sm text-slate-500">کوئی ضمانتی نہیں — نیا شامل کریں</p>
        ) : (
          <DataTable
            data={guarantors}
            columns={guarantorColumns}
            rowKey={(g) => g.id}
            compact
            pageSize={5}
            actions={(g) => <TableRowActions onDelete={() => setDeleteGuarantorId(g.id)} />}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteGuarantorId)}
        title="ضمانتی حذف کریں"
        message="کیا یہ ضمانتی حذف کریں؟"
        loading={deletingGuarantor}
        onCancel={() => setDeleteGuarantorId(null)}
        onConfirm={() => {
          if (deleteGuarantorId) void onDeleteGuarantor(deleteGuarantorId);
        }}
      />

      <StepFormModal
        open={guarantorAddOpen}
        onClose={() => setGuarantorAddOpen(false)}
        title="نیا ضمانتی"
        description={guarantorCustomer ? `گاہک: ${guarantorCustomer.name}` : undefined}
        steps={guarantorSteps}
        onSubmit={onAddGuarantor}
        submitting={guarantorSubmitting}
        submitLabel="ضمانتی شامل کریں"
        formId="add-guarantor-form"
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="گاہک حذف کریں"
        message={`کیا "${deleteRow?.name}" حذف کریں؟`}
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={() => {
          if (deleteRow) {
            setDeleting(true);
            onDeleteCustomer(deleteRow.id);
          }
        }}
      />
    </div>
  );
}
