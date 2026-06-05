import { BadRequestException, Injectable } from '@nestjs/common';
import {
  InstallmentStatus,
  PaymentType,
  Prisma,
} from '@prisma/client';
import { RoznamchaService } from '../roznamcha/roznamcha.service';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

@Injectable()
export class PaymentRecordingService {
  constructor(private readonly roznamchaService: RoznamchaService) {}

  applyPaymentToSchedule(
    scheduledAmount: number,
    previousPaid: number,
    amount: number,
  ) {
    const paidAmount = roundMoney(previousPaid + amount);
    const isShort = paidAmount < scheduledAmount;
    const status: InstallmentStatus =
      paidAmount >= scheduledAmount
        ? InstallmentStatus.PAID
        : paidAmount > 0
          ? InstallmentStatus.PARTIAL
          : InstallmentStatus.PENDING;
    return { paidAmount, isShort, status };
  }

  async nextReceiptNumber(
    tx: Prisma.TransactionClient,
    shopId: string,
  ): Promise<number> {
    const result = await tx.payment.aggregate({
      where: { shopId },
      _max: { receiptNumber: true },
    });
    return (result._max.receiptNumber ?? 0) + 1;
  }

  async recalcRemainingBalance(
    tx: Prisma.TransactionClient,
    leaseAccountId: string,
  ) {
    const rows = await tx.installmentSchedule.findMany({
      where: { leaseAccountId },
      select: { scheduledAmount: true, paidAmount: true },
    });

    let remaining = 0;
    for (const row of rows) {
      const unpaid = toNumber(row.scheduledAmount) - toNumber(row.paidAmount);
      if (unpaid > 0) {
        remaining += unpaid;
      }
    }

    await tx.leaseAccount.update({
      where: { id: leaseAccountId },
      data: { remainingBalance: roundMoney(remaining) },
    });
  }

  async recordInstallmentPayment(
    tx: Prisma.TransactionClient,
    params: {
      shopId: string;
      userId: string;
      leaseAccountId: string;
      scheduleId: string;
      amount: number;
      note?: string;
      accountNumber: number;
      recoveryManId?: string | null;
      enforceDueDate?: boolean;
    },
  ) {
    const schedule = await tx.installmentSchedule.findFirst({
      where: {
        id: params.scheduleId,
        leaseAccountId: params.leaseAccountId,
        leaseAccount: { shopId: params.shopId },
      },
    });

    if (!schedule) {
      throw new BadRequestException('قسط نہیں ملی');
    }

    if (params.enforceDueDate !== false) {
      const dueEnd = endOfDay(new Date());
      if (new Date(schedule.dueDate) > dueEnd) {
        throw new BadRequestException('اس قسط کی تاریخ ابھی نہیں آئی — صرف واجب قسط وصول کریں');
      }
    }

    if (
      schedule.status !== InstallmentStatus.PENDING &&
      schedule.status !== InstallmentStatus.PARTIAL &&
      schedule.status !== InstallmentStatus.OVERDUE
    ) {
      throw new BadRequestException('یہ قسط پہلے ہی ادا ہو چکی ہے');
    }

    const scheduledAmount = toNumber(schedule.scheduledAmount);
    const previousPaid = toNumber(schedule.paidAmount);
    const { paidAmount, isShort, status } = this.applyPaymentToSchedule(
      scheduledAmount,
      previousPaid,
      params.amount,
    );

    const updatedSchedule = await tx.installmentSchedule.update({
      where: { id: params.scheduleId },
      data: { paidAmount, isShort, status },
    });

    await this.recalcRemainingBalance(tx, params.leaseAccountId);

    const receiptNumber = await this.nextReceiptNumber(tx, params.shopId);

    const payment = await tx.payment.create({
      data: {
        shopId: params.shopId,
        leaseAccountId: params.leaseAccountId,
        scheduleId: params.scheduleId,
        amount: params.amount,
        paymentDate: new Date(),
        collectedByUserId: params.userId,
        collectedById: params.recoveryManId ?? undefined,
        paymentType: PaymentType.INSTALLMENT,
        receiptNumber,
        note: params.note,
      },
    });

    await this.roznamchaService.createEntryForPayment(tx, {
      shopId: params.shopId,
      userId: params.userId,
      paymentId: payment.id,
      amount: params.amount,
      paymentDate: payment.paymentDate,
      accountNumber: params.accountNumber,
      receiptNumber: payment.receiptNumber,
      paymentType: PaymentType.INSTALLMENT,
    });

    return { schedule: updatedSchedule, payment };
  }
}
