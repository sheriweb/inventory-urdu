import {
  ClaimType,
  ExpenseGroup,
  InstallmentFrequency,
  InstallmentStatus,
  LeaseStatus,
  PaymentType,
  PrismaClient,
  StaffType,
  StockMovementType,
} from '@prisma/client';

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
  switch (frequency) {
    case InstallmentFrequency.DAILY:
      date.setDate(date.getDate() + periods);
      break;
    case InstallmentFrequency.WEEKLY:
      date.setDate(date.getDate() + periods * 7);
      break;
    case InstallmentFrequency.FIFTEEN_DAYS:
      date.setDate(date.getDate() + periods * 15);
      break;
    case InstallmentFrequency.MONTHLY:
      date.setMonth(date.getMonth() + periods);
      break;
  }
  return date;
}

function generateSchedule(params: {
  totalAmount: number;
  advanceAmount: number;
  installmentAmount: number;
  frequency: InstallmentFrequency;
  startDate: Date;
}) {
  const { totalAmount, advanceAmount, installmentAmount, frequency, startDate } = params;
  let remaining = roundMoney(totalAmount - advanceAmount);
  const installments: {
    installmentNumber: number;
    dueDate: Date;
    dayName: string;
    scheduledAmount: number;
    paidAmount: number;
    status: InstallmentStatus;
    isShort: boolean;
    carriedForwardAmount: number;
  }[] = [];

  let installmentNumber = 1;
  while (remaining > 0) {
    const scheduledAmount =
      remaining >= installmentAmount ? installmentAmount : roundMoney(remaining);
    const dueDate = addFrequency(startDate, frequency, installmentNumber - 1);
    installments.push({
      installmentNumber,
      dueDate,
      dayName: DAY_NAMES[dueDate.getDay()],
      scheduledAmount,
      paidAmount: 0,
      status: InstallmentStatus.PENDING,
      isShort: scheduledAmount < installmentAmount,
      carriedForwardAmount: 0,
    });
    remaining = roundMoney(remaining - scheduledAmount);
    installmentNumber += 1;
  }

  return installments;
}

