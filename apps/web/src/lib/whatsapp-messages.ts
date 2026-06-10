import { fmtDate, fmtMoney } from '@/lib/format';
import { DEFAULT_REMINDER_TEMPLATE, buildReminderMessage } from '@/lib/reminder-message';
import { whatsAppHrefWithText } from '@/lib/phone';

export function buildLeaseReminderWhatsAppMessage(params: {
  template?: string;
  customerName: string;
  shopName: string;
  accountNumber: number;
  amount: number | string;
  dueDate: string | Date;
}): string {
  return buildReminderMessage(params.template?.trim() || DEFAULT_REMINDER_TEMPLATE, {
    name: params.customerName,
    shop: params.shopName,
    account: params.accountNumber,
    amount: params.amount,
    dueDate: params.dueDate,
  });
}

export function buildReceiptShareMessage(params: {
  shopName: string;
  customerName: string;
  accountNumber: number;
  receiptNumber: number;
  amount: number | string;
  paymentDate: string | Date;
  paymentType?: 'INSTALLMENT' | 'ADVANCE' | 'DISCOUNT';
}): string {
  const amount =
    typeof params.amount === 'number' ? fmtMoney(params.amount) : String(params.amount);
  const date =
    params.paymentDate instanceof Date
      ? fmtDate(params.paymentDate.toISOString())
      : fmtDate(String(params.paymentDate));

  const typeLabel =
    params.paymentType === 'ADVANCE'
      ? 'ایڈوانس وصولی'
      : params.paymentType === 'DISCOUNT'
        ? 'رعایت'
        : 'قسط وصولی';

  return [
    `السلام علیکم ${params.customerName}،`,
    `${params.shopName} — ${typeLabel}`,
    `کھاتہ #${params.accountNumber} | رسید #${params.receiptNumber}`,
    `رقم: Rs ${amount}`,
    `تاریخ: ${date}`,
    'شکریہ',
  ].join('\n');
}

export function buildAccountReceiptShareMessage(params: {
  shopName: string;
  customerName: string;
  accountNumber: number;
  totalAmount: number | string;
  advanceAmount: number | string;
  accountDate: string | Date;
}): string {
  const total =
    typeof params.totalAmount === 'number' ? fmtMoney(params.totalAmount) : String(params.totalAmount);
  const advance =
    typeof params.advanceAmount === 'number'
      ? fmtMoney(params.advanceAmount)
      : String(params.advanceAmount);
  const date =
    params.accountDate instanceof Date
      ? fmtDate(params.accountDate.toISOString())
      : fmtDate(String(params.accountDate));

  return [
    `السلام علیکم ${params.customerName}،`,
    `${params.shopName} — کھاتہ رسید`,
    `کھاتہ #${params.accountNumber}`,
    `کل رقم: Rs ${total}`,
    `ایڈوانس: Rs ${advance}`,
    `تاریخ: ${date}`,
    'شکریہ',
  ].join('\n');
}

export function openWhatsAppMessage(mobile: string | null | undefined, text: string): boolean {
  if (!mobile?.trim()) return false;
  const href = whatsAppHrefWithText(mobile, text);
  if (!href) return false;

  const isMobile =
    typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.assign(href);
  } else {
    window.open(href, '_blank', 'noopener,noreferrer');
  }
  return true;
}
