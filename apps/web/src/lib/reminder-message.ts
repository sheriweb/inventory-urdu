import { fmtDate, fmtMoney } from '@/lib/format';

export const DEFAULT_REMINDER_TEMPLATE =
  'السلام علیکم {name}،\n{shop} سے یاد دہانی: کھاتہ #{account} کی قسط Rs {amount} {dueDate} کو واجب ہے۔ براہ کرم وقت پر ادا کریں۔ شکریہ';

type ReminderVars = {
  name: string;
  shop: string;
  account: number | string;
  amount: number | string;
  dueDate: string | Date;
};

export function buildReminderMessage(template: string, vars: ReminderVars): string {
  const amount =
    typeof vars.amount === 'number'
      ? fmtMoney(vars.amount)
      : String(vars.amount);
  const dueDate =
    vars.dueDate instanceof Date ? fmtDate(vars.dueDate.toISOString()) : fmtDate(String(vars.dueDate));

  return template
    .replaceAll('{name}', vars.name)
    .replaceAll('{shop}', vars.shop)
    .replaceAll('{account}', String(vars.account))
    .replaceAll('{amount}', amount)
    .replaceAll('{dueDate}', dueDate);
}
