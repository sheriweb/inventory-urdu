import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { PayInstallmentScheduleDto, UpdateInstallmentScheduleDto } from './dto';
import { PaymentRecordingService } from '../recovery/payment-recording.service';
import { AutomationService } from '../automation/automation.service';

function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class ScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => PaymentRecordingService))
    private readonly paymentRecording: PaymentRecordingService,
    private readonly automationService: AutomationService,
  ) {}

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

  private async getScheduleForShop(
    shopId: string,
    leaseId: string,
    scheduleId: string,
  ) {
    const schedule = await this.prisma.installmentSchedule.findFirst({
      where: {
        id: scheduleId,
        leaseAccountId: leaseId,
        leaseAccount: { shopId },
      },
      include: { leaseAccount: { select: { id: true, shopId: true } } },
    });
    if (!schedule) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Installment schedule'));
    }
    return schedule;
  }

  async updateSchedule(
    user: AuthUser,
    leaseId: string,
    scheduleId: string,
    dto: UpdateInstallmentScheduleDto,
  ) {
    const shopId = requireShopId(user);
    if (dto.dueDate === undefined && dto.scheduledAmount === undefined) {
      throw new BadRequestException('Provide dueDate and/or scheduledAmount to update');
    }

    const existing = await this.getScheduleForShop(shopId, leaseId, scheduleId);

    const data: Prisma.InstallmentScheduleUpdateInput = {};
    if (dto.dueDate !== undefined) {
      const dueDate = new Date(dto.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        throw new BadRequestException('Invalid due date');
      }
      data.dueDate = dueDate;
    }
    if (dto.scheduledAmount !== undefined) {
      data.scheduledAmount = dto.scheduledAmount;
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.installmentSchedule.update({
        where: { id: scheduleId },
        data,
      });

      await this.paymentRecording.recalcRemainingBalance(tx, existing.leaseAccountId);

      await this.logAudit(tx, {
        shopId,
        userId: user.id,
        action: 'SCHEDULE_UPDATED',
        entityType: 'InstallmentSchedule',
        entityId: scheduleId,
        details: {
          leaseAccountId: leaseId,
          before: {
            dueDate: existing.dueDate,
            scheduledAmount: toNumber(existing.scheduledAmount),
          },
          after: {
            dueDate: updated.dueDate,
            scheduledAmount: toNumber(updated.scheduledAmount),
          },
        },
      });

      return updated;
    });
  }

  async paySchedule(
    user: AuthUser,
    leaseId: string,
    scheduleId: string,
    dto: PayInstallmentScheduleDto,
  ) {
    const shopId = requireShopId(user);
    await this.getScheduleForShop(shopId, leaseId, scheduleId);

    const lease = await this.prisma.leaseAccount.findFirst({
      where: { id: leaseId, shopId },
      select: { accountNumber: true, recoveryManId: true },
    });
    if (!lease) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Lease account'));
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const recorded = await this.paymentRecording.recordInstallmentPayment(tx, {
        shopId,
        userId: user.id,
        leaseAccountId: leaseId,
        scheduleId,
        amount: dto.amount,
        note: dto.note,
        accountNumber: lease.accountNumber,
        recoveryManId: lease.recoveryManId,
        enforceDueDate: false,
      });

      await this.logAudit(tx, {
        shopId,
        userId: user.id,
        action: 'SCHEDULE_PAYMENT',
        entityType: 'InstallmentSchedule',
        entityId: scheduleId,
        details: {
          leaseAccountId: leaseId,
          amount: dto.amount,
          note: dto.note,
          receiptNumber: recorded.payment.receiptNumber,
        },
      });

      return recorded;
    });

    await this.automationService.syncLeaseAccountStatuses(shopId);
    return result;
  }

  async listShortInstallments(user: AuthUser) {
    const shopId = requireShopId(user);

    const rows = await this.prisma.installmentSchedule.findMany({
      where: {
        leaseAccount: { shopId },
        OR: [{ isShort: true }, { paidAmount: { gt: 0 } }],
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
      include: {
        leaseAccount: {
          select: {
            id: true,
            accountNumber: true,
            customer: { select: { id: true, name: true } },
          },
        },
      },
    });

    return rows
      .filter((row) => {
        const scheduled = toNumber(row.scheduledAmount);
        const paid = toNumber(row.paidAmount);
        return row.isShort || (paid > 0 && paid < scheduled);
      })
      .map((row) => ({
        id: row.id,
        leaseAccountId: row.leaseAccountId,
        installmentNumber: row.installmentNumber,
        dueDate: row.dueDate,
        scheduledAmount: toNumber(row.scheduledAmount),
        paidAmount: toNumber(row.paidAmount),
        status: row.status,
        isShort: row.isShort,
        accountNumber: row.leaseAccount.accountNumber,
        customerName: row.leaseAccount.customer.name,
        customerId: row.leaseAccount.customer.id,
      }));
  }
}
