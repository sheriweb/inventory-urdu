'use client';

import { FormEvent, useCallback, useState } from 'react';
import api from '@/lib/api';
import { recordFromResponse } from '@/lib/api-response';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-section';
import { AlertBanner } from '@/components/ui/alert-banner';
import type { Area, Company } from '@inventory-urdu/shared';

function extractError(err: unknown): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join('، ') : typeof msg === 'string' ? msg : 'محفوظ نہیں ہو سکا';
}

type AreaQuickAddModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (area: Area) => void;
};

export function AreaQuickAddModal({ open, onClose, onCreated }: AreaQuickAddModalProps) {
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setName('');
    setCity('');
    setError('');
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/areas', { name: name.trim(), city: city.trim() || undefined });
      onCreated(data.data as Area);
      notify.created('علاقہ');
      onClose();
      reset();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      stack="top"
      onClose={() => {
        onClose();
        reset();
      }}
      title="نیا علاقہ"
      description="فہرست میں شامل کرنے کے لیے مختصر فارم"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            منسوخ
          </Button>
          <Button type="submit" form="leaf-area-form" disabled={submitting}>
            {submitting ? 'محفوظ…' : 'شامل کریں'}
          </Button>
        </>
      }
    >
      <form id="leaf-area-form" onSubmit={onSubmit} className="space-y-4">
        {error ? <AlertBanner>{error}</AlertBanner> : null}
        <FormField label="نام">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </FormField>
        <FormField label="شہر">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="اختیاری" />
        </FormField>
      </form>
    </Modal>
  );
}

type CompanyQuickAddModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (company: Company) => void;
};

export function CompanyQuickAddModal({ open, onClose, onCreated }: CompanyQuickAddModalProps) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = useCallback(() => {
    setName('');
    setError('');
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const { data } = await api.post('/companies', { name: name.trim() });
      const company = recordFromResponse<Company>({ data });
      if (!company?.id) throw new Error('کمپنی محفوظ نہیں ہو سکی');
      onCreated(company);
      notify.created('کمپنی');
      onClose();
      reset();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      stack="top"
      onClose={() => {
        onClose();
        reset();
      }}
      title="نئی کمپنی"
      description="فہرست میں شامل کرنے کے لیے مختصر فارم"
      size="sm"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
            منسوخ
          </Button>
          <Button type="submit" form="leaf-company-form" disabled={submitting}>
            {submitting ? 'محفوظ…' : 'شامل کریں'}
          </Button>
        </>
      }
    >
      <form id="leaf-company-form" onSubmit={onSubmit} className="space-y-4">
        {error ? <AlertBanner>{error}</AlertBanner> : null}
        <FormField label="کمپنی کا نام">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </FormField>
      </form>
    </Modal>
  );
}
