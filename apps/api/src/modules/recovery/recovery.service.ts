import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import {
  InstallmentStatus,
  LeaseStatus,
  PaymentType,
  Prisma,
  ReminderChannel,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { AutomationService } from '../automation/automation.service';
import { RoznamchaService } from '../roznamcha/roznamcha.service';
import { PaymentRecordingService } from './payment-recording.service';
import {
  CollectAdvanceDto,
  CollectPaymentDto,
  MarkReminderSentDto,
  PaymentRecordsQueryDto,
  RecoveryListQueryDto,
  ReminderQueryDto,
} from './dto';

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

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function guarantorFirstName(name: string | undefined): string | null {
  if (!name?.trim()) {
    return null;
  }
  return name.trim().split(/\s+/)[0] ?? null;
}

function buildItemsSummary(
  items: { itemName: string; quantity: number }[],
): string {
  return items
    .map((line) => `${line.itemName} x${line.quantity}`)
    .join(', ');
}

function parseAdditionalMobiles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean);
}

function daysBetween(from: Date, to: Date): number {
  const a = startOfDay(from).getTime();
  const b = startOfDay(to).getTime();
  return Math.max(0, Math.floor((b - a) / (24 * 60 * 60 * 1000)));
}

const DEFAULT_REMINDER_TEMPLATE =
  'السلام علیکم {name}،\n{shop} سے یاد دہانی: کھاتہ #{account} کی قسط Rs {amount} {dueDate} کو واجب ہے۔ براہ کرم وقت پر ادا کریں۔ شکریہ';

const PENDING_INSTALLMENT_STATUSES: InstallmentStatus[] = [
  InstallmentStatus.PENDING,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.OVERDUE,
];