export async function seedDemoData(
  prisma: PrismaClient,
  shopId: string,
  operatorUserId: string,
  force = false,
) {
  const existingAreas = await prisma.area.count({ where: { shopId } });
  if (existingAreas > 0 && !force) {
    console.log('Demo data already exists — skipping (set FORCE_DEMO_SEED=1 to re-seed)');
    return;
  }

  if (force && existingAreas > 0) {
    console.log('Clearing existing demo shop data…');
    await prisma.$transaction([
      prisma.roznamchaEntry.deleteMany({ where: { shopId } }),
      prisma.expenseAccount.deleteMany({ where: { shopId } }),
      prisma.claim.deleteMany({ where: { shopId } }),
      prisma.salesmanStock.deleteMany({ where: { shopId } }),
      prisma.stockMovement.deleteMany({ where: { shopId } }),
      prisma.payment.deleteMany({ where: { shopId } }),
      prisma.installmentSchedule.deleteMany({ where: { leaseAccount: { shopId } } }),
      prisma.leaseItem.deleteMany({ where: { leaseAccount: { shopId } } }),
      prisma.leaseAccount.deleteMany({ where: { shopId } }),
      prisma.guarantor.deleteMany({ where: { shopId } }),
      prisma.customer.deleteMany({ where: { shopId } }),
      prisma.item.deleteMany({ where: { shopId } }),
      prisma.company.deleteMany({ where: { shopId } }),
      prisma.staff.deleteMany({ where: { shopId } }),
      prisma.area.deleteMany({ where: { shopId } }),
    ]);
  }

  const area1 = await prisma.area.create({
    data: { shopId, name: 'گلberg', city: 'لاہور' },
  });
  const area2 = await prisma.area.create({
    data: { shopId, name: 'ماڈل ٹاؤن', city: 'لاہور' },
  });
  const area3 = await prisma.area.create({
    data: { shopId, name: 'صدر', city: 'راولپنڈی' },
  });

  const salesman = await prisma.staff.create({
    data: { shopId, areaId: area1.id, name: 'احمد علی', mobile: '03001234567', type: StaffType.SALESMAN },
  });
  const recoveryMan = await prisma.staff.create({
    data: { shopId, areaId: area1.id, name: 'بابر حسین', mobile: '03007654321', type: StaffType.RECOVERY_MAN },
  });
  const outdoorMan = await prisma.staff.create({
    data: { shopId, areaId: area2.id, name: 'چaudhry کاشف', mobile: '03111234567', type: StaffType.OUTDOOR_MAN },
  });
  const salesman2 = await prisma.staff.create({
    data: { shopId, areaId: area3.id, name: 'دانish خان', mobile: '03221234567', type: StaffType.SALESMAN },
  });

  const company1 = await prisma.company.create({ data: { shopId, name: 'Samsung Pakistan' } });
  const company2 = await prisma.company.create({ data: { shopId, name: 'Haier' } });
  const company3 = await prisma.company.create({ data: { shopId, name: 'Orient' } });

  const itemsData = [
    { code: 1, companyId: company1.id, name: 'Samsung A15', model: 'A15 128GB', purchase: 42000, sale: 52000, stock: 25 },
    { code: 2, companyId: company1.id, name: 'Samsung A05', model: 'A05 64GB', purchase: 18000, sale: 24000, stock: 40 },
    { code: 3, companyId: company2.id, name: 'Haier Fridge', model: 'HRF-336', purchase: 65000, sale: 85000, stock: 8 },
    { code: 4, companyId: company3.id, name: 'Orient Fan', model: 'OF-52', purchase: 4500, sale: 6500, stock: 60 },
    { code: 5, companyId: company3.id, name: 'Orient AC', model: '1.5 Ton', purchase: 95000, sale: 125000, stock: 5 },
  ];

  const items = [];
  for (const row of itemsData) {
    const item = await prisma.item.create({
      data: {
        shopId,
        companyId: row.companyId,
        itemCode: row.code,
        name: row.name,
        model: row.model,
        purchaseRate: row.purchase,
        saleRate: row.sale,
        stockQuantity: 0,
      },
    });
    items.push(item);

    await prisma.stockMovement.create({
      data: {
        shopId,
        itemId: item.id,
        type: StockMovementType.IN,
        quantity: row.stock,
        supplier: 'ڈیمو سپلائر',
        movementDate: daysAgo(30),
        note: 'ابتدائی اسٹاک',
      },
    });
    await prisma.item.update({
      where: { id: item.id },
      data: { stockQuantity: row.stock },
    });
  }

  const customers = [];
  const customerSpecs = [
    { name: 'محمد عمر', father: 'محمد اکرم', areaId: area1.id, mobile: '03331234567', cnic: '3520212345671' },
    { name: 'عائشہ بی بی', father: 'عبدالرحمن', areaId: area1.id, mobile: '03337654321', cnic: '3520298765432' },
    { name: 'زain علی', father: 'طارق محمود', areaId: area2.id, mobile: '03451234567', cnic: '3520312345673' },
    { name: 'فاطمہ خان', father: 'امjad خان', areaId: area2.id, mobile: '03457654321', cnic: '3520398765434' },
    { name: 'Usman Sheikh', father: 'Sheikh Nadeem', areaId: area3.id, mobile: '03151234567', cnic: '3520412345675' },
  ];

  for (const spec of customerSpecs) {
    const customer = await prisma.customer.create({
      data: {
        shopId,
        areaId: spec.areaId,
        name: spec.name,
        fatherOrHusbandName: spec.father,
        mobile: spec.mobile,
        cnic: spec.cnic,
        city: 'لاہور',
        presentAddress: `${spec.name} کا پتہ، ${spec.areaId === area3.id ? 'راولپنڈی' : 'لاہور'}`,
      },
    });
    customers.push(customer);

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
  }

  type LeaseSpec = {
    customerIdx: number;
    accountNumber: number;
    total: number;
    advance: number;
    installment: number;
    frequency: InstallmentFrequency;
    startDaysAgo: number;
    itemIdx: number;
    qty: number;
    payInstallments: number;
  };

  const leaseSpecs: LeaseSpec[] = [
    {
      customerIdx: 0,
      accountNumber: 1001,
      total: 52000,
      advance: 5000,
      installment: 2000,
      frequency: InstallmentFrequency.WEEKLY,
      startDaysAgo: 45,
      itemIdx: 0,
      qty: 1,
      payInstallments: 4,
    },
    {
      customerIdx: 1,
      accountNumber: 1002,
      total: 6500,
      advance: 1000,
      installment: 500,
      frequency: InstallmentFrequency.DAILY,
      startDaysAgo: 20,
      itemIdx: 3,
      qty: 1,
      payInstallments: 8,
    },
    {
      customerIdx: 2,
      accountNumber: 1003,
      total: 85000,
      advance: 10000,
      installment: 5000,
      frequency: InstallmentFrequency.MONTHLY,
      startDaysAgo: 90,
      itemIdx: 2,
      qty: 1,
      payInstallments: 2,
    },
  ];

  let receiptNumber = 1;

  for (const spec of leaseSpecs) {
    const customer = customers[spec.customerIdx];
    const item = items[spec.itemIdx];
    const startDate = daysAgo(spec.startDaysAgo);
    const schedule = generateSchedule({
      totalAmount: spec.total,
      advanceAmount: spec.advance,
      installmentAmount: spec.installment,
      frequency: spec.frequency,
      startDate,
    });

    const remainingBalance = roundMoney(spec.total - spec.advance);

    const lease = await prisma.leaseAccount.create({
      data: {
        shopId,
        accountNumber: spec.accountNumber,
        accountDate: startDate,
        customerId: customer.id,
        salesmanId: salesman.id,
        recoveryManId: recoveryMan.id,
        outdoorManId: outdoorMan.id,
        totalAmount: spec.total,
        advanceAmount: spec.advance,
        remainingBalance: Math.max(0, remainingBalance),
        originalInstallmentAmount: spec.installment,
        currentInstallmentAmount: spec.installment,
        installmentCount: schedule.length,
        frequency: spec.frequency,
        status: LeaseStatus.ACTIVE,
        leaseItems: {
          create: {
            itemId: item.id,
            itemName: item.name,
            rate: Number(item.saleRate),
            quantity: spec.qty,
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
            status: row.status,
            isShort: row.isShort,
            carriedForwardAmount: 0,
          })),
        },
      },
      include: { installments: { orderBy: { installmentNumber: 'asc' } } },
    });

    for (let i = 0; i < Math.min(spec.payInstallments, lease.installments.length); i++) {
      const inst = lease.installments[i];
      const amount = Number(inst.scheduledAmount);
      const payDate = daysAgo(spec.startDaysAgo - (i + 1) * 3);

      await prisma.installmentSchedule.update({
        where: { id: inst.id },
        data: { paidAmount: amount, status: InstallmentStatus.PAID, isShort: false },
      });

      await prisma.payment.create({
        data: {
          shopId,
          leaseAccountId: lease.id,
          scheduleId: inst.id,
          amount,
          paymentDate: payDate,
          collectedById: recoveryMan.id,
          collectedByUserId: operatorUserId,
          paymentType: PaymentType.INSTALLMENT,
          receiptNumber: receiptNumber++,
        },
      });
    }

    const unpaid = await prisma.installmentSchedule.aggregate({
      where: { leaseAccountId: lease.id },
      _sum: { scheduledAmount: true, paidAmount: true },
    });
    const rem = roundMoney(
      Number(unpaid._sum.scheduledAmount ?? 0) - Number(unpaid._sum.paidAmount ?? 0),
    );
    await prisma.leaseAccount.update({
      where: { id: lease.id },
      data: { remainingBalance: rem },
    });
  }

  await prisma.stockMovement.create({
    data: {
      shopId,
      itemId: items[1].id,
      staffId: salesman.id,
      type: StockMovementType.LOAD,
      quantity: 10,
      movementDate: daysAgo(5),
      note: 'سیلزمین لوڈنگ',
    },
  });
  await prisma.salesmanStock.upsert({
    where: { shopId_staffId_itemId: { shopId, staffId: salesman.id, itemId: items[1].id } },
    create: { shopId, staffId: salesman.id, itemId: items[1].id, quantity: 10 },
    update: { quantity: 10 },
  });
  await prisma.item.update({
    where: { id: items[1].id },
    data: { stockQuantity: { decrement: 10 } },
  });

  await prisma.claim.create({
    data: {
      shopId,
      type: ClaimType.SHOP,
      itemId: items[3].id,
      staffId: salesman.id,
      quantity: 1,
      detail: 'شاپ کلیم — خراب فین',
      claimDate: daysAgo(3),
    },
  });
  await prisma.claim.create({
    data: {
      shopId,
      type: ClaimType.CUSTOMER,
      itemId: items[0].id,
      customerId: customers[0].id,
      quantity: 1,
      detail: 'کسٹمر کلیم — اسکرین مسئلہ',
      claimDate: daysAgo(1),
    },
  });

  const expenseAccounts = await Promise.all([
    prisma.expenseAccount.create({ data: { shopId, name: 'دفتر کرایہ', group: ExpenseGroup.OFFICE } }),
    prisma.expenseAccount.create({ data: { shopId, name: 'بجلی بل', group: ExpenseGroup.OFFICE } }),
    prisma.expenseAccount.create({ data: { shopId, name: 'گھر خرچ', group: ExpenseGroup.HOME } }),
    prisma.expenseAccount.create({ data: { shopId, name: 'پٹرول', group: ExpenseGroup.VEHICLE } }),
    prisma.expenseAccount.create({ data: { shopId, name: 'چائے/ناشتہ', group: ExpenseGroup.PETTY_CASH } }),
  ]);

  const rozEntries = [
    { days: 7, account: expenseAccounts[0], expense: 15000, recovery: 0, detail: 'دفتر کرایہ' },
    { days: 6, account: expenseAccounts[1], expense: 8500, recovery: 0, detail: 'بجلی بل' },
    { days: 5, account: expenseAccounts[4], expense: 1200, recovery: 0, detail: 'دفتر چائے' },
    { days: 4, account: null, expense: 0, recovery: 5000, detail: 'نقد وصولی' },
    { days: 3, account: expenseAccounts[3], expense: 3000, recovery: 0, detail: 'گاڑی پٹرول' },
    { days: 2, account: expenseAccounts[2], expense: 4500, recovery: 0, detail: 'گھر کا سaman' },
    { days: 1, account: expenseAccounts[4], expense: 800, recovery: 2500, detail: 'چھوٹا خرچ / وصولی' },
  ];

  let runningBalance = 0;
  for (const row of rozEntries) {
    runningBalance = roundMoney(runningBalance + row.recovery - row.expense);
    await prisma.roznamchaEntry.create({
      data: {
        shopId,
        entryDate: daysAgo(row.days),
        expenseAccountId: row.account?.id,
        detail: row.detail,
        expenseAmount: row.expense,
        recoveryAmount: row.recovery,
        balanceAfter: runningBalance,
        operatorUserId,
      },
    });
  }

  console.log('Demo data seeded: areas, staff, items, customers, leases, payments, stock, claims, roznamcha');
}
