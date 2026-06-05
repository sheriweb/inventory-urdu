import { BadRequestException, Injectable } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { LeaseStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { requireShopId } from '../../common/utils';
import { DateRangeQueryDto } from './dto';

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
  constructor(private readonly prisma: PrismaService) {}

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

    const leases = await this.prisma.leaseAccount.findMany({
      where: {
        shopId,
        ...(accountDate ? { accountDate } : {}),
        ...(query.recoveryManId ? { recoveryManId: query.recoveryManId } : {}),
      },
      orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
      include: {
        customer: { select: { name: true, mobile: true } },
        salesman: { select: { id: true, name: true } },
        recoveryMan: { select: { id: true, name: true } },
        leaseItems: {
          select: { itemName: true, quantity: true, totalAmount: true },
        },
      },
    });

    const rows = leases.map((lease) => ({
      id: lease.id,
      accountNumber: lease.accountNumber,
      accountDate: lease.accountDate,
      customerName: lease.customer.name,
      customerMobile: lease.customer.mobile,
      salesman: lease.salesman,
      recoveryMan: lease.recoveryMan,
      totalAmount: toNumber(lease.totalAmount),
      advanceAmount: toNumber(lease.advanceAmount),
      remainingBalance: toNumber(lease.remainingBalance),
      installmentCount: lease.installmentCount,
      status: lease.status,
      itemsSummary: lease.leaseItems
        .map((i) => `${i.itemName} x${i.quantity}`)
        .join(', '),
    }));

    const totalSales = roundMoney(rows.reduce((sum, r) => sum + r.totalAmount, 0));
    return { rows, summary: { count: rows.length, totalSales } };
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
}