@Injectable()
export class RecoveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roznamchaService: RoznamchaService,
    private readonly automationService: AutomationService,
    private readonly paymentRecording: PaymentRecordingService,
  ) {}

  private async nextReceiptNumber(
    tx: Prisma.TransactionClient,
    shopId: string,
  ): Promise<number> {
    return this.paymentRecording.nextReceiptNumber(tx, shopId);
  }

  private async recalcRemainingBalance(
    tx: Prisma.TransactionClient,
    leaseAccountId: string,
  ) {
    await this.paymentRecording.recalcRemainingBalance(tx, leaseAccountId);
  }

  private applyPaymentToSchedule(
    scheduledAmount: number,
    previousPaid: number,
    amount: number,
  ) {
    return this.paymentRecording.applyPaymentToSchedule(
      scheduledAmount,
      previousPaid,
      amount,
    );
  }

  async getRecoveryList(user: AuthUser, query: RecoveryListQueryDto) {
    const shopId = requireShopId(user);
    await this.automationService.markOverdueInstallments(shopId);
    const asOf = query.date ? new Date(query.date) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dueBefore = endOfDay(asOf);
    const asOfStart = startOfDay(asOf);

    const recoveryManId = query.recoveryManId;

    const leases = await this.prisma.leaseAccount.findMany({
      where: {
        shopId,
        status: LeaseStatus.ACTIVE,
        ...(recoveryManId ? { recoveryManId } : {}),
        installments: {
          some: {
            status: {
              in: [
                InstallmentStatus.PENDING,
                InstallmentStatus.PARTIAL,
                InstallmentStatus.OVERDUE,
              ],
            },
            dueDate: { lte: dueBefore },
          },
        },
      },
      include: {
        customer: {
          select: {
            name: true,
            mobile: true,
            additionalMobiles: true,
            presentAddress: true,
            permanentAddress: true,
            guarantors: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
              take: 1,
              select: { name: true, phone: true },
            },
          },
        },
        recoveryMan: { select: { id: true, name: true } },
        leaseItems: { select: { itemName: true, quantity: true } },
        installments: {
          where: {
            status: {
              in: [
                InstallmentStatus.PENDING,
                InstallmentStatus.PARTIAL,
                InstallmentStatus.OVERDUE,
              ],
            },
            dueDate: { lte: dueBefore },
          },
          orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
        },
      },
    });

    const rows = leases.map((lease) => {
      const next = lease.installments[0];
      const address =
        lease.customer.presentAddress ??
        lease.customer.permanentAddress ??
        null;
      const guarantor = lease.customer.guarantors[0];
      const scheduled = next ? toNumber(next.scheduledAmount) : 0;
      const paid = next ? toNumber(next.paidAmount) : 0;
      const installmentDue = next ? Math.max(0, roundMoney(scheduled - paid)) : 0;
      const dueDate = next ? new Date(next.dueDate) : null;
      const dueDayStart = dueDate ? startOfDay(dueDate) : null;

      const overdueInstallments = lease.installments.filter((inst) => {
        const unpaid = toNumber(inst.paidAmount) < toNumber(inst.scheduledAmount);
        return unpaid && startOfDay(new Date(inst.dueDate)) < asOfStart;
      });

      const isOverdue = overdueInstallments.length > 0;
      const isDueOnDate =
        Boolean(next) &&
        dueDayStart !== null &&
        dueDayStart >= asOfStart &&
        dueDayStart <= dueBefore &&
        installmentDue > 0;
      const isShort =
        Boolean(next) &&
        paid > 0 &&
        installmentDue > 0 &&
        (next.isShort || paid < scheduled);

      let listCategory: 'OVERDUE' | 'SHORT' | 'DUE' = 'DUE';
      if (isOverdue) listCategory = 'OVERDUE';
      else if (isShort) listCategory = 'SHORT';

      const daysOverdue =
        isOverdue && dueDayStart
          ? daysBetween(dueDayStart, asOfStart)
          : 0;

      return {
        leaseAccountId: lease.id,
        accountNumber: lease.accountNumber,
        customer: {
          name: lease.customer.name,
          mobile: lease.customer.mobile,
          additionalMobiles: parseAdditionalMobiles(lease.customer.additionalMobiles),
          address,
        },
        guarantorFirstName: guarantorFirstName(guarantor?.name),
        guarantorName: guarantor?.name ?? null,
        guarantorPhone: guarantor?.phone ?? null,
        itemsSummary: buildItemsSummary(lease.leaseItems),
        nextDueInstallment: next
          ? {
              id: next.id,
              installmentNumber: next.installmentNumber,
              dueDate: next.dueDate,
              status: next.status,
            }
          : null,
        scheduledAmount: next ? scheduled : null,
        paidAmount: next ? paid : null,
        installmentDue,
        totalRemaining: toNumber(lease.remainingBalance),
        isOverdue,
        isDueOnDate,
        isShort,
        listCategory,
        daysOverdue,
        overdueInstallmentCount: overdueInstallments.length,
        recoveryMan: lease.recoveryMan
          ? { id: lease.recoveryMan.id, name: lease.recoveryMan.name }
          : null,
      };
    });

    rows.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
      if (a.listCategory === 'SHORT' && b.listCategory !== 'SHORT') return -1;
      if (b.listCategory === 'SHORT' && a.listCategory !== 'SHORT') return 1;
      const aDue = a.nextDueInstallment?.dueDate
        ? new Date(a.nextDueInstallment.dueDate).getTime()
        : 0;
      const bDue = b.nextDueInstallment?.dueDate
        ? new Date(b.nextDueInstallment.dueDate).getTime()
        : 0;
      if (aDue !== bDue) return aDue - bDue;
      return a.accountNumber - b.accountNumber;
    });

    const summary = {
      total: rows.length,
      overdue: rows.filter((r) => r.isOverdue).length,
      dueOnDate: rows.filter((r) => r.isDueOnDate && !r.isOverdue).length,
      short: rows.filter((r) => r.isShort && !r.isOverdue).length,
    };

    return { rows, summary };
  }

  async collectPayment(user: AuthUser, dto: CollectPaymentDto) {
    const shopId = requireShopId(user);

    const schedule = await this.prisma.installmentSchedule.findFirst({
      where: {
        id: dto.scheduleId,
        leaseAccountId: dto.leaseAccountId,
        leaseAccount: { shopId },
      },
      include: {
        leaseAccount: {
          select: { id: true, recoveryManId: true, accountNumber: true },
        },
      },
    });

    if (!schedule) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Installment schedule'));
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const recorded = await this.paymentRecording.recordInstallmentPayment(tx, {
        shopId,
        userId: user.id,
        leaseAccountId: dto.leaseAccountId,
        scheduleId: dto.scheduleId,
        amount: dto.amount,
        note: dto.note,
        accountNumber: schedule.leaseAccount.accountNumber,
        recoveryManId: schedule.leaseAccount.recoveryManId,
      });
      return recorded;
    });

    await this.automationService.syncLeaseAccountStatuses(shopId);
    return result;
  }

  async collectAdvance(user: AuthUser, dto: CollectAdvanceDto) {
    const shopId = requireShopId(user);

    const lease = await this.prisma.leaseAccount.findFirst({
      where: { shopId, accountNumber: dto.accountNumber },
      include: {
        installments: {
          where: {
            status: {
              in: [
                InstallmentStatus.PENDING,
                InstallmentStatus.PARTIAL,
                InstallmentStatus.OVERDUE,
              ],
            },
          },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!lease) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Lease account'));
    }

    let remainingToApply = roundMoney(dto.amount);
    const totalUnpaid = lease.installments.reduce((sum, row) => {
      return sum + Math.max(0, toNumber(row.scheduledAmount) - toNumber(row.paidAmount));
    }, 0);

    if (remainingToApply > roundMoney(totalUnpaid)) {
      throw new BadRequestException(
        'Advance amount exceeds remaining installment balance',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      for (const installment of lease.installments) {
        if (remainingToApply <= 0) {
          break;
        }

        const scheduledAmount = toNumber(installment.scheduledAmount);
        const previousPaid = toNumber(installment.paidAmount);
        const owed = roundMoney(scheduledAmount - previousPaid);
        if (owed <= 0) {
          continue;
        }

        const apply = roundMoney(Math.min(remainingToApply, owed));
        const { paidAmount, isShort, status } = this.applyPaymentToSchedule(
          scheduledAmount,
          previousPaid,
          apply,
        );

        await tx.installmentSchedule.update({
          where: { id: installment.id },
          data: { paidAmount, isShort, status },
        });

        remainingToApply = roundMoney(remainingToApply - apply);
      }

      await this.recalcRemainingBalance(tx, lease.id);

      const receiptNumber = await this.nextReceiptNumber(tx, shopId);

      const payment = await tx.payment.create({
        data: {
          shopId,
          leaseAccountId: lease.id,
          amount: dto.amount,
          paymentDate: new Date(),
          collectedByUserId: user.id,
          collectedById: lease.recoveryManId ?? undefined,
          paymentType: PaymentType.ADVANCE,
          receiptNumber,
          note: dto.note,
        },
      });

      await this.roznamchaService.createEntryForPayment(tx, {
        shopId,
        userId: user.id,
        paymentId: payment.id,
        amount: dto.amount,
        paymentDate: payment.paymentDate,
        accountNumber: lease.accountNumber,
        receiptNumber: payment.receiptNumber,
        paymentType: PaymentType.ADVANCE,
      });

      return { payment, leaseAccountId: lease.id };
    });

    await this.automationService.syncLeaseAccountStatuses(shopId);
    return result;
  }

  async getPaymentRecords(user: AuthUser, query: PaymentRecordsQueryDto) {
    const shopId = requireShopId(user);

    const paymentDate: Prisma.DateTimeFilter = {};
    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
      paymentDate.gte = startOfDay(from);
    }
    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
      paymentDate.lte = endOfDay(to);
    }

    const payments = await this.prisma.payment.findMany({
      where: {
        shopId,
        ...(Object.keys(paymentDate).length ? { paymentDate } : {}),
        ...(query.recoveryManId
          ? { collectedById: query.recoveryManId }
          : {}),
      },
      orderBy: [{ paymentDate: 'desc' }, { receiptNumber: 'desc' }],
      include: {
        leaseAccount: {
          select: {
            accountNumber: true,
            customer: { select: { name: true } },
          },
        },
      },
    });

    const userIds = [
      ...new Set(
        payments
          .map((p) => p.collectedByUserId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const staffIds = [
      ...new Set(
        payments
          .map((p) => p.collectedById)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const [users, staff] = await Promise.all([
      userIds.length
        ? this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true },
          })
        : [],
      staffIds.length
        ? this.prisma.staff.findMany({
            where: { id: { in: staffIds } },
            select: { id: true, name: true },
          })
        : [],
    ]);

    const userNameById = new Map(users.map((u) => [u.id, u.name]));
    const staffNameById = new Map(staff.map((s) => [s.id, s.name]));

    return payments.map((payment) => ({
      id: payment.id,
      leaseAccountId: payment.leaseAccountId,
      scheduleId: payment.scheduleId,
      accountNumber: payment.leaseAccount.accountNumber,
      customerName: payment.leaseAccount.customer.name,
      amount: toNumber(payment.amount),
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      receiptNumber: payment.receiptNumber,
      note: payment.note,
      collector: {
        userId: payment.collectedByUserId,
        userName: payment.collectedByUserId
          ? (userNameById.get(payment.collectedByUserId) ?? null)
          : null,
        staffId: payment.collectedById,
        staffName: payment.collectedById
          ? (staffNameById.get(payment.collectedById) ?? null)
          : null,
      },
    }));
  }

  async getPaymentById(user: AuthUser, paymentId: string) {
    const shopId = requireShopId(user);
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, shopId },
      include: {
        leaseAccount: {
          select: {
            accountNumber: true,
            customer: { select: { name: true, mobile: true, cnic: true } },
            shop: { select: { name: true } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Payment'));
    }

    return {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: toNumber(payment.amount),
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      note: payment.note,
      accountNumber: payment.leaseAccount.accountNumber,
      customerName: payment.leaseAccount.customer.name,
      customerMobile: payment.leaseAccount.customer.mobile,
      customerCnic: payment.leaseAccount.customer.cnic,
      shopName: payment.leaseAccount.shop.name,
    };
  }

  async deletePayment(user: AuthUser, paymentId: string) {
    const shopId = requireShopId(user);

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, shopId },
      include: { schedule: true },
    });

    if (!payment) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Payment'));
    }

    if (payment.paymentType === PaymentType.DISCOUNT) {
      throw new BadRequestException('Discount payments cannot be deleted');
    }

    if (payment.paymentType === PaymentType.ADVANCE) {
      throw new BadRequestException(
        'Advance payments cannot be deleted from here — contact admin',
      );
    }

    if (!payment.scheduleId || !payment.schedule) {
      throw new BadRequestException('Payment is not linked to an installment');
    }

    const scheduledAmount = toNumber(payment.schedule.scheduledAmount);
    const newPaid = roundMoney(toNumber(payment.schedule.paidAmount) - toNumber(payment.amount));
    if (newPaid < 0) {
      throw new BadRequestException('Cannot reverse payment — invalid schedule state');
    }

    const paidAmount = newPaid;
    const isShort = paidAmount > 0 && paidAmount < scheduledAmount;
    const status: InstallmentStatus =
      paidAmount >= scheduledAmount
        ? InstallmentStatus.PAID
        : paidAmount > 0
          ? InstallmentStatus.PARTIAL
          : InstallmentStatus.PENDING;

    return this.prisma.$transaction(async (tx) => {
      await tx.installmentSchedule.update({
        where: { id: payment.scheduleId! },
        data: { paidAmount, isShort, status },
      });

      await this.roznamchaService.deleteEntryForPayment(tx, paymentId);
      await tx.payment.delete({ where: { id: paymentId } });
      await this.recalcRemainingBalance(tx, payment.leaseAccountId);
    }).then(async () => {
      await this.automationService.syncLeaseAccountStatuses(shopId);
    });
  }

  async getDashboardStats(user: AuthUser) {
    const shopId = requireShopId(user);
    await this.automationService.markOverdueInstallments(shopId);
    const today = new Date();
    const dayStart = startOfDay(today);
    const dayEnd = endOfDay(today);

    const pendingStatuses = [
      InstallmentStatus.PENDING,
      InstallmentStatus.PARTIAL,
      InstallmentStatus.OVERDUE,
    ];

    await this.automationService.syncLeaseAccountStatuses(shopId);

    const [todayPayments, todayDue, overdue, defaultedAccountsCount] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          shopId,
          paymentDate: { gte: dayStart, lte: dayEnd },
          paymentType: PaymentType.INSTALLMENT,
        },
        _count: true,
        _sum: { amount: true },
      }),
      this.prisma.installmentSchedule.count({
        where: {
          leaseAccount: { shopId, status: LeaseStatus.ACTIVE },
          dueDate: { lte: dayEnd },
          status: { in: pendingStatuses },
        },
      }),
      this.prisma.installmentSchedule.count({
        where: {
          leaseAccount: { shopId, status: LeaseStatus.ACTIVE },
          dueDate: { lt: dayStart },
          status: { in: pendingStatuses },
        },
      }),
      this.prisma.leaseAccount.count({
        where: { shopId, status: LeaseStatus.DEFAULTED },
      }),
    ]);

    return {
      todayCollectionCount: todayPayments._count,
      todayCollectionAmount: roundMoney(toNumber(todayPayments._sum.amount ?? 0)),
      todayDueCount: todayDue,
      overdueCount: overdue,
      defaultedAccountsCount,
      pendingReminderCount: await this.countPendingReminders(shopId),
    };
  }

  private async getShopReminderConfig(shopId: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId },
      select: {
        name: true,
        reminderEnabled: true,
        reminderDaysBefore: true,
        reminderMessageTemplate: true,
      },
    });
    if (!shop) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Shop'));
    }
    return shop;
  }

  private reminderTargetWindow(daysBefore: number) {
    const targetDay = new Date();
    targetDay.setDate(targetDay.getDate() + daysBefore);
    return {
      daysBefore,
      dayStart: startOfDay(targetDay),
      dayEnd: endOfDay(targetDay),
    };
  }

  private async fetchDueSchedulesForReminder(shopId: string, dayStart: Date, dayEnd: Date) {
    const rows = await this.prisma.installmentSchedule.findMany({
      where: {
        dueDate: { gte: dayStart, lte: dayEnd },
        status: { in: PENDING_INSTALLMENT_STATUSES },
        leaseAccount: {
          shopId,
          status: LeaseStatus.ACTIVE,
          customer: { mobile: { not: null } },
        },
      },
      include: {
        leaseAccount: {
          select: {
            id: true,
            accountNumber: true,
            customer: { select: { name: true, mobile: true } },
          },
        },
        reminderLogs: true,
      },
      orderBy: [{ dueDate: 'asc' }, { installmentNumber: 'asc' }],
    });

    return rows.filter((row) => {
      const owed = toNumber(row.scheduledAmount) - toNumber(row.paidAmount);
      return owed > 0;
    });
  }

  private logsForDueDate(
    logs: { channel: ReminderChannel; reminderDueDate: Date }[],
    dueDate: Date,
  ) {
    const dueStart = startOfDay(dueDate).getTime();
    const dueEnd = endOfDay(dueDate).getTime();
    return logs.filter((log) => {
      const t = log.reminderDueDate.getTime();
      return t >= dueStart && t <= dueEnd;
    });
  }

  private mapReminderRow(
    row: Awaited<ReturnType<typeof this.fetchDueSchedulesForReminder>>[number],
    shopName: string,
    messageTemplate: string,
  ) {
    const owed = roundMoney(toNumber(row.scheduledAmount) - toNumber(row.paidAmount));
    const dueLogs = this.logsForDueDate(row.reminderLogs, row.dueDate);
    const sentWhatsApp = dueLogs.some((l) => l.channel === ReminderChannel.WHATSAPP);
    const sentSms = dueLogs.some((l) => l.channel === ReminderChannel.SMS);

    return {
      scheduleId: row.id,
      leaseAccountId: row.leaseAccount.id,
      accountNumber: row.leaseAccount.accountNumber,
      installmentNumber: row.installmentNumber,
      dueDate: row.dueDate,
      amount: owed,
      customerName: row.leaseAccount.customer.name,
      customerMobile: row.leaseAccount.customer.mobile,
      shopName,
      messageTemplate,
      sentWhatsApp,
      sentSms,
      pending: !sentWhatsApp && !sentSms,
    };
  }

  async countPendingReminders(shopId: string, daysBefore?: number): Promise<number> {
    const shop = await this.getShopReminderConfig(shopId);
    if (!shop.reminderEnabled) return 0;

    const window = this.reminderTargetWindow(daysBefore ?? shop.reminderDaysBefore ?? 2);
    const rows = await this.fetchDueSchedulesForReminder(shopId, window.dayStart, window.dayEnd);
    const template = shop.reminderMessageTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;

    return rows
      .map((row) => this.mapReminderRow(row, shop.name, template))
      .filter((row) => row.pending).length;
  }

  async listInstallmentReminders(user: AuthUser, query: ReminderQueryDto) {
    const shopId = requireShopId(user);
    await this.automationService.markOverdueInstallments(shopId);
    const shop = await this.getShopReminderConfig(shopId);
    const daysBefore = query.daysBefore ?? shop.reminderDaysBefore ?? 2;
    const template = shop.reminderMessageTemplate?.trim() || DEFAULT_REMINDER_TEMPLATE;

    if (!shop.reminderEnabled) {
      return {
        enabled: false,
        daysBefore,
        messageTemplate: template,
        items: [],
      };
    }

    const window = this.reminderTargetWindow(daysBefore);
    const rows = await this.fetchDueSchedulesForReminder(shopId, window.dayStart, window.dayEnd);

    return {
      enabled: true,
      daysBefore,
      targetDate: window.dayStart,
      messageTemplate: template,
      items: rows.map((row) => this.mapReminderRow(row, shop.name, template)),
    };
  }

  async markReminderSent(user: AuthUser, scheduleId: string, dto: MarkReminderSentDto) {
    const shopId = requireShopId(user);
    const channel =
      dto.channel === 'SMS' ? ReminderChannel.SMS : ReminderChannel.WHATSAPP;

    const schedule = await this.prisma.installmentSchedule.findFirst({
      where: {
        id: scheduleId,
        leaseAccount: { shopId, status: LeaseStatus.ACTIVE },
      },
      select: {
        id: true,
        dueDate: true,
        scheduledAmount: true,
        paidAmount: true,
        status: true,
      },
    });

    if (!schedule) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Installment schedule'));
    }

    const owed = toNumber(schedule.scheduledAmount) - toNumber(schedule.paidAmount);
    if (owed <= 0 || schedule.status === InstallmentStatus.PAID) {
      throw new BadRequestException('یہ قسط پہلے ہی ادا ہو چکی ہے');
    }

    const reminderDueDate = startOfDay(schedule.dueDate);

    await this.prisma.installmentReminderLog.upsert({
      where: {
        scheduleId_reminderDueDate_channel: {
          scheduleId,
          reminderDueDate,
          channel,
        },
      },
      create: {
        shopId,
        scheduleId,
        channel,
        reminderDueDate,
      },
      update: {
        sentAt: new Date(),
      },
    });

    return { scheduleId, channel: dto.channel, reminderDueDate };
  }
}
