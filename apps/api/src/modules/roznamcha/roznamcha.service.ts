import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import {
  CreateExpenseAccountDto,
  CreateRoznamchaEntryDto,
  RoznamchaDailyBalanceDto,
  RoznamchaDateRangeDto,
} from './dto';

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

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

const EXPENSE_GROUP_LABELS: Record<string, string> = {
  OFFICE: 'دفتر',
  HOME: 'گھر',
  VEHICLE: 'گاڑی',
  PETTY_CASH: 'چھوٹا خرچ',
};

@Injectable()
export class RoznamchaService {
  constructor(private readonly prisma: PrismaService) {}

  private parseRange(query: RoznamchaDateRangeDto): { from: Date; to: Date } {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getFullYear(), to.getMonth(), 1);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new BadRequestException('Invalid date range');
    }

    return { from: startOfDay(from), to: endOfDay(to) };
  }

  private async lastBalance(shopId: string, before?: Date): Promise<number> {
    const where: Prisma.RoznamchaEntryWhereInput = { shopId };
    if (before) {
      where.entryDate = { lt: before };
    }

    const last = await this.prisma.roznamchaEntry.findFirst({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      select: { balanceAfter: true },
    });

    return last ? toNumber(last.balanceAfter) : 0;
  }

  private async lastBalanceInTx(
    tx: Prisma.TransactionClient,
    shopId: string,
    before?: Date,
  ): Promise<number> {
    const where: Prisma.RoznamchaEntryWhereInput = { shopId };
    if (before) {
      where.entryDate = { lt: before };
    }

    const last = await tx.roznamchaEntry.findFirst({
      where,
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
      select: { balanceAfter: true },
    });

    return last ? toNumber(last.balanceAfter) : 0;
  }

  /** Auto roznamcha entry when installment/advance is collected (A2). */
  async createEntryForPayment(
    tx: Prisma.TransactionClient,
    params: {
      shopId: string;
      userId: string;
      paymentId: string;
      amount: number;
      paymentDate: Date;
      accountNumber: number;
      receiptNumber: number;
      paymentType: PaymentType;
    },
  ): Promise<void> {
    const shop = await tx.shop.findFirst({
      where: { id: params.shopId },
      select: { autoRoznamchaOnCollection: true },
    });

    if (!shop?.autoRoznamchaOnCollection) {
      return;
    }

    if (params.paymentType === PaymentType.DISCOUNT) {
      return;
    }

    const existing = await tx.roznamchaEntry.findFirst({
      where: { paymentId: params.paymentId },
      select: { id: true },
    });
    if (existing) {
      return;
    }

    const recoveryAmount = roundMoney(params.amount);
    if (recoveryAmount <= 0) {
      return;
    }

    const typeLabel =
      params.paymentType === PaymentType.ADVANCE ? 'ایڈوانس وصولی' : 'قسط وصولی';
    const previousBalance = await this.lastBalanceInTx(tx, params.shopId);
    const balanceAfter = roundMoney(previousBalance + recoveryAmount);

    await tx.roznamchaEntry.create({
      data: {
        shopId: params.shopId,
        entryDate: params.paymentDate,
        detail: `${typeLabel} — رسید #${params.receiptNumber} — کھاتہ #${params.accountNumber}`,
        expenseAmount: 0,
        recoveryAmount,
        balanceAfter,
        operatorUserId: params.userId,
        paymentId: params.paymentId,
      },
    });
  }

  async deleteEntryForPayment(tx: Prisma.TransactionClient, paymentId: string): Promise<void> {
    await tx.roznamchaEntry.deleteMany({ where: { paymentId } });
  }

  async listExpenseAccounts(user: AuthUser) {
    const shopId = requireShopId(user);
    const rows = await this.prisma.expenseAccount.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => ({
      ...row,
      groupLabel: EXPENSE_GROUP_LABELS[row.group] ?? row.group,
    }));
  }

  async createExpenseAccount(user: AuthUser, dto: CreateExpenseAccountDto) {
    const shopId = requireShopId(user);
    return this.prisma.expenseAccount.create({
      data: {
        shopId,
        name: dto.name.trim(),
        group: dto.group,
      },
    });
  }

  async createEntry(user: AuthUser, dto: CreateRoznamchaEntryDto) {
    const shopId = requireShopId(user);
    const entryDate = new Date(dto.entryDate);
    if (Number.isNaN(entryDate.getTime())) {
      throw new BadRequestException('Invalid entry date');
    }

    const expenseAmount = roundMoney(dto.expenseAmount ?? 0);
    const recoveryAmount = roundMoney(dto.recoveryAmount ?? 0);

    if (expenseAmount <= 0 && recoveryAmount <= 0) {
      throw new BadRequestException('Enter expense or recovery amount');
    }

    if (dto.expenseAccountId) {
      const account = await this.prisma.expenseAccount.findFirst({
        where: { id: dto.expenseAccountId, shopId, isActive: true },
      });
      if (!account) {
        throw new NotFoundException(MESSAGES.NOT_FOUND('Expense account'));
      }
    } else if (expenseAmount > 0) {
      throw new BadRequestException('Expense account is required for expense entries');
    }

    const previousBalance = await this.lastBalance(shopId);
    const balanceAfter = roundMoney(previousBalance + recoveryAmount - expenseAmount);

    return this.prisma.roznamchaEntry.create({
      data: {
        shopId,
        entryDate,
        expenseAccountId: dto.expenseAccountId,
        detail: dto.detail?.trim() || null,
        expenseAmount,
        recoveryAmount,
        balanceAfter,
        operatorUserId: user.id,
      },
      include: {
        expenseAccount: { select: { id: true, name: true, group: true } },
      },
    });
  }

  async listEntries(user: AuthUser, query: RoznamchaDateRangeDto) {
    const shopId = requireShopId(user);
    const { from, to } = this.parseRange(query);

    const rows = await this.prisma.roznamchaEntry.findMany({
      where: { shopId, entryDate: { gte: from, lte: to } },
      include: {
        expenseAccount: { select: { id: true, name: true, group: true } },
      },
      orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
    });

    const summary = rows.reduce(
      (acc, row) => {
        acc.totalExpense += toNumber(row.expenseAmount);
        acc.totalRecovery += toNumber(row.recoveryAmount);
        return acc;
      },
      { totalExpense: 0, totalRecovery: 0 },
    );

    return {
      rows,
      summary: {
        ...summary,
        net: roundMoney(summary.totalRecovery - summary.totalExpense),
        closingBalance: rows[0] ? toNumber(rows[0].balanceAfter) : await this.lastBalance(shopId, from),
      },
    };
  }

  async cashBook(user: AuthUser, query: RoznamchaDateRangeDto) {
    const shopId = requireShopId(user);
    const { from, to } = this.parseRange(query);

    const [entries, payments] = await Promise.all([
      this.prisma.roznamchaEntry.findMany({
        where: { shopId, entryDate: { gte: from, lte: to } },
        select: { entryDate: true, expenseAmount: true, recoveryAmount: true },
      }),
      this.prisma.payment.findMany({
        where: { shopId, paymentDate: { gte: from, lte: to } },
        select: { paymentDate: true, amount: true },
      }),
    ]);

    const dayMap = new Map<
      string,
      { date: string; expenseOut: number; rozRecoveryIn: number; leaseRecoveryIn: number; net: number }
    >();

    function dayKey(d: Date): string {
      return startOfDay(d).toISOString().slice(0, 10);
    }

    for (const entry of entries) {
      const key = dayKey(entry.entryDate);
      const row = dayMap.get(key) ?? {
        date: key,
        expenseOut: 0,
        rozRecoveryIn: 0,
        leaseRecoveryIn: 0,
        net: 0,
      };
      row.expenseOut += toNumber(entry.expenseAmount);
      row.rozRecoveryIn += toNumber(entry.recoveryAmount);
      dayMap.set(key, row);
    }

    for (const payment of payments) {
      const key = dayKey(payment.paymentDate);
      const row = dayMap.get(key) ?? {
        date: key,
        expenseOut: 0,
        rozRecoveryIn: 0,
        leaseRecoveryIn: 0,
        net: 0,
      };
      row.leaseRecoveryIn += toNumber(payment.amount);
      dayMap.set(key, row);
    }

    const days = [...dayMap.values()]
      .map((row) => {
        const totalIn = roundMoney(row.rozRecoveryIn + row.leaseRecoveryIn);
        const totalOut = roundMoney(row.expenseOut);
        return { ...row, totalIn, totalOut, net: roundMoney(totalIn - totalOut) };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    const totals = days.reduce(
      (acc, row) => {
        acc.expenseOut += row.expenseOut;
        acc.rozRecoveryIn += row.rozRecoveryIn;
        acc.leaseRecoveryIn += row.leaseRecoveryIn;
        acc.totalIn += row.totalIn;
        acc.totalOut += row.totalOut;
        acc.net += row.net;
        return acc;
      },
      {
        expenseOut: 0,
        rozRecoveryIn: 0,
        leaseRecoveryIn: 0,
        totalIn: 0,
        totalOut: 0,
        net: 0,
      },
    );

    return {
      days,
      totals: {
        expenseOut: roundMoney(totals.expenseOut),
        rozRecoveryIn: roundMoney(totals.rozRecoveryIn),
        leaseRecoveryIn: roundMoney(totals.leaseRecoveryIn),
        totalIn: roundMoney(totals.totalIn),
        totalOut: roundMoney(totals.totalOut),
        net: roundMoney(totals.net),
      },
    };
  }

  async trialBalance(user: AuthUser, query: RoznamchaDateRangeDto) {
    const shopId = requireShopId(user);
    const { from, to } = this.parseRange(query);

    const accounts = await this.prisma.expenseAccount.findMany({
      where: { shopId, isActive: true },
      include: {
        entries: {
          where: { entryDate: { gte: from, lte: to } },
          select: { expenseAmount: true },
        },
      },
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
    });

    const groups = new Map<
      string,
      { group: string; groupLabel: string; accounts: { id: string; name: string; total: number }[]; total: number }
    >();

    for (const account of accounts) {
      const total = roundMoney(
        account.entries.reduce((sum, entry) => sum + toNumber(entry.expenseAmount), 0),
      );
      const groupLabel = EXPENSE_GROUP_LABELS[account.group] ?? account.group;
      const bucket = groups.get(account.group) ?? {
        group: account.group,
        groupLabel,
        accounts: [],
        total: 0,
      };
      bucket.accounts.push({ id: account.id, name: account.name, total });
      bucket.total = roundMoney(bucket.total + total);
      groups.set(account.group, bucket);
    }

    const rows = [...groups.values()];
    const grandTotal = roundMoney(rows.reduce((sum, row) => sum + row.total, 0));

    return { rows, grandTotal, from: from.toISOString(), to: to.toISOString() };
  }

  async removeEntry(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const entry = await this.prisma.roznamchaEntry.findFirst({ where: { id, shopId } });
    if (!entry) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Roznamcha entry'));
    }
    await this.prisma.roznamchaEntry.delete({ where: { id } });
  }

  async dailyBalance(user: AuthUser, query: RoznamchaDailyBalanceDto) {
    const shopId = requireShopId(user);
    const date = query.date ? new Date(query.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }

    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const [opening, entries, payments] = await Promise.all([
      this.lastBalance(shopId, dayStart),
      this.prisma.roznamchaEntry.findMany({
        where: { shopId, entryDate: { gte: dayStart, lte: dayEnd } },
        select: { expenseAmount: true, recoveryAmount: true },
      }),
      this.prisma.payment.aggregate({
        where: { shopId, paymentDate: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      }),
    ]);

    const rozRecovery = roundMoney(
      entries.reduce((sum, row) => sum + toNumber(row.recoveryAmount), 0),
    );
    const leaseRecovery = roundMoney(toNumber(payments._sum.amount ?? 0));
    const expense = roundMoney(entries.reduce((sum, row) => sum + toNumber(row.expenseAmount), 0));
    const totalIn = roundMoney(rozRecovery + leaseRecovery);
    const closing = roundMoney(opening + totalIn - expense);

    return {
      date: dayStart.toISOString().slice(0, 10),
      openingBalance: opening,
      rozRecovery,
      leaseRecovery,
      totalIn,
      expense,
      closingBalance: closing,
    };
  }
}
