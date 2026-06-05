import { Injectable } from '@nestjs/common';
import { InstallmentFrequency, InstallmentStatus } from '@inventory-urdu/shared';

export interface GeneratedInstallment {
  installmentNumber: number;
  dueDate: Date;
  dayName: string;
  scheduledAmount: number;
  paidAmount: number;
  status: InstallmentStatus;
  isShort: boolean;
  carriedForwardAmount: number;
}

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function addFrequency(base: Date, frequency: InstallmentFrequency, periods: number): Date {
  const date = new Date(base);
  switch (frequency) {
    case InstallmentFrequency.DAILY:
      date.setDate(date.getDate() + periods);
      break;
    case InstallmentFrequency.WEEKLY:
      date.setDate(date.getDate() + periods * 7);
      break;
    case InstallmentFrequency.FIFTEEN_DAYS:
      date.setDate(date.getDate() + periods * 15);
      break;
    case InstallmentFrequency.MONTHLY:
      date.setMonth(date.getMonth() + periods);
      break;
    default:
      throw new Error(`Unsupported frequency: ${frequency}`);
  }
  return date;
}

@Injectable()
export class ScheduleGeneratorService {
  generate(params: {
    totalAmount: number;
    advanceAmount: number;
    installmentAmount: number;
    frequency: InstallmentFrequency;
    startDate: Date;
  }): GeneratedInstallment[] {
    const { totalAmount, advanceAmount, installmentAmount, frequency, startDate } = params;

    if (installmentAmount <= 0) {
      throw new Error('Installment amount must be greater than zero');
    }

    let remaining = roundMoney(totalAmount - advanceAmount);
    if (remaining < 0) {
      throw new Error('Advance amount cannot exceed total amount');
    }

    const installments: GeneratedInstallment[] = [];
    let installmentNumber = 1;

    while (remaining > 0) {
      const scheduledAmount =
        remaining >= installmentAmount ? installmentAmount : roundMoney(remaining);
      const isShort = scheduledAmount < installmentAmount;
      const dueDate = addFrequency(startDate, frequency, installmentNumber - 1);

      installments.push({
        installmentNumber,
        dueDate,
        dayName: DAY_NAMES[dueDate.getDay()],
        scheduledAmount,
        paidAmount: 0,
        status: InstallmentStatus.PENDING,
        isShort,
        carriedForwardAmount: 0,
      });

      remaining = roundMoney(remaining - scheduledAmount);
      installmentNumber += 1;
    }

    return installments;
  }
}
