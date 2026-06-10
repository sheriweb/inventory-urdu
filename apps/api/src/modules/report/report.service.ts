import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { InstallmentStatus, LeaseStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { requireShopId } from '../../common/utils';
import { MESSAGES } from '../../common/constants';
import { RecoveryService } from '../recovery/recovery.service';
import { DateRangeQueryDto } from './dto';
import { buildDailySummaryParagraph } from './daily-summary-text';

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

function parseDateRange(query: DateRangeQueryDto): {
  from?: Date;
  to?: Date;
  paymentDate?: Prisma.DateTimeFilter;
  accountDate?: Prisma.DateTimeFilter;
  dueDate?: Prisma.DateTimeFilter;
} {
  const paymentDate: Prisma.DateTimeFilter = {};
  const accountDate: Prisma.DateTimeFilter = {};
  const dueDate: Prisma.DateTimeFilter = {};
  let from: Date | undefined;
  let to: Date | undefined;

  if (query.from) {
    from = new Date(query.from);
    if (Number.isNaN(from.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    paymentDate.gte = startOfDay(from);
    accountDate.gte = startOfDay(from);
    dueDate.gte = startOfDay(from);
  }
  if (query.to) {
    to = new Date(query.to);
    if (Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid to date');
    }
    paymentDate.lte = endOfDay(to);
    accountDate.lte = endOfDay(to);
    dueDate.lte = endOfDay(to);
  }

  return {
    from,
    to,
    paymentDate: Object.keys(paymentDate).length ? paymentDate : undefined,
    accountDate: Object.keys(accountDate).length ? accountDate : undefined,
    dueDate: Object.keys(dueDate).length ? dueDate : undefined,
  };
}

function isShortRow(scheduled: number, paid: number, isShort: boolean): boolean {
  return isShort || (paid > 0 && paid < scheduled);
}

@Injectable()
export class ReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly recoveryService: RecoveryService,
  ) {}

  async getShortListReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const { dueDate } = parseDateRange(query);

    const rows = await this.prisma.installmentSchedule.findMany({
      where: {
        leaseAccount: {
          shopId,
          ...(query.recoveryManId ? { recoveryManId: query.recoveryManId } : {}),
        },
        ...(dueDate ? { dueDate } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      include: {
        leaseAccount: {
          select: {
            id: true,
            accountNumber: true,
            customer: { select: { id: true, name: true, mobile: true } },
            recoveryMan: { select: { id: true, name: true } },
          },
        },
      },
    });

    return rows
      .filter((row) => {
        const scheduled = toNumber(row.scheduledAmount);
        const paid = toNumber(row.paidAmount);
        return isShortRow(scheduled, paid, row.isShort);
      })
      .map((row) => {
        const scheduled = toNumber(row.scheduledAmount);
        const paid = toNumber(row.paidAmount);
        return {
          id: row.id,
          leaseAccountId: row.leaseAccountId,
          accountNumber: row.leaseAccount.accountNumber,
          customerName: row.leaseAccount.customer.name,
          customerMobile: row.leaseAccount.customer.mobile,
          recoveryMan: row.leaseAccount.recoveryMan,
          installmentNumber: row.installmentNumber,
          dueDate: row.dueDate,
          scheduledAmount: scheduled,
          paidAmount: paid,
          shortfall: roundMoney(scheduled - paid),
          status: row.status,
        };
      });
  }

  async getShortBalanceReport(user: AuthUser, query: DateRangeQueryDto) {
    const shortList = await this.getShortListReport(user, query);
    const byAccount = new Map<
      string,
      {
        leaseAccountId: string;
        accountNumber: number;
        customerName: string;
        recoveryMan: { id: string; name: string } | null;
        shortInstallmentCount: number;
        totalShortfall: number;
      }
    >();

    for (const row of shortList) {
      const existing = byAccount.get(row.leaseAccountId);
      if (existing) {
        existing.shortInstallmentCount += 1;
        existing.totalShortfall = roundMoney(existing.totalShortfall + row.shortfall);
      } else {
        byAccount.set(row.leaseAccountId, {
          leaseAccountId: row.leaseAccountId,
          accountNumber: row.accountNumber,
          customerName: row.customerName,
          recoveryMan: row.recoveryMan,
          shortInstallmentCount: 1,
          totalShortfall: row.shortfall,
        });
      }
    }

    const rows = [...byAccount.values()].sort((a, b) => a.accountNumber - b.accountNumber);
    const totalShortfall = roundMoney(rows.reduce((sum, r) => sum + r.totalShortfall, 0));

    return { rows, summary: { accountCount: rows.length, totalShortfall } };
  }

  private async fetchPaymentReportRows(
    shopId: string,
    query: DateRangeQueryDto,
    paymentType?: PaymentType,
  ) {
    const { paymentDate } = parseDateRange(query);

    return this.prisma.payment.findMany({
      where: {
        shopId,
        ...(paymentType ? { paymentType } : {}),
        ...(paymentDate ? { paymentDate } : {}),
        ...(query.recoveryManId ? { collectedById: query.recoveryManId } : {}),
      },
      orderBy: [{ paymentDate: 'desc' }, { receiptNumber: 'desc' }],
      include: {
        leaseAccount: {
          select: {
            accountNumber: true,
            recoveryMan: { select: { id: true, name: true } },
            customer: { select: { name: true, mobile: true } },
          },
        },
      },
    });
  }

  async getRecoveryDetailReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const payments = await this.fetchPaymentReportRows(
      shopId,
      query,
      PaymentType.INSTALLMENT,
    );

    const rows = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate,
      accountNumber: p.leaseAccount.accountNumber,
      customerName: p.leaseAccount.customer.name,
      customerMobile: p.leaseAccount.customer.mobile,
      amount: toNumber(p.amount),
      paymentType: p.paymentType,
      recoveryMan: p.leaseAccount.recoveryMan,
      note: p.note,
    }));

    const totalAmount = roundMoney(rows.reduce((sum, r) => sum + r.amount, 0));
    return { rows, summary: { count: rows.length, totalAmount } };
  }

  async getRecoveryManReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const payments = await this.fetchPaymentReportRows(shopId, query);

    const byStaff = new Map<
      string,
      {
        recoveryManId: string;
        recoveryManName: string;
        paymentCount: number;
        totalAmount: number;
      }
    >();

    for (const payment of payments) {
      const staffId = payment.collectedById ?? payment.leaseAccount.recoveryMan?.id ?? 'unknown';
      const staffName =
        payment.leaseAccount.recoveryMan?.name ?? 'غیر مقرر';

      const existing = byStaff.get(staffId);
      const amount = toNumber(payment.amount);
      if (existing) {
        existing.paymentCount += 1;
        existing.totalAmount = roundMoney(existing.totalAmount + amount);
      } else {
        byStaff.set(staffId, {
          recoveryManId: staffId,
          recoveryManName: staffName,
          paymentCount: 1,
          totalAmount: amount,
        });
      }
    }

    const rows = [...byStaff.values()].sort((a, b) =>
      a.recoveryManName.localeCompare(b.recoveryManName, 'ur'),
    );
    const totalAmount = roundMoney(rows.reduce((sum, r) => sum + r.totalAmount, 0));

    return { rows, summary: { staffCount: rows.length, totalAmount } };
  }

  async getAdvanceDetailReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const payments = await this.fetchPaymentReportRows(
      shopId,
      query,
      PaymentType.ADVANCE,
    );

    const rows = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      paymentDate: p.paymentDate,
      accountNumber: p.leaseAccount.accountNumber,
      customerName: p.leaseAccount.customer.name,
      amount: toNumber(p.amount),
      recoveryMan: p.leaseAccount.recoveryMan,
      note: p.note,
    }));

    const totalAmount = roundMoney(rows.reduce((sum, r) => sum + r.amount, 0));
    return { rows, summary: { count: rows.length, totalAmount } };
  }

  async getSalesReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const { accountDate } = parseDateRange(query);

    /** صرف فعال مارکیٹ — نل / بند کھاتے رپورٹ میں نہیں */
    const leases = await this.prisma.leaseAccount.findMany({
      where: {
        shopId,
        status: LeaseStatus.ACTIVE,
        remainingBalance: { gt: 0 },
        ...(accountDate ? { accountDate } : {}),
        ...(query.recoveryManId ? { recoveryManId: query.recoveryManId } : {}),
        ...(query.salesmanId ? { salesmanId: query.salesmanId } : {}),
        ...(query.outdoorManId ? { outdoorManId: query.outdoorManId } : {}),
      },
      orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
      include: {
        customer: {
          select: {
            name: true,
            mobile: true,
            fatherOrHusbandName: true,
            presentAddress: true,
          },
        },
        salesman: { select: { id: true, name: true } },
        recoveryMan: { select: { id: true, name: true } },
        outdoorMan: { select: { id: true, name: true } },
        leaseItems: {
          select: { itemName: true, quantity: true, totalAmount: true },
        },
      },
    });

    const rows = leases.map((lease) => {
      const remainingBalance = toNumber(lease.remainingBalance);
      const installmentAmount =
        remainingBalance > 0 ? toNumber(lease.currentInstallmentAmount) : 0;
      return {
        id: lease.id,
        accountNumber: lease.accountNumber,
        accountDate: lease.accountDate,
        customerName: lease.customer.name,
        customerMobile: lease.customer.mobile,
        fatherOrHusbandName: lease.customer.fatherOrHusbandName,
        presentAddress: lease.customer.presentAddress,
        salesman: lease.salesman,
        recoveryMan: lease.recoveryMan,
        outdoorMan: lease.outdoorMan,
        totalAmount: roundMoney(toNumber(lease.totalAmount)),
        advanceAmount: roundMoney(toNumber(lease.advanceAmount)),
        remainingBalance: roundMoney(remainingBalance),
        installmentAmount: roundMoney(installmentAmount),
        installmentCount: lease.installmentCount,
        status: lease.status,
        itemsSummary: lease.leaseItems
          .map((i) => `${i.itemName} x${i.quantity}`)
          .join(', '),
      };
    });

    const totalSales = roundMoney(rows.reduce((sum, r) => sum + r.totalAmount, 0));
    const totalAdvance = roundMoney(
      rows.reduce((sum, r) => sum + (Number.isFinite(r.advanceAmount) ? r.advanceAmount : 0), 0),
    );
    const totalInstallment = roundMoney(
      rows.reduce((sum, r) => sum + (Number.isFinite(r.installmentAmount) ? r.installmentAmount : 0), 0),
    );
    const totalRemaining = roundMoney(
      rows.reduce((sum, r) => sum + (Number.isFinite(r.remainingBalance) ? r.remainingBalance : 0), 0),
    );

    return {
      rows,
      summary: {
        count: rows.length,
        totalSales,
        totalAdvance,
        totalInstallment,
        totalRemaining,
      },
    };
  }

  async getBillProfitReport(user: AuthUser, query: DateRangeQueryDto) {
    const shopId = requireShopId(user);
    const { accountDate } = parseDateRange(query);

    const leases = await this.prisma.leaseAccount.findMany({
      where: {
        shopId,
        ...(accountDate ? { accountDate } : {}),
        ...(query.recoveryManId ? { recoveryManId: query.recoveryManId } : {}),
      },
      orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
      include: {
        customer: { select: { name: true } },
        leaseItems: {
          include: {
            item: { select: { purchaseRate: true } },
          },
        },
      },
    });

    const rows = leases.map((lease) => {
      const saleTotal = toNumber(lease.totalAmount);
      let costTotal = 0;
      for (const line of lease.leaseItems) {
        const purchaseRate = line.item
          ? toNumber(line.item.purchaseRate)
          : toNumber(line.rate);
        costTotal += purchaseRate * line.quantity;
      }
      costTotal = roundMoney(costTotal);
      const profit = roundMoney(saleTotal - costTotal);

      return {
        id: lease.id,
        accountNumber: lease.accountNumber,
        accountDate: lease.accountDate,
        customerName: lease.customer.name,
        saleTotal,
        costTotal,
        profit,
        profitPercent: saleTotal > 0 ? roundMoney((profit / saleTotal) * 100) : 0,
      };
    });

    const totalProfit = roundMoney(rows.reduce((sum, r) => sum + r.profit, 0));
    const totalSales = roundMoney(rows.reduce((sum, r) => sum + r.saleTotal, 0));

    return {
      rows,
      summary: { count: rows.length, totalSales, totalProfit },
    };
  }

  async getDailySummary(user: AuthUser, dateInput?: string) {
    const shopId = requireShopId(user);
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId },
      select: { name: true },
    });
    if (!shop) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Shop'));
    }

    const baseDate = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const dayStart = startOfDay(baseDate);
    const dayEnd = endOfDay(baseDate);

    const tomorrow = new Date(baseDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStart = startOfDay(tomorrow);
    const tomorrowEnd = endOfDay(tomorrow);

    const pendingStatuses = [
      InstallmentStatus.PENDING,
      InstallmentStatus.PARTIAL,
      InstallmentStatus.OVERDUE,
    ];

    const dashboard = await this.recoveryService.getDashboardStats(user);

    const [newSales, tomorrowDueRows, lateInstallments] = await Promise.all([
      this.prisma.leaseAccount.aggregate({
        where: {
          shopId,
          accountDate: { gte: dayStart, lte: dayEnd },
        },
        _count: true,
        _sum: { totalAmount: true },
      }),
      this.prisma.installmentSchedule.findMany({
        where: {
          dueDate: { gte: tomorrowStart, lte: tomorrowEnd },
          status: { in: pendingStatuses },
          leaseAccount: { shopId, status: LeaseStatus.ACTIVE },
        },
        select: { scheduledAmount: true, paidAmount: true },
      }),
      this.prisma.installmentSchedule.findMany({
        where: {
          leaseAccount: { shopId, status: LeaseStatus.ACTIVE },
          OR: [
            { status: InstallmentStatus.OVERDUE },
            {
              dueDate: { lt: dayStart },
              status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL] },
            },
          ],
        },
        select: {
          scheduledAmount: true,
          paidAmount: true,
          leaseAccount: {
            select: {
              id: true,
              accountNumber: true,
              customer: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const tomorrowDueAmount = roundMoney(
      tomorrowDueRows.reduce((sum, row) => {
        const owed = Math.max(0, toNumber(row.scheduledAmount) - toNumber(row.paidAmount));
        return sum + owed;
      }, 0),
    );

    const lateByLease = new Map<
      string,
      { name: string; accountNumber: number; owedAmount: number }
    >();

    for (const row of lateInstallments) {
      const owed = Math.max(0, toNumber(row.scheduledAmount) - toNumber(row.paidAmount));
      if (owed <= 0) continue;
      const leaseId = row.leaseAccount.id;
      const existing = lateByLease.get(leaseId);
      if (existing) {
        existing.owedAmount = roundMoney(existing.owedAmount + owed);
      } else {
        lateByLease.set(leaseId, {
          name: row.leaseAccount.customer.name,
          accountNumber: row.leaseAccount.accountNumber,
          owedAmount: roundMoney(owed),
        });
      }
    }

    const topLateCustomers = [...lateByLease.values()]
      .sort((a, b) => b.owedAmount - a.owedAmount)
      .slice(0, 5);

    const dateIso = dayStart.toISOString().slice(0, 10);
    const stats = {
      todayCollectionCount: dashboard.todayCollectionCount,
      todayCollectionAmount: dashboard.todayCollectionAmount,
      todayDueCount: dashboard.todayDueCount,
      overdueCount: dashboard.overdueCount,
      defaultedAccountsCount: dashboard.defaultedAccountsCount,
      pendingReminderCount: dashboard.pendingReminderCount,
      newSalesCount: newSales._count,
      newSalesAmount: roundMoney(toNumber(newSales._sum.totalAmount ?? 0)),
      tomorrowDueCount: tomorrowDueRows.length,
      tomorrowDueAmount,
    };

    const paragraphUrdu = buildDailySummaryParagraph(
      shop.name,
      dateIso,
      stats,
      topLateCustomers,
    );

    return {
      date: dateIso,
      shopName: shop.name,
      stats,
      topLateCustomers,
      paragraphUrdu,
    };
  }
}
