import {
  InstallmentFrequency,
  InstallmentStatus,
  LeaseStatus,
  PaymentType,
  PrismaClient,
  StaffType,
} from '@prisma/client';

const SHOP_OWNER_EMAIL = 'shop@inventory.local';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function addFrequency(base: Date, frequency: InstallmentFrequency, periods: number): Date {
  const date = new Date(base);
  if (frequency === InstallmentFrequency.WEEKLY) {
    date.setDate(date.getDate() + periods * 7);
  } else if (frequency === InstallmentFrequency.DAILY) {
    date.setDate(date.getDate() + periods);
  } else if (frequency === InstallmentFrequency.FIFTEEN_DAYS) {
    date.setDate(date.getDate() + periods * 15);
  } else {
    date.setMonth(date.getMonth() + periods);
  }
  return date;
}

function generateWeeklySchedule(params: {
  totalAmount: number;
  advanceAmount: number;
  installmentAmount: number;
  installmentCount: number;
  startDate: Date;
}) {
  const { totalAmount, advanceAmount, installmentAmount, installmentCount, startDate } = params;
  const installments: {
    installmentNumber: number;
    dueDate: Date;
    dayName: string;
    scheduledAmount: number;
  }[] = [];

  let remaining = roundMoney(totalAmount - advanceAmount);
  for (let i = 1; i <= installmentCount; i += 1) {
    const scheduledAmount =
      i === installmentCount ? roundMoney(remaining) : installmentAmount;
    const dueDate = addFrequency(startDate, InstallmentFrequency.WEEKLY, i - 1);
    installments.push({
      installmentNumber: i,
      dueDate,
      dayName: DAY_NAMES[dueDate.getDay()],
      scheduledAmount,
    });
    remaining = roundMoney(remaining - scheduledAmount);
  }

  return installments;
}

async function clearCustomerData(prisma: PrismaClient, shopId: string) {
  console.log('Clearing shop customer / lease data…');
  await prisma.$transaction([
    prisma.installmentReminderLog.deleteMany({ where: { shopId } }),
    prisma.roznamchaEntry.deleteMany({ where: { shopId, paymentId: { not: null } } }),
    prisma.payment.deleteMany({ where: { shopId } }),
    prisma.leaseAccount.deleteMany({ where: { shopId } }),
    prisma.claim.deleteMany({ where: { shopId, customerId: { not: null } } }),
    prisma.guarantor.deleteMany({ where: { shopId } }),
    prisma.customer.deleteMany({ where: { shopId } }),
  ]);
}

