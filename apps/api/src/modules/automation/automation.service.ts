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

const DEFAULTED_OVERDUE_THRESHOLD = 3;

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
          status: LeaseStatus.ACTIVE,
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

  /** Close fully-paid leases; flag chronic defaulters (core qist lifecycle). */
  async syncLeaseAccountStatuses(shopId?: string): Promise<void> {
    const shopFilter = shopId ? { shopId } : {};

    await this.prisma.leaseAccount.updateMany({
      where: {
        ...shopFilter,
        status: LeaseStatus.ACTIVE,
        remainingBalance: { lte: 0 },
      },
      data: { status: LeaseStatus.CLOSED },
    });

    const activeLeases = await this.prisma.leaseAccount.findMany({
      where: { ...shopFilter, status: LeaseStatus.ACTIVE },
      select: {
        id: true,
        installments: {
          where: { status: InstallmentStatus.OVERDUE },
          select: { scheduledAmount: true, paidAmount: true },
        },
      },
    });

    const defaultedIds = activeLeases
      .filter((lease) => {
        const overdueUnpaid = lease.installments.filter(
          (row) => toNumber(row.paidAmount) < toNumber(row.scheduledAmount),
        );
        return overdueUnpaid.length >= DEFAULTED_OVERDUE_THRESHOLD;
      })
      .map((lease) => lease.id);

    if (defaultedIds.length > 0) {
      await this.prisma.leaseAccount.updateMany({
        where: { id: { in: defaultedIds } },
        data: { status: LeaseStatus.DEFAULTED },
      });
      this.logger.log(`Marked ${defaultedIds.length} lease(s) as DEFAULTED`);
    }
  }
}
