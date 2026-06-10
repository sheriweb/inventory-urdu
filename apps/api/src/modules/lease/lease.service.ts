import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { InstallmentStatus, LeaseStatus, PaymentType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { buildPagination } from '../../common/dto/list-query.dto';
import { requireShopId } from '../../common/utils';
import {
  AccountsQueryDto,
  CreateLeaseAccountDto,
  DiscountLeaseDto,
  LeaseItemUnitDetailDto,
  UpdateLeaseAccountDto,
} from './dto';
import { GeneratedInstallment, ScheduleGeneratorService } from './schedule-generator.service';

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

function serializeUnitDetails(
  unitDetails?: LeaseItemUnitDetailDto[],
): Prisma.InputJsonValue | undefined {
  if (!unitDetails?.length) return undefined;

  const serialized = unitDetails
    .map((unit) => {
      const fields = unit.fields
        ?.filter((field) => field.label?.trim())
        .map((field) => ({
          label: field.label.trim(),
          value: (field.value ?? '').trim(),
        }))
        .filter((field) => field.label);

      if (fields && fields.length > 0) {
        return { unitIndex: unit.unitIndex, fields };
      }

      if (unit.values && Object.keys(unit.values).length > 0) {
        return { unitIndex: unit.unitIndex, values: unit.values };
      }

      return null;
    })
    .filter((unit) => unit !== null);

  return serialized.length > 0 ? (serialized as Prisma.InputJsonValue) : undefined;
}

const staffSelect = { id: true, name: true, type: true, mobile: true };

const leaseInclude = {
  customer: { select: { id: true, name: true, mobile: true, cnic: true } },
  salesman: { select: staffSelect },
  recoveryMan: { select: staffSelect },
  outdoorMan: { select: staffSelect },
  leaseItems: {
    include: { item: { select: { id: true, itemCode: true, name: true, identifierFields: true } } },
  },
  installments: { orderBy: { installmentNumber: 'asc' as const } },
  payments: {
    orderBy: [{ paymentDate: 'asc' as const }, { receiptNumber: 'asc' as const }],
    select: {
      id: true,
      amount: true,
      paymentDate: true,
      paymentType: true,
      receiptNumber: true,
      note: true,
      scheduleId: true,
      schedule: { select: { installmentNumber: true } },
    },
  },
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

  async getPreviewMeta(user: AuthUser) {
    const shopId = requireShopId(user);
    const [accountAgg, receiptAgg] = await Promise.all([
      this.prisma.leaseAccount.aggregate({
        where: { shopId },
        _max: { accountNumber: true },
      }),
      this.prisma.payment.aggregate({
        where: { shopId },
        _max: { receiptNumber: true },
      }),
    ]);
    return {
      nextAccountNumber: (accountAgg._max.accountNumber ?? 0) + 1,
      nextReceiptNumber: (receiptAgg._max.receiptNumber ?? 0) + 1,
    };
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

    const remainingBalance = Math.round((totalAmount - dto.advanceAmount) * 100) / 100;

    let schedule: GeneratedInstallment[] = [];
    let installmentAmount = dto.installmentAmount ?? 0;

    try {
      if (dto.installments?.length) {
        const customSum = dto.installments.reduce(
          (sum, row) => sum + Math.round(row.scheduledAmount * 100) / 100,
          0,
        );
        const customTotal = Math.round(customSum * 100) / 100;
        if (Math.abs(customTotal - remainingBalance) > 0.02) {
          throw new Error(
            `Installment total (${customTotal}) must equal remaining balance (${remainingBalance})`,
          );
        }
        schedule = this.scheduleGenerator.fromCustom(dto.installments, accountDate);
        installmentAmount =
          dto.installmentAmount ??
          schedule[0]?.scheduledAmount ??
          Math.round((remainingBalance / schedule.length) * 100) / 100;
      } else {
        if (!dto.installmentAmount || dto.installmentAmount <= 0) {
          throw new Error('Installment amount must be greater than zero');
        }
        if (remainingBalance <= 0) {
          schedule = [];
          installmentAmount = dto.installmentAmount;
        } else {
          schedule = this.scheduleGenerator.generate({
            totalAmount,
            advanceAmount: dto.advanceAmount,
            installmentAmount: dto.installmentAmount,
            frequency: dto.frequency,
            startDate: accountDate,
          });
          installmentAmount = dto.installmentAmount;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid installment schedule';
      throw new BadRequestException(message);
    }

    return this.prisma.$transaction(async (tx) => {
      let accountNumber: number;
      if (dto.accountNumber) {
        const taken = await tx.leaseAccount.findFirst({
          where: { shopId, accountNumber: dto.accountNumber },
        });
        if (taken) {
          throw new BadRequestException('Account number already exists');
        }
        accountNumber = dto.accountNumber;
      } else {
        accountNumber = await this.nextAccountNumber(shopId, tx);
      }

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
          originalInstallmentAmount: installmentAmount,
          currentInstallmentAmount: installmentAmount,
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
              unitDetails: serializeUnitDetails(line.unitDetails),
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

      if (dto.advanceAmount > 0) {
        let receiptNumber: number;
        if (dto.receiptNumber) {
          const receiptTaken = await tx.payment.findFirst({
            where: { shopId, receiptNumber: dto.receiptNumber },
          });
          if (receiptTaken) {
            throw new BadRequestException('Receipt number already exists');
          }
          receiptNumber = dto.receiptNumber;
        } else {
          receiptNumber = await this.nextReceiptNumber(tx, shopId);
        }

        await tx.payment.create({
          data: {
            shopId,
            leaseAccountId: lease.id,
            amount: dto.advanceAmount,
            paymentDate: accountDate,
            collectedByUserId: user.id,
            collectedById: dto.recoveryManId,
            paymentType: PaymentType.ADVANCE,
            receiptNumber,
            note: 'Advance — new sale',
          },
        });
      }

      return lease;
    });
  }

  private computeLatePaymentScore(overdueCount: number, status: LeaseStatus): number {
    if (status === LeaseStatus.CLOSED) return 100;
    if (overdueCount <= 0) return 100;
    if (overdueCount === 1) return 75;
    if (overdueCount === 2) return 50;
    if (overdueCount === 3) return 30;
    return Math.max(0, 20 - (overdueCount - 4) * 5);
  }

  private async attachLatePaymentStats<
    T extends { id: string; status: LeaseStatus },
  >(leases: T[]): Promise<(T & { overdueCount: number; latePaymentScore: number })[]> {
    if (leases.length === 0) return [];

    const ids = leases.map((lease) => lease.id);
    const now = startOfDay(new Date());

    const grouped = await this.prisma.installmentSchedule.groupBy({
      by: ['leaseAccountId'],
      where: {
        leaseAccountId: { in: ids },
        OR: [
          { status: InstallmentStatus.OVERDUE },
          {
            dueDate: { lt: now },
            status: { in: [InstallmentStatus.PENDING, InstallmentStatus.PARTIAL] },
          },
        ],
      },
      _count: { _all: true },
    });

    const overdueMap = new Map(
      grouped.map((row) => [row.leaseAccountId, row._count._all]),
    );

    return leases.map((lease) => {
      const overdueCount = overdueMap.get(lease.id) ?? 0;
      return {
        ...lease,
        overdueCount,
        latePaymentScore: this.computeLatePaymentScore(overdueCount, lease.status),
      };
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
      const rows = await this.prisma.leaseAccount.findMany({
        where,
        orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
        include,
      });
      return this.attachLatePaymentStats(rows);
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
      data: await this.attachLatePaymentStats(data),
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
    if (dto.accountDate !== undefined) {
      const accountDate = new Date(dto.accountDate);
      if (Number.isNaN(accountDate.getTime())) {
        throw new BadRequestException('Invalid account date');
      }
      data.accountDate = accountDate;
    }
    if (dto.frequency !== undefined) {
      data.frequency = dto.frequency;
    }
    if (dto.currentInstallmentAmount !== undefined) {
      data.currentInstallmentAmount = dto.currentInstallmentAmount;
    }
    if (dto.note !== undefined) {
      data.note = dto.note;
    }
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (dto.accountNumber !== undefined) {
      const taken = await this.prisma.leaseAccount.findFirst({
        where: { shopId, accountNumber: dto.accountNumber, id: { not: id } },
      });
      if (taken) {
        throw new BadRequestException('Account number already exists');
      }
      data.accountNumber = dto.accountNumber;
    }

    const hasLeaseFieldUpdates = Object.keys(data).length > 0;
    const hasReceiptUpdate = dto.receiptNumber !== undefined;

    if (!hasLeaseFieldUpdates && !hasReceiptUpdate) {
      throw new BadRequestException('No fields to update');
    }

    return this.prisma.$transaction(async (tx) => {
      if (hasReceiptUpdate) {
        const payment = await tx.payment.findFirst({
          where: { leaseAccountId: id, shopId },
          orderBy: [{ paymentDate: 'asc' }, { receiptNumber: 'asc' }],
        });
        if (payment) {
          const receiptTaken = await tx.payment.findFirst({
            where: {
              shopId,
              receiptNumber: dto.receiptNumber,
              id: { not: payment.id },
            },
          });
          if (receiptTaken) {
            throw new BadRequestException('Receipt number already exists');
          }
          await tx.payment.update({
            where: { id: payment.id },
            data: { receiptNumber: dto.receiptNumber },
          });
        }
      }

      if (!hasLeaseFieldUpdates) {
        return this.findOne(user, id);
      }

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
            accountDate: existing.accountDate,
            salesmanId: existing.salesmanId,
            recoveryManId: existing.recoveryManId,
            outdoorManId: existing.outdoorManId,
            frequency: existing.frequency,
            currentInstallmentAmount: existing.currentInstallmentAmount,
            note: existing.note,
            status: existing.status,
          },
          after: {
            accountDate: updated.accountDate,
            salesmanId: updated.salesmanId,
            recoveryManId: updated.recoveryManId,
            outdoorManId: updated.outdoorManId,
            frequency: updated.frequency,
            currentInstallmentAmount: updated.currentInstallmentAmount,
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