async function ensureBasics(prisma: PrismaClient, shopId: string) {
  let area = await prisma.area.findFirst({ where: { shopId, isActive: true } });
  if (!area) {
    area = await prisma.area.create({
      data: { shopId, name: 'ماڈل ٹاؤن', city: 'لاہور' },
    });
  }

  let salesman = await prisma.staff.findFirst({
    where: { shopId, type: StaffType.SALESMAN, isActive: true },
  });
  if (!salesman) {
    salesman = await prisma.staff.create({
      data: {
        shopId,
        areaId: area.id,
        name: 'احمد علی',
        mobile: '03001234567',
        type: StaffType.SALESMAN,
      },
    });
  }

  let recoveryMan = await prisma.staff.findFirst({
    where: { shopId, type: StaffType.RECOVERY_MAN, isActive: true },
  });
  if (!recoveryMan) {
    recoveryMan = await prisma.staff.create({
      data: {
        shopId,
        areaId: area.id,
        name: 'بابر حسین',
        mobile: '03007654321',
        type: StaffType.RECOVERY_MAN,
      },
    });
  }

  let item = await prisma.item.findFirst({ where: { shopId, isActive: true } });
  if (!item) {
    let company = await prisma.company.findFirst({ where: { shopId, isActive: true } });
    if (!company) {
      company = await prisma.company.create({ data: { shopId, name: 'Samsung Pakistan' } });
    }
    item = await prisma.item.create({
      data: {
        shopId,
        companyId: company.id,
        itemCode: 1,
        name: 'Samsung A15',
        model: 'A15 128GB',
        purchaseRate: 42000,
        saleRate: 52000,
        stockQuantity: 10,
      },
    });
  }

  return { area, salesman, recoveryMan, item };
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const owner = await prisma.user.findUnique({
      where: { email: SHOP_OWNER_EMAIL },
      include: { ownedShop: true },
    });

    if (!owner?.ownedShop) {
      throw new Error(`Shop not found for ${SHOP_OWNER_EMAIL}. Run db:seed first.`);
    }

    const shopId = owner.ownedShop.id;
    const operatorUserId = owner.id;

    await clearCustomerData(prisma, shopId);
    const { area, salesman, recoveryMan, item } = await ensureBasics(prisma, shopId);

    const specs = [
      {
        name: 'علی احمد',
        father: 'محمد اکرم',
        mobile: '03331234567',
        cnic: '3520212345671',
        accountNumber: 1001,
        total: 15000,
        advance: 3000,
        installment: 3000,
        installmentCount: 4,
        itemQty: 1,
      },
      {
        name: 'فاطمہ بی بی',
        father: 'عبدالرحمن',
        mobile: '03337654321',
        cnic: '3520298765432',
        accountNumber: 1002,
        total: 12000,
        advance: 3000,
        installment: 3000,
        installmentCount: 3,
        itemQty: 1,
      },
    ];

    let receiptNumber = 1;
    const startDate = daysAgo(14);

    for (const spec of specs) {
      const customer = await prisma.customer.create({
        data: {
          shopId,
          areaId: area.id,
          name: spec.name,
          fatherOrHusbandName: spec.father,
          mobile: spec.mobile,
          cnic: spec.cnic,
          city: 'لاہور',
          presentAddress: `${spec.name} — ماڈل ٹاؤن، لاہور`,
        },
      });

      await prisma.guarantor.create({
        data: {
          shopId,
          customerId: customer.id,
          name: `ضامن ${spec.name}`,
          cnic: `35299${spec.cnic.slice(-7)}`,
          phone: spec.mobile,
          presentAddress: 'ضامن کا پتہ',
        },
      });

      const schedule = generateWeeklySchedule({
        totalAmount: spec.total,
        advanceAmount: spec.advance,
        installmentAmount: spec.installment,
        installmentCount: spec.installmentCount,
        startDate,
      });

      const lease = await prisma.leaseAccount.create({
        data: {
          shopId,
          accountNumber: spec.accountNumber,
          accountDate: startDate,
          customerId: customer.id,
          salesmanId: salesman.id,
          recoveryManId: recoveryMan.id,
          totalAmount: spec.total,
          advanceAmount: spec.advance,
          remainingBalance: roundMoney(spec.total - spec.advance),
          originalInstallmentAmount: spec.installment,
          currentInstallmentAmount: spec.installment,
          installmentCount: schedule.length,
          frequency: InstallmentFrequency.WEEKLY,
          status: LeaseStatus.ACTIVE,
          note: 'ہفتہ وار قسط — ٹیسٹ ڈیٹا',
          leaseItems: {
            create: {
              itemId: item.id,
              itemName: item.name,
              rate: Number(item.saleRate),
              quantity: spec.itemQty,
              totalAmount: spec.total,
            },
          },
          installments: {
            create: schedule.map((row) => ({
              installmentNumber: row.installmentNumber,
              dueDate: row.dueDate,
              dayName: row.dayName,
              scheduledAmount: row.scheduledAmount,
              paidAmount: 0,
              status: InstallmentStatus.PENDING,
              isShort: false,
              carriedForwardAmount: 0,
            })),
          },
        },
        include: { installments: { orderBy: { installmentNumber: 'asc' } } },
      });

      const first = lease.installments[0];
      const paidAmount = Number(first.scheduledAmount);

      await prisma.installmentSchedule.update({
        where: { id: first.id },
        data: {
          paidAmount,
          status: InstallmentStatus.PAID,
        },
      });

      await prisma.payment.create({
        data: {
          shopId,
          leaseAccountId: lease.id,
          scheduleId: first.id,
          amount: paidAmount,
          paymentDate: daysAgo(7),
          collectedById: recoveryMan.id,
          collectedByUserId: operatorUserId,
          paymentType: PaymentType.INSTALLMENT,
          receiptNumber: receiptNumber++,
          note: 'پہلی قسط — ٹیسٹ',
        },
      });

      const remainingBalance = roundMoney(spec.total - spec.advance - paidAmount);
      await prisma.leaseAccount.update({
        where: { id: lease.id },
        data: { remainingBalance },
      });

      console.log(
        `✓ ${spec.name} — کھاتہ ${spec.accountNumber}, ${spec.installmentCount} weekly installments, 1 paid`,
      );
    }

    console.log('\nDone. Login: shop@inventory.local / Shop123!');
    console.log('2 customers, weekly leases (3 & 4 installments), first installment paid on each.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
