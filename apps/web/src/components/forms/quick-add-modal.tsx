'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { recordFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-section';
import { AlertBanner } from '@/components/ui/alert-banner';
import { SelectWithAdd } from '@/components/forms/select-with-add';
import { UrduNameInput } from '@/components/forms/urdu-name-input';
import { AreaQuickAddModal, CompanyQuickAddModal } from '@/components/forms/leaf-quick-add-modals';
import { StaffType, type Area, type Company } from '@inventory-urdu/shared';
import { STAFF_TYPE_LABELS } from '@/lib/labels';

export type QuickAddEntity = 'area' | 'company' | 'customer' | 'staff' | 'item' | 'expense-account';

enum ExpenseGroup {
  OFFICE = 'OFFICE',
  HOME = 'HOME',
  VEHICLE = 'VEHICLE',
  PETTY_CASH = 'PETTY_CASH',
}

const EXPENSE_GROUP_LABELS: Record<ExpenseGroup, string> = {
  [ExpenseGroup.OFFICE]: 'دفتر',
  [ExpenseGroup.HOME]: 'گھر',
  [ExpenseGroup.VEHICLE]: 'گاڑی',
  [ExpenseGroup.PETTY_CASH]: 'چھوٹا خرچ',
};

type QuickAddModalProps = {
  open: boolean;
  onClose: () => void;
  entity: QuickAddEntity;
  staffType?: StaffType;
  onCreated: (record: unknown) => void;
};

