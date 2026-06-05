'use client';

import { FormEvent, useState } from 'react';
import api from '@/lib/api';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-section';
import { AlertBanner } from '@/components/ui/alert-banner';

type RecoveryAdvancePanelProps = {
  onSuccess?: () => void;
};

export function RecoveryAdvancePanel({ onSuccess }: RecoveryAdvancePanelProps) {
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receiptNumber, setReceiptNumber] = useState<number | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const acct = parseInt(accountNumber.trim(), 10);
    const parsed = parseFloat(amount);
    if (Number.isNaN(acct) || acct < 1) {
      setError('درست کھاتہ نمبر درج کریں');
      return;
    }
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError('درست رقم درج کریں');
      return;
    }
    setSubmitting(true);
    setError('');
    setReceiptNumber(null);
    try {
      const { data } = await api.post('/recovery/advance', {
        accountNumber: acct,
        amount: parsed,
        note: note.trim() || undefined,
      });
      const payment = data.data?.payment as { receiptNumber?: number } | undefined;
      if (payment?.receiptNumber != null) {
        setReceiptNumber(payment.receiptNumber);
      }
      setAmount('');
      setNote('');
      onSuccess?.();
      notify.saved(`ایڈوانس وصولی — رسید #${payment?.receiptNumber ?? ''}`);
    } catch (err) {
      setError('ایڈوانس وصولی نہیں ہو سکی — رقم باقی قسطوں سے زیادہ نہ ہو');
      notify.fail('ایڈوانس وصولی', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {receiptNumber != null ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          وصولی کامیاب — رسید نمبر:{' '}
          <span className="font-semibold" dir="ltr">
            #{receiptNumber}
          </span>
        </div>
      ) : null}

      {error ? <AlertBanner>{error}</AlertBanner> : null}

      <form onSubmit={onSubmit} className="grid gap-4">
        <FormField label="کھاتہ نمبر">
          <Input
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
            dir="ltr"
            className="text-left"
            placeholder="مثلاً 1001"
          />
        </FormField>
        <FormField label="رقم">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            dir="ltr"
            className="text-left"
          />
        </FormField>
        <FormField label="نوٹ (اختیاری)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </FormField>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'محفوظ…' : 'ایڈوانس محفوظ کریں'}
        </Button>
      </form>
    </div>
  );
}
