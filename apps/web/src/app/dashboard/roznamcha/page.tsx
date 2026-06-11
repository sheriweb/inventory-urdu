'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { asArray, recordFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageToolbar } from '@/components/layout/page-toolbar';
import { Input } from '@/components/ui/input';
import { QuickAddSelect } from '@/components/forms/quick-add-select';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { TableRowActions } from '@/components/ui/table-actions';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormModal } from '@/components/ui/form-modal';
import { AlertBanner } from '@/components/ui/alert-banner';
import { FormField } from '@/components/ui/form-section';
import { fmtDate, fmtMoney, monthStartInputValue, todayInputValue } from '@/lib/format';

type EntryRow = {
  id: string;
  entryDate: string;
  detail?: string | null;
  expenseAmount: string | number;
  recoveryAmount: string | number;
  balanceAfter: string | number;
  expenseAccount?: { name: string; group: string } | null;
};

type EntriesResponse = {
  rows: EntryRow[];
  summary: {
    totalExpense: number;
    totalRecovery: number;
    net: number;
    closingBalance: number;
  };
};

type DailyBalance = {
  openingBalance: number;
  totalIn: number;
  expense: number;
  closingBalance: number;
};

type ExpenseAccount = {
  id: string;
  name: string;
  group: string;
  groupLabel?: string;
};

const emptyEntry = {
  entryDate: todayInputValue(),
  expenseAccountId: '',
  detail: '',
  expenseAmount: '',
  recoveryAmount: '',
};

const columns: DataTableColumn<EntryRow>[] = [
  { id: 'date', header: 'تاریخ', cell: (row) => fmtDate(row.entryDate) },
  { id: 'account', header: 'خرچہ اکاؤنٹ', cell: (row) => row.expenseAccount?.name ?? '—' },
  { id: 'detail', header: 'تفصیل', cell: (row) => row.detail ?? '—' },
  {
    id: 'expense',
    header: 'خرچ',
    cell: (row) => (
      <span dir="ltr" className="text-red-700">
        {fmtMoney(row.expenseAmount)}
      </span>
    ),
  },
  {
    id: 'recovery',
    header: 'وصولی',
    cell: (row) => (
      <span dir="ltr" className="text-emerald-800">
        {fmtMoney(row.recoveryAmount)}
      </span>
    ),
  },
  {
    id: 'balance',
    header: 'بیلنس',
    cell: (row) => (
      <span dir="ltr" className="font-medium">
        {fmtMoney(row.balanceAfter)}
      </span>
    ),
  },
];

