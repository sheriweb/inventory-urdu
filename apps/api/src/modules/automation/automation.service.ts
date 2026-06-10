import { Injectable, Logger } from '@nestjs/common';
import { InstallmentStatus, LeaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

/** 3 months grace after first overdue before ڈیفالٹر کھاتہ */
const DEFAULTED_GRACE_DAYS = 90;

const UNPAID_STATUSES: InstallmentStatus[] = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
];

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Mark past-due unpaid installments as OVERDUE (A1). */
  async markOverdueInstallments(shopId?: string): Promise<number> {
    const todayStart = startOfDay(new Date());

    const rows = await this.prisma.installmentSchedule.findMany({
      where: {
        dueDate: { lt: todayStart },
        status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL] },
        leaseAccount: {
          status: { in: [LeaseStatus.ACTIVE, LeaseStatus.DEFAULTED] },
          ...(shopId ? { shopId } : {}),
        },
      },
      select: { id: true, scheduledAmount: true, paidAmount: true },
    });

    const ids = rows
      .filter((row) => toNumber(row.paidAmount) < toNumber(row.scheduledAmount))
      .map((row) => row.id);

    if (ids.length === 0) {
      await this.syncLeaseAccountStatuses(shopId);
      return 0;
    }

    const result = await this.prisma.installmentSchedule.updateMany({
      where: { id: { in: ids } },
      data: { status: InstallmentStatus.OVERDUE },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} installment(s) as OVERDUE`);
    }

    await this.syncLeaseAccountStatuses(shopId);
    return result.count;
  }

  private isUnpaidInstallment(row: {
    scheduledAmount: Prisma.Decimal | number;
    paidAmount: Prisma.Decimal | number;
  }): boolean {
    return toNumber(row.paidAmount) < toNumber(row.scheduledAmount);
  }

  private earliestOverdueDueDate(
    installments: { dueDate: Date; scheduledAmount: Prisma.Decimal | number; paidAmount: Prisma.Decimal | number }[],
    before: Date,
  ): Date | null {
    let earliest: Date | null = null;
    for (const row of installments) {
      if (!this.isUnpaidInstallment(row)) continue;
      const due = startOfDay(new Date(row.dueDate));
      if (due >= before) continue;
      if (!earliest || due < earliest) earliest = due;
    }
    return earliest;
  }

  /** Close fully-paid leases; flag chronic defaulters after 3-month grace; restore when cleared. */
  async syncLeaseAccountStatuses(shopId?: string): Promise<void> {
    const shopFilter = shopId ? { shopId } : {};
    const todayStart = startOfDay(new Date());
    const graceCutoff = new Date(todayStart);
    graceCutoff.setDate(graceCutoff.getDate() - DEFAULTED_GRACE_DAYS);

    await this.prisma.leaseAccount.updateMany({
      where: {
        ...shopFilter,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.DEFAULTED] },
        remainingBalance: { lte: 0 },
      },
      data: { status: LeaseStatus.CLOSED },
    });

    const activeLeases = await this.prisma.leaseAccount.findMany({
      where: { ...shopFilter, status: LeaseStatus.ACTIVE },
      select: {
        id: true,
        installments: {
          where: { status: { in: UNPAID_STATUSES } },
          select: { dueDate: true, scheduledAmount: true, paidAmount: true },
        },
      },
    });

    const defaultedIds = activeLeases
      .filter((lease) => {
        const earliest = this.earliestOverdueDueDate(lease.installments, todayStart);
        return earliest !== null && earliest <= graceCutoff;
      })
      .map((lease) => lease.id);

    if (defaultedIds.length > 0) {
      await this.prisma.leaseAccount.updateMany({
        where: { id: { in: defaultedIds } },
        data: { status: LeaseStatus.DEFAULTED },
      });
      this.logger.log(`Marked ${defaultedIds.length} lease(s) as DEFAULTED (>${DEFAULTED_GRACE_DAYS}d grace)`);
    }

    const defaultedLeases = await this.prisma.leaseAccount.findMany({
      where: { ...shopFilter, status: LeaseStatus.DEFAULTED },
      select: {
        id: true,
        remainingBalance: true,
        installments: {
          where: { status: { in: UNPAID_STATUSES } },
          select: { dueDate: true, scheduledAmount: true, paidAmount: true },
        },
      },
    });

    const restoreIds: string[] = [];
    for (const lease of defaultedLeases) {
      if (toNumber(lease.remainingBalance) <= 0) continue;
      const earliest = this.earliestOverdueDueDate(lease.installments, todayStart);
      if (earliest === null) {
        restoreIds.push(lease.id);
      }
    }

    if (restoreIds.length > 0) {
      await this.prisma.leaseAccount.updateMany({
        where: { id: { in: restoreIds } },
        data: { status: LeaseStatus.ACTIVE },
      });
      this.logger.log(`Restored ${restoreIds.length} lease(s) from DEFAULTED to ACTIVE`);
    }
  }
}
