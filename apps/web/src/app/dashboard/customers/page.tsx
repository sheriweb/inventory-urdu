'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { asArray, listFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { FormModal } from '@/components/ui/form-modal';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AlertBanner } from '@/components/ui/alert-banner';
import { useDebounce } from '@/hooks/use-debounce';
import {
  GuarantorFormFields,
  emptyGuarantorForm,
  type GuarantorFormState,
} from '@/components/forms/guarantor-form-fields';

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

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [guarantorForm, setGuarantorForm] = useState<GuarantorFormState>(emptyGuarantorForm);
  const [guarantors, setGuarantors] = useState<Guarantor[]>([]);
  const [loading, setLoading] = useState(true);
  const [guarantorSubmitting, setGuarantorSubmitting] = useState(false);
  const [error, setError] = useState('');
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
      const customersRes = await api.get('/customers', {
        params: { page, limit: 10, q: debouncedQ.trim() || undefined },
      });
      const { rows, total } = listFromResponse<CustomerRow>(customersRes);
      setCustomers(rows);
      setTotalItems(total);
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
      setGuarantors(asArray<Guarantor>(data?.data));
    } catch {
      const row = customers.find((c) => c.id === customerId);
      setGuarantors(row?.guarantors ?? []);
    }
  }

  async function openGuarantors(customer: CustomerRow) {
    setGuarantorCustomer(customer);
    setGuarantorForm(emptyGuarantorForm);
    await loadGuarantors(customer.id);
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
    if (!guarantorForm.name.trim()) {
      notify.fail('ضمانتی نام درج کریں');
      return;
    }
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
      setGuarantorForm(emptyGuarantorForm);
      setGuarantorAddOpen(false);
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
        <Link href="/dashboard/customers/new" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700">
          <Plus className="h-4 w-4" />
          نیا گاہک
        </Link>
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
          <Link href="/dashboard/customers/new" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition hover:bg-emerald-700">
            <Plus className="h-4 w-4" />
            نیا گاہک
          </Link>
        }
        actions={(c) => (
          <TableRowActions
            editHref={`/dashboard/customers/${c.id}/edit`}
            onExtra={() => openGuarantors(c)}
            extraLabel="ضمانتی"
            onDelete={() => setDeleteRow(c)}
          />
        )}
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
          <Button
            type="button"
            onClick={() => {
              setGuarantorForm(emptyGuarantorForm);
              setGuarantorAddOpen(true);
            }}
          >
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

      <FormModal
        open={guarantorAddOpen}
        onClose={() => setGuarantorAddOpen(false)}
        title="نیا ضمانتی"
        description={guarantorCustomer ? `گاہک: ${guarantorCustomer.name}` : undefined}
        size="lg"
        onSubmit={onAddGuarantor}
        submitting={guarantorSubmitting}
        submitLabel="ضمانتی شامل کریں"
        formId="add-guarantor-form"
      >
        <GuarantorFormFields form={guarantorForm} onChange={setGuarantorForm} autoFocusName />
      </FormModal>

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