export function QuickAddModal({ open, onClose, entity, staffType, onCreated }: QuickAddModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [fatherOrHusbandName, setFatherOrHusbandName] = useState('');
  const [mobile, setMobile] = useState('');
  const [areaId, setAreaId] = useState('');
  const [areas, setAreas] = useState<Area[]>([]);
  const [staffTypeValue, setStaffTypeValue] = useState<StaffType>(staffType ?? StaffType.SALESMAN);
  const [companyId, setCompanyId] = useState('');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [model, setModel] = useState('');
  const [purchaseRate, setPurchaseRate] = useState('');
  const [saleRate, setSaleRate] = useState('');
  const [expenseGroup, setExpenseGroup] = useState<ExpenseGroup>(ExpenseGroup.OFFICE);
  const [nestedAreaOpen, setNestedAreaOpen] = useState(false);
  const [nestedCompanyOpen, setNestedCompanyOpen] = useState(false);

  const titles: Record<QuickAddEntity, string> = {
    area: 'نیا علاقہ',
    company: 'نئی کمپنی',
    customer: 'نیا گاہک',
    staff: 'نیا عملہ',
    item: 'نیا آئٹم',
    'expense-account': 'نیا خرچہ اکاؤنٹ',
  };

  const notifyLabels: Record<QuickAddEntity, string> = {
    area: 'علاقہ',
    company: 'کمپنی',
    customer: 'گاہک',
    staff: 'عملہ',
    item: 'آئٹم',
    'expense-account': 'خرچہ اکاؤنٹ',
  };

  const reset = useCallback(() => {
    setName('');
    setFatherOrHusbandName('');
    setMobile('');
    setAreaId('');
    setStaffTypeValue(staffType ?? StaffType.SALESMAN);
    setCompanyId('');
    setModel('');
    setPurchaseRate('');
    setSaleRate('');
    setExpenseGroup(ExpenseGroup.OFFICE);
    setError('');
  }, [staffType]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    (async () => {
      try {
        if (entity === 'customer' || entity === 'staff') {
          const { data } = await api.get('/areas');
          const list = data.data as Area[];
          setAreas(list);
          setAreaId(list[0]?.id ?? '');
        }
        if (entity === 'item') {
          const { data } = await api.get('/companies');
          const list = data.data as Company[];
          setCompanies(list);
          setCompanyId(list[0]?.id ?? '');
        }
      } catch {
        /* ignore */
      }
    })();
  }, [open, entity, reset]);

  useEffect(() => {
    if (open && staffType) setStaffTypeValue(staffType);
  }, [open, staffType]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      let record: unknown;
      switch (entity) {
        case 'area': {
          const trimmed = name.trim();
          if (!trimmed) throw new Error('علاقے کا نام درج کریں');
          const { data } = await api.post('/areas', { name: trimmed });
          record = recordFromResponse<Area>({ data });
          if (!record || !(record as Area).id) throw new Error('علاقہ محفوظ نہیں ہو سکا');
          break;
        }
        case 'company': {
          const { data } = await api.post('/companies', { name: name.trim() });
          record = data.data;
          break;
        }
        case 'customer': {
          const { data } = await api.post('/customers', {
            name: name.trim(),
            fatherOrHusbandName: fatherOrHusbandName.trim() || undefined,
            mobile: mobile.trim() || undefined,
            areaId: areaId || undefined,
          });
          record = data.data;
          break;
        }
        case 'staff': {
          const { data } = await api.post('/staff', {
            name: name.trim(),
            mobile: mobile.trim() || undefined,
            type: staffTypeValue,
            areaId: areaId || undefined,
          });
          record = data.data;
          break;
        }
        case 'item': {
          if (!companyId) throw new Error('کمپنی منتخب کریں');
          const { data } = await api.post('/items', {
            companyId,
            name: name.trim(),
            model: model.trim() || undefined,
            purchaseRate: Number(purchaseRate),
            saleRate: Number(saleRate),
          });
          record = data.data;
          break;
        }
        case 'expense-account': {
          const { data } = await api.post('/roznamcha/expense-accounts', {
            name: name.trim(),
            group: expenseGroup,
          });
          record = data.data;
          break;
        }
      }
      onCreated(record);
      notify.created(notifyLabels[entity]);
      onClose();
      reset();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join('، ') : typeof msg === 'string' ? msg : 'محفوظ نہیں ہو سکا');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal
        open={open}
        stack="top"
        onClose={() => {
          onClose();
          reset();
        }}
        title={titles[entity]}
        description="فہرست میں شامل کرنے کے لیے مختصر فارم"
        size={entity === 'item' || entity === 'customer' || entity === 'staff' ? 'md' : 'sm'}
        footer={
          <>
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              منسوخ
            </Button>
            <Button type="submit" form="quick-add-form" disabled={submitting}>
              {submitting ? 'محفوظ…' : 'شامل کریں'}
            </Button>
          </>
        }
      >
        <form id="quick-add-form" onSubmit={onSubmit} className="space-y-4">
          {error ? <AlertBanner>{error}</AlertBanner> : null}

          {(entity === 'area' || entity === 'company' || entity === 'customer' || entity === 'staff' || entity === 'item' || entity === 'expense-account') && (
            <FormField
              label={
                entity === 'area'
                  ? 'علاقہ'
                  : entity === 'company'
                    ? 'کمپنی کا نام'
                    : entity === 'expense-account'
                      ? 'اکاؤنٹ نام'
                      : 'نام'
              }
            >
              {entity === 'company' || entity === 'expense-account' || entity === 'area' ? (
                <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
              ) : (
                <UrduNameInput value={name} onChange={setName} required autoFocus />
              )}
            </FormField>
          )}

          {entity === 'customer' || entity === 'staff' ? (
            <>
              {entity === 'customer' ? (
                <FormField label="والد/شوہر کا نام">
                  <UrduNameInput value={fatherOrHusbandName} onChange={setFatherOrHusbandName} placeholder="اختیاری" />
                </FormField>
              ) : null}
              <FormField label="موبائل">
                <Input value={mobile} onChange={(e) => setMobile(e.target.value)} dir="ltr" className="text-left" />
              </FormField>
              <FormField label="علاقہ">
                <SelectWithAdd
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  onAddClick={() => setNestedAreaOpen(true)}
                  addTitle="نیا علاقہ"
                >
                  <option value="">— منتخب کریں —</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </SelectWithAdd>
              </FormField>
            </>
          ) : null}

          {entity === 'staff' ? (
            <FormField label="قسم">
              <Select
                value={staffTypeValue}
                onChange={(e) => setStaffTypeValue(e.target.value as StaffType)}
                disabled={Boolean(staffType)}
              >
                {(Object.keys(STAFF_TYPE_LABELS) as StaffType[]).map((t) => (
                  <option key={t} value={t}>
                    {STAFF_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}

          {entity === 'item' ? (
            <>
              <FormField label="کمپنی">
                <SelectWithAdd
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  onAddClick={() => setNestedCompanyOpen(true)}
                  addTitle="نئی کمپنی"
                  required
                >
                  {companies.length === 0 ? (
                    <option value="">پہلے کمپنی شامل کریں</option>
                  ) : (
                    companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </SelectWithAdd>
              </FormField>
              <FormField label="ماڈل">
                <Input value={model} onChange={(e) => setModel(e.target.value)} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="خرید ریٹ">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={purchaseRate}
                    onChange={(e) => setPurchaseRate(e.target.value)}
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
                    value={saleRate}
                    onChange={(e) => setSaleRate(e.target.value)}
                    required
                    dir="ltr"
                    className="text-left"
                  />
                </FormField>
              </div>
            </>
          ) : null}

          {entity === 'expense-account' ? (
            <FormField label="گروپ">
              <Select value={expenseGroup} onChange={(e) => setExpenseGroup(e.target.value as ExpenseGroup)}>
                {(Object.keys(EXPENSE_GROUP_LABELS) as ExpenseGroup[]).map((g) => (
                  <option key={g} value={g}>
                    {EXPENSE_GROUP_LABELS[g]}
                  </option>
                ))}
              </Select>
            </FormField>
          ) : null}
        </form>
      </Modal>

      {entity === 'customer' || entity === 'staff' ? (
        <AreaQuickAddModal
          open={nestedAreaOpen}
          onClose={() => setNestedAreaOpen(false)}
          onCreated={(area) => {
            setAreas((prev) => [...prev, area]);
            setAreaId(area.id);
          }}
        />
      ) : null}

      {entity === 'item' ? (
        <CompanyQuickAddModal
          open={nestedCompanyOpen}
          onClose={() => setNestedCompanyOpen(false)}
          onCreated={(company) => {
            setCompanies((prev) => [...prev, company]);
            setCompanyId(company.id);
          }}
        />
      ) : null}
    </>
  );
}
