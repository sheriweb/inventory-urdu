import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { LeaseStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { buildPagination } from '../../common/dto/list-query.dto';
import { requireShopId } from '../../common/utils';
import {
  AccountsQueryDto,
  CreateLeaseAccountDto,
  DiscountLeaseDto,
  UpdateLeaseAccountDto,
} from './dto';
import { ScheduleGeneratorService } from './schedule-generator.service';

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
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

const staffSelect = { id: true, name: true, type: true, mobile: true };

const leaseInclude = {
  customer: { select: { id: true, name: true, mobile: true, cnic: true } },
  salesman: { select: staffSelect },
  recoveryMan: { select: staffSelect },
  outdoorMan: { select: staffSelect },
  leaseItems: {
    include: { item: { select: { id: true, itemCode: true, name: true } } },
  },
  installments: { orderBy: { installmentNumber: 'asc' as const } },
};

@Injectable()
export class LeaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleGenerator: ScheduleGeneratorService,
  ) {}

  private async assertCustomerInShop(shopId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, shopId, isActive: true },
    });
    if (!customer) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Customer'));
    }
  }

  private async assertStaffInShop(shopId: string, staffId: string, label: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId, isActive: true },
    });
    if (!staff) {
      throw new BadRequestException(MESSAGES.NOT_FOUND(label));
    }
  }

  private async assertItemInShop(shopId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, shopId, isActive: true },
    });
    if (!item) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Item'));
    }
  }

  private async nextAccountNumber(shopId: string, tx: Prisma.TransactionClient) {
    const result = await tx.leaseAccount.aggregate({
      where: { shopId },
      _max: { accountNumber: true },
    });
    return (result._max.accountNumber ?? 0) + 1;
  }

  private calcItemsTotal(items: CreateLeaseAccountDto['items']): number {
    return items.reduce((sum, line) => sum + line.rate * line.quantity, 0);
  }

  async create(user: AuthUser, dto: CreateLeaseAccountDto) {
    const shopId = requireShopId(user);
    await this.assertCustomerInShop(shopId, dto.customerId);

    if (dto.salesmanId) {
      await this.assertStaffInShop(shopId, dto.salesmanId, 'Salesman');
    }
    if (dto.recoveryManId) {
      await this.assertStaffInShop(shopId, dto.recoveryManId, 'Recovery man');
    }
    if (dto.outdoorManId) {
      await this.assertStaffInShop(shopId, dto.outdoorManId, 'Outdoor man');
    }

    for (const line of dto.items) {
      if (line.itemId) {
        await this.assertItemInShop(shopId, line.itemId);
      }
    }

    const totalAmount = Math.round(this.calcItemsTotal(dto.items) * 100) / 100;
    if (totalAmount <= 0) {
      throw new BadRequestException('Lease total must be greater than zero');
    }
    if (dto.advanceAmount > totalAmount) {
      throw new BadRequestException('Advance amount cannot exceed total amount');
    }

    const accountDate = new Date(dto.accountDate);
    if (Number.isNaN(accountDate.getTime())) {
      throw new BadRequestException('Invalid account date');
    }

    let schedule;
    try {
      schedule = this.scheduleGenerator.generate({
        totalAmount,
        advanceAmount: dto.advanceAmount,
        installmentAmount: dto.installmentAmount,
        frequency: dto.frequency,
        startDate: accountDate,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid installment schedule';
      throw new BadRequestException(message);
    }

    const remainingBalance = Math.round((totalAmount - dto.advanceAmount) * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      const accountNumber = await this.nextAccountNumber(shopId, tx);

      const lease = await tx.leaseAccount.create({
        data: {
          shopId,
          accountNumber,
          accountDate,
          customerId: dto.customerId,
          salesmanId: dto.salesmanId,
          recoveryManId: dto.recoveryManId,
          outdoorManId: dto.outdoorManId,
          totalAmount,
          advanceAmount: dto.advanceAmount,
          remainingBalance,
          originalInstallmentAmount: dto.installmentAmount,
          currentInstallmentAmount: dto.installmentAmount,
          installmentCount: schedule.length,
          frequency: dto.frequency,
          status: LeaseStatus.ACTIVE,
          note: dto.note,
          leaseItems: {
            create: dto.items.map((line) => ({
              itemId: line.itemId,
              itemName: line.itemName,
              rate: line.rate,
              quantity: line.quantity,
              totalAmount: Math.round(line.rate * line.quantity * 100) / 100,
            })),
          },
          installments: {
            create: schedule.map((row) => ({
              installmentNumber: row.installmentNumber,
              dueDate: row.dueDate,
              dayName: row.dayName,
              scheduledAmount: row.scheduledAmount,
              paidAmount: row.paidAmount,
              status: row.status,
              isShort: row.isShort,
              carriedForwardAmount: row.carriedForwardAmount,
            })),
          },
        },
        include: leaseInclude,
      });

      return lease;
    });
  }

  async findAll(user: AuthUser, query: AccountsQueryDto = {}) {
    const shopId = requireShopId(user);

    const accountDate: Prisma.DateTimeFilter = {};
    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
      accountDate.gte = startOfDay(from);
    }
    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
      accountDate.lte = endOfDay(to);
    }

    const search = query.search?.trim();
    const where: Prisma.LeaseAccountWhereInput = {
      shopId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.recoveryManId ? { recoveryManId: query.recoveryManId } : {}),
      ...(Object.keys(accountDate).length ? { accountDate } : {}),
      ...(search
        ? {
            OR: [
              ...(Number.isInteger(Number(search))
                ? [{ accountNumber: Number(search) }]
                : []),
              { customer: { name: { contains: search } } },
              { customer: { mobile: { contains: search } } },
            ],
          }
        : {}),
    };

    const include = {
      customer: { select: { id: true, name: true, mobile: true } },
      salesman: { select: staffSelect },
      recoveryMan: { select: staffSelect },
      outdoorMan: { select: staffSelect },
      _count: { select: { leaseItems: true, installments: true } },
    } as const;

    const usePagination = Boolean(query.page || query.limit);
    if (!usePagination) {
      return this.prisma.leaseAccount.findMany({
        where,
        orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
        include,
      });
    }

    const { page, limit, skip } = buildPagination(query);
    const [data, total] = await Promise.all([
      this.prisma.leaseAccount.findMany({
        where,
        orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
        skip,
        take: limit,
        include,
      }),
      this.prisma.leaseAccount.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const lease = await this.prisma.leaseAccount.findFirst({
      where: { id, shopId },
      include: leaseInclude,
    });
    if (!lease) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Lease account'));
    }
    return lease;
  }

  private async logAudit(
    tx: Prisma.TransactionClient,
    params: {
      shopId: string;
      userId: string;
      action: string;
      entityType: string;
      entityId: string;
      details?: Prisma.InputJsonValue;
    },
  ) {
    await tx.auditLog.create({
      data: {
        shopId: params.shopId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        details: params.details,
      },
    });
  }

  private async nextReceiptNumber(
    tx: Prisma.TransactionClient,
    shopId: string,
  ): Promise<number> {
    const result = await tx.payment.aggregate({
      where: { shopId },
      _max: { receiptNumber: true },
    });
    return (result._max.receiptNumber ?? 0) + 1;
  }

  async update(user: AuthUser, id: string, dto: UpdateLeaseAccountDto) {
    const shopId = requireShopId(user);
    const existing = await this.findOne(user, id);

    if (dto.salesmanId) {
      await this.assertStaffInShop(shopId, dto.salesmanId, 'Salesman');
    }
    if (dto.recoveryManId) {
      await this.assertStaffInShop(shopId, dto.recoveryManId, 'Recovery man');
    }
    if (dto.outdoorManId) {
      await this.assertStaffInShop(shopId, dto.outdoorManId, 'Outdoor man');
    }

    const data: Prisma.LeaseAccountUpdateInput = {};
    if (dto.salesmanId !== undefined) {
      data.salesman = dto.salesmanId
        ? { connect: { id: dto.salesmanId } }
        : { disconnect: true };
    }
    if (dto.recoveryManId !== undefined) {
      data.recoveryMan = dto.recoveryManId
        ? { connect: { id: dto.recoveryManId } }
        : { disconnect: true };
    }
    if (dto.outdoorManId !== undefined) {
      data.outdoorMan = dto.outdoorManId
        ? { connect: { id: dto.outdoorManId } }
        : { disconnect: true };
    }
    if (dto.note !== undefined) {
      data.note = dto.note;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaseAccount.update({
        where: { id },
        data,
        include: leaseInclude,
      });

      await this.logAudit(tx, {
        shopId,
        userId: user.id,
        action: 'LEASE_UPDATED',
        entityType: 'LeaseAccount',
        entityId: id,
        details: {
          accountNumber: existing.accountNumber,
          before: {
            salesmanId: existing.salesmanId,
            recoveryManId: existing.recoveryManId,
            outdoorManId: existing.outdoorManId,
            note: existing.note,
            status: existing.status,
          },
          after: {
            salesmanId: updated.salesmanId,
            recoveryManId: updated.recoveryManId,
            outdoorManId: updated.outdoorManId,
            note: updated.note,
            status: updated.status,
          },
        },
      });

      return updated;
    });
  }

  async applyDiscount(user: AuthUser, id: string, dto: DiscountLeaseDto) {
    const shopId = requireShopId(user);
    const lease = await this.findOne(user, id);
    const remaining = toNumber(lease.remainingBalance);

    if (dto.amount > remaining) {
      throw new BadRequestException('Discount amount exceeds remaining balance');
    }

    const newBalance = roundMoney(remaining - dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.leaseAccount.update({
        where: { id },
        data: { remainingBalance: newBalance },
        include: leaseInclude,
      });

      const receiptNumber = await this.nextReceiptNumber(tx, shopId);

      const payment = await tx.payment.create({
        data: {
          shopId,
          leaseAccountId: id,
          amount: dto.amount,
          paymentDate: new Date(),
          collectedByUserId: user.id,
          collectedById: lease.recoveryManId ?? undefined,
          paymentType: PaymentType.DISCOUNT,
          receiptNumber,
          note: dto.note,
        },
      });

      await this.logAudit(tx, {
        shopId,
        userId: user.id,
        action: 'LEASE_DISCOUNT',
        entityType: 'LeaseAccount',
        entityId: id,
        details: {
          accountNumber: lease.accountNumber,
          amount: dto.amount,
          previousBalance: remaining,
          newBalance,
          paymentId: payment.id,
        },
      });

      return { lease: updated, payment };
    });
  }
}