export default function RoznamchaRegisterPage() {
  const [from, setFrom] = useState(monthStartInputValue());
  const [to, setTo] = useState(todayInputValue());
  const [data, setData] = useState<EntriesResponse | null>(null);
  const [daily, setDaily] = useState<DailyBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteRow, setDeleteRow] = useState<EntryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [entryForm, setEntryForm] = useState(emptyEntry);
  const [accounts, setAccounts] = useState<ExpenseAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [entriesRes, dailyRes] = await Promise.all([
        api.get('/roznamcha/entries', { params: { from, to } }),
        api.get('/roznamcha/daily-balance', { params: { date: to } }),
      ]);
      setData(recordFromResponse<EntriesResponse>(entriesRes));
      setDaily(recordFromResponse<DailyBalance>(dailyRes));
    } catch {
      setError('روزنامچہ لوڈ نہیں ہو سکا');
      setData(null);
      setDaily(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteRow) return;
    setDeleting(true);
    try {
      await api.delete(`/roznamcha/entries/${deleteRow.id}`);
      setDeleteRow(null);
      await load();
      notify.deleted('انٹری');
    } catch (err) {
      setError('حذف نہیں ہو سکا');
      notify.fail('حذف', err);
    } finally {
      setDeleting(false);
    }
  }

  async function loadAccounts() {
    setAccountsLoading(true);
    try {
      const { data } = await api.get('/roznamcha/expense-accounts');
      setAccounts(asArray<ExpenseAccount>(data?.data));
    } catch {
      setError('خرچہ اکاؤنٹس لوڈ نہیں ہو سکے');
    } finally {
      setAccountsLoading(false);
    }
  }

  function openAdd() {
    setEntryForm({ ...emptyEntry, entryDate: todayInputValue() });
    setAddOpen(true);
    if (accounts.length === 0) loadAccounts();
  }

  async function onAddEntry() {
    setSubmitting(true);
    setError('');
    try {
      await api.post('/roznamcha/entries', {
        entryDate: entryForm.entryDate,
        expenseAccountId: entryForm.expenseAccountId || undefined,
        detail: entryForm.detail || undefined,
        expenseAmount: entryForm.expenseAmount ? parseFloat(entryForm.expenseAmount) : 0,
        recoveryAmount: entryForm.recoveryAmount ? parseFloat(entryForm.recoveryAmount) : 0,
      });
      setAddOpen(false);
      await load();
      notify.created('روزنامچہ انٹری');
    } catch (err) {
      setError('انٹری محفوظ نہیں ہو سکی');
      notify.fail('انٹری محفوظ', err);
    } finally {
      setSubmitting(false);
    }
  }

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <PageToolbar>
        <Button onClick={openAdd} className="gap-1.5">
          <Plus className="h-4 w-4" />
          نئی انٹری
        </Button>
      </PageToolbar>

      {error ? <AlertBanner onRetry={load}>{error}</AlertBanner> : null}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="mb-1 block text-xs text-slate-500">سے</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} dir="ltr" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">تک</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} dir="ltr" />
          </div>
          <Button type="button" onClick={load} disabled={loading}>
            {loading ? 'تلاش…' : 'تلاش'}
          </Button>
        </CardContent>
      </Card>

      {daily ? (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">آج کا افتتاحی بیلنس</p>
              <p className="text-xl font-semibold" dir="ltr">
                {fmtMoney(daily.openingBalance)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">آج کی وصولی</p>
              <p className="text-xl font-semibold text-emerald-800" dir="ltr">
                {fmtMoney(daily.totalIn)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">آج کا خرچ</p>
              <p className="text-xl font-semibold text-red-700" dir="ltr">
                {fmtMoney(daily.expense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">اختتامی بیلنس</p>
              <p className="text-xl font-semibold" dir="ltr">
                {fmtMoney(daily.closingBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {data?.summary ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل وصولی</p>
              <p className="text-lg font-semibold text-emerald-800" dir="ltr">
                {fmtMoney(data.summary.totalRecovery)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">کل خرچ</p>
              <p className="text-lg font-semibold text-red-700" dir="ltr">
                {fmtMoney(data.summary.totalExpense)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-slate-500">خالص / بیلنس</p>
              <p className="text-lg font-semibold" dir="ltr">
                {fmtMoney(data.summary.closingBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <DataTable
        data={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        pageSize={12}
        emptyTitle="کوئی انٹری نہیں"
        emptyDescription="اوپر بٹن سے روزانہ خرچ یا وصولی درج کریں"
        searchKeys={(row) => `${row.detail ?? ''} ${row.expenseAccount?.name ?? ''}`}
        actions={(row) => <TableRowActions onDelete={() => setDeleteRow(row)} />}
      />

      <ConfirmDialog
        open={Boolean(deleteRow)}
        title="انٹری حذف کریں"
        message="کیا یہ روزنامچہ انٹری حذف کریں؟"
        loading={deleting}
        onCancel={() => setDeleteRow(null)}
        onConfirm={confirmDelete}
      />

      <FormModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="نئی روزنامچہ انٹری"
        description="روزانہ خرچہ اور وصولی درج کریں"
        size="md"
        onSubmit={onAddEntry}
        submitting={submitting}
        submitLabel="محفوظ کریں"
        formId="roznamcha-entry-form"
      >
        {accountsLoading ? (
          <p className="py-6 text-center text-sm text-slate-500">لوڈ ہو رہا ہے…</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="تاریخ">
              <Input
                type="date"
                value={entryForm.entryDate}
                onChange={(e) => setEntryForm({ ...entryForm, entryDate: e.target.value })}
                required
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="تفصیل">
              <Input value={entryForm.detail} onChange={(e) => setEntryForm({ ...entryForm, detail: e.target.value })} />
            </FormField>
            <FormField label="خرچہ اکاؤنٹ" className="sm:col-span-2">
              <QuickAddSelect
                entity="expense-account"
                value={entryForm.expenseAccountId}
                onChange={(id) => setEntryForm({ ...entryForm, expenseAccountId: id })}
                placeholder="— منتخب کریں —"
                options={accounts.map((acc) => ({
                  value: acc.id,
                  label: `${acc.name} (${acc.groupLabel ?? acc.group})`,
                }))}
                onOptionAdded={(record) => {
                  const acc = record as ExpenseAccount;
                  setAccounts((prev) => [...prev, acc]);
                  setEntryForm((prev) => ({ ...prev, expenseAccountId: acc.id }));
                }}
              />
            </FormField>
            <FormField label="خرچہ رقم">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={entryForm.expenseAmount}
                onChange={(e) => setEntryForm({ ...entryForm, expenseAmount: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </FormField>
            <FormField label="وصولی رقم">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={entryForm.recoveryAmount}
                onChange={(e) => setEntryForm({ ...entryForm, recoveryAmount: e.target.value })}
                dir="ltr"
                className="text-left"
              />
            </FormField>
          </div>
        )}
      </FormModal>
    </div>
  );
}
