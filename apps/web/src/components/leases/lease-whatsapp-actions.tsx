'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadShopProfile } from '@/lib/shop-profile';
import { WhatsAppMessageButton } from '@/components/ui/whatsapp-message-button';
import {
  buildAccountReceiptShareMessage,
  buildLeaseReminderWhatsAppMessage,
  buildReceiptShareMessage,
} from '@/lib/whatsapp-messages';
import { InstallmentStatus } from '@inventory-urdu/shared';
import { findNextDueInstallment, owedOnInstallment } from '@/lib/lease-installments';
import { DEFAULT_REMINDER_TEMPLATE } from '@/lib/reminder-message';

type InstallmentRow = {
  id: string;
  installmentNumber: number;
  dueDate: string;
  scheduledAmount: string | number;
  paidAmount: string | number;
  status: InstallmentStatus;
};

type PaymentRow = {
  id: string;
  amount: string | number;
  paymentDate: string;
  paymentType: 'INSTALLMENT' | 'ADVANCE' | 'DISCOUNT';
  receiptNumber: number;
};

type LeaseWhatsAppActionsProps = {
  accountNumber: number;
  accountDate: string;
  totalAmount: string | number;
  advanceAmount: string | number;
  customerName: string;
  customerMobile?: string | null;
  installments: InstallmentRow[];
  payments?: PaymentRow[];
};

export function LeaseWhatsAppActions({
  accountNumber,
  accountDate,
  totalAmount,
  advanceAmount,
  customerName,
  customerMobile,
  installments,
  payments = [],
}: LeaseWhatsAppActionsProps) {
  const [shopName, setShopName] = useState('انوینٹری اردو');
  const [template, setTemplate] = useState(DEFAULT_REMINDER_TEMPLATE);

  useEffect(() => {
    (async () => {
      try {
        const { shop } = await loadShopProfile();
        if (shop.name?.trim()) setShopName(shop.name.trim());
        if (shop.reminderMessageTemplate?.trim()) {
          setTemplate(shop.reminderMessageTemplate.trim());
        }
      } catch {
        /* defaults */
      }
    })();
  }, []);

  const reminderMessage = useMemo(() => {
    const next = findNextDueInstallment(installments);
    if (!next) return '';
    const owed = owedOnInstallment(next);
    if (owed <= 0) return '';
    return buildLeaseReminderWhatsAppMessage({
      template,
      customerName,
      shopName,
      accountNumber,
      amount: owed,
      dueDate: next.dueDate,
    });
  }, [accountNumber, customerName, installments, shopName, template]);

  const receiptMessage = useMemo(() => {
    const sorted = [...payments].sort(
      (a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime(),
    );
    const latest = sorted[0];
    if (latest) {
      return buildReceiptShareMessage({
        shopName,
        customerName,
        accountNumber,
        receiptNumber: latest.receiptNumber,
        amount: latest.amount,
        paymentDate: latest.paymentDate,
        paymentType: latest.paymentType,
      });
    }
    return buildAccountReceiptShareMessage({
      shopName,
      customerName,
      accountNumber,
      totalAmount,
      advanceAmount,
      accountDate,
    });
  }, [
    accountDate,
    accountNumber,
    advanceAmount,
    customerName,
    payments,
    shopName,
    totalAmount,
  ]);

  if (!customerMobile?.trim()) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {reminderMessage ? (
        <WhatsAppMessageButton
          mobile={customerMobile}
          message={reminderMessage}
          label="قسط یاد دہانی"
        />
      ) : null}
      <WhatsAppMessageButton
        mobile={customerMobile}
        message={receiptMessage}
        label="رسید شیئر"
      />
    </span>
  );
}
