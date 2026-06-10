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

export type DemoSeedOptions = {
  variant?: number;
  accountNumberOffset?: number;
  cityLabel?: string;
};

export async function seedDemoData(
  prisma: PrismaClient,
  shopId: string,
  operatorUserId: string,
  force = false,
  options: DemoSeedOptions = {},
) {
  const variant = options.variant ?? 1;
  const accountOffset = options.accountNumberOffset ?? 0;
  const cityLabel = options.cityLabel ?? 'لاہور';
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

  const areaNames =
    variant === 2
      ? [
          { name: 'سaddar', city: cityLabel },
          { name: 'بھارہ کہو', city: cityLabel },
          { name: 'فیصل ٹاؤن', city: 'اسلام آباد' },
        ]
      : [
          { name: 'گلberg', city: cityLabel },
          { name: 'ماڈل ٹاؤن', city: cityLabel },
          { name: 'صدر', city: 'راولپنڈی' },
        ];

  const area1 = await prisma.area.create({ data: { shopId, name: areaNames[0].name, city: areaNames[0].city } });
  const area2 = await prisma.area.create({ data: { shopId, name: areaNames[1].name, city: areaNames[1].city } });
  const area3 = await prisma.area.create({ data: { shopId, name: areaNames[2].name, city: areaNames[2].city } });

  const staffNames =
    variant === 2
      ? { salesman: 'کامران شاہ', recovery: 'ناصر محمود', outdoor: 'جاوید اقبال', salesman2: 'شہباز علی' }
      : { salesman: 'احمد علی', recovery: 'بابر حسین', outdoor: 'چaudhry کاشف', salesman2: 'دانish خان' };

  const salesman = await prisma.staff.create({
    data: { shopId, areaId: area1.id, name: staffNames.salesman, mobile: `0300${variant}1234567`, type: StaffType.SALESMAN },
  });
  const recoveryMan = await prisma.staff.create({
    data: { shopId, areaId: area1.id, name: staffNames.recovery, mobile: `0300${variant}7654321`, type: StaffType.RECOVERY_MAN },
  });
  const outdoorMan = await prisma.staff.create({
    data: { shopId, areaId: area2.id, name: staffNames.outdoor, mobile: `0311${variant}1234567`, type: StaffType.OUTDOOR_MAN },
  });
  const salesman2 = await prisma.staff.create({
    data: { shopId, areaId: area3.id, name: staffNames.salesman2, mobile: `0322${variant}1234567`, type: StaffType.SALESMAN },
  });

  const companies =
    variant === 2
      ? ['LG Pakistan', 'Dawlance', 'PEL']
      : ['Samsung Pakistan', 'Haier', 'Orient'];

  const company1 = await prisma.company.create({ data: { shopId, name: companies[0] } });
  const company2 = await prisma.company.create({ data: { shopId, name: companies[1] } });
  const company3 = await prisma.company.create({ data: { shopId, name: companies[2] } });

  const codeBase = variant * 100;
  const itemsData =
    variant === 2
      ? [
          { code: codeBase + 1, companyId: company1.id, name: 'LG LED TV', model: '43 Inch', purchase: 55000, sale: 72000, stock: 12 },
          { code: codeBase + 2, companyId: company1.id, name: 'LG Washing Machine', model: '7kg', purchase: 38000, sale: 48000, stock: 15 },
          { code: codeBase + 3, companyId: company2.id, name: 'Dawlance Fridge', model: 'DF-400', purchase: 72000, sale: 92000, stock: 6 },
          { code: codeBase + 4, companyId: company3.id, name: 'PEL Cooler', model: 'PC-200', purchase: 12000, sale: 16000, stock: 35 },
          { code: codeBase + 5, companyId: company3.id, name: 'PEL Microwave', model: 'PM-30', purchase: 22000, sale: 28000, stock: 18 },
        ]
      : [
          { code: codeBase + 1, companyId: company1.id, name: 'Samsung A15', model: 'A15 128GB', purchase: 42000, sale: 52000, stock: 25 },
          { code: codeBase + 2, companyId: company1.id, name: 'Samsung A05', model: 'A05 64GB', purchase: 18000, sale: 24000, stock: 40 },
          { code: codeBase + 3, companyId: company2.id, name: 'Haier Fridge', model: 'HRF-336', purchase: 65000, sale: 85000, stock: 8 },
          { code: codeBase + 4, companyId: company3.id, name: 'Orient Fan', model: 'OF-52', purchase: 4500, sale: 6500, stock: 60 },
          { code: codeBase + 5, companyId: company3.id, name: 'Orient AC', model: '1.5 Ton', purchase: 95000, sale: 125000, stock: 5 },
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
  const customerSpecs =
    variant === 2
      ? [
          { name: 'راشد محمود', father: 'محمود حسن', areaId: area1.id, mobile: '03332234567', cnic: '3740212345671' },
          { name: 'سارہ بی بی', father: 'خلیل احمد', areaId: area1.id, mobile: '03337654322', cnic: '3740298765432' },
          { name: 'عمران ملک', father: 'ملک جاوید', areaId: area2.id, mobile: '03452234567', cnic: '3740312345673' },
          { name: 'نادیہ شاہ', father: 'شاہد علی', areaId: area2.id, mobile: '03457654322', cnic: '3740398765434' },
          { name: 'Hamza Butt', father: 'Butt Sajid', areaId: area3.id, mobile: '03152234567', cnic: '3740412345675' },
        ]
      : [
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

  const leaseTotals =
    variant === 2
      ? [
          { customerIdx: 0, accountNumber: accountOffset + 2001, total: 72000, advance: 8000, installment: 3000, frequency: InstallmentFrequency.WEEKLY, startDaysAgo: 50, itemIdx: 0, qty: 1, payInstallments: 5 },
          { customerIdx: 1, accountNumber: accountOffset + 2002, total: 16000, advance: 2000, installment: 800, frequency: InstallmentFrequency.DAILY, startDaysAgo: 25, itemIdx: 3, qty: 2, payInstallments: 10 },
          { customerIdx: 2, accountNumber: accountOffset + 2003, total: 92000, advance: 12000, installment: 6000, frequency: InstallmentFrequency.MONTHLY, startDaysAgo: 100, itemIdx: 2, qty: 1, payInstallments: 3 },
          { customerIdx: 3, accountNumber: accountOffset + 2004, total: 48000, advance: 5000, installment: 2500, frequency: InstallmentFrequency.FIFTEEN_DAYS, startDaysAgo: 35, itemIdx: 1, qty: 1, payInstallments: 4 },
          { customerIdx: 4, accountNumber: accountOffset + 2005, total: 28000, advance: 3000, installment: 1500, frequency: InstallmentFrequency.WEEKLY, startDaysAgo: 15, itemIdx: 4, qty: 1, payInstallments: 3 },
        ]
      : [
          { customerIdx: 0, accountNumber: accountOffset + 1001, total: 52000, advance: 5000, installment: 2000, frequency: InstallmentFrequency.WEEKLY, startDaysAgo: 45, itemIdx: 0, qty: 1, payInstallments: 4 },
          { customerIdx: 1, accountNumber: accountOffset + 1002, total: 6500, advance: 1000, installment: 500, frequency: InstallmentFrequency.DAILY, startDaysAgo: 20, itemIdx: 3, qty: 1, payInstallments: 8 },
          { customerIdx: 2, accountNumber: accountOffset + 1003, total: 85000, advance: 10000, installment: 5000, frequency: InstallmentFrequency.MONTHLY, startDaysAgo: 90, itemIdx: 2, qty: 1, payInstallments: 2 },
          { customerIdx: 3, accountNumber: accountOffset + 1004, total: 24000, advance: 3000, installment: 1200, frequency: InstallmentFrequency.FIFTEEN_DAYS, startDaysAgo: 30, itemIdx: 1, qty: 1, payInstallments: 5 },
          { customerIdx: 4, accountNumber: accountOffset + 1005, total: 125000, advance: 15000, installment: 8000, frequency: InstallmentFrequency.MONTHLY, startDaysAgo: 60, itemIdx: 4, qty: 1, payInstallments: 2 },
        ];

  const leaseSpecs: LeaseSpec[] = leaseTotals;

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

  await prisma.stockMovement.create({
    data: {
      shopId,
      itemId: items[1].id,
      staffId: salesman.id,
      type: StockMovementType.UNLOAD,
      quantity: 3,
      movementDate: daysAgo(2),
      note: 'سیلزمین ان لوڈنگ',
    },
  });
  await prisma.salesmanStock.update({
    where: { shopId_staffId_itemId: { shopId, staffId: salesman.id, itemId: items[1].id } },
    data: { quantity: { decrement: 3 } },
  });
  await prisma.item.update({
    where: { id: items[1].id },
    data: { stockQuantity: { increment: 3 } },
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
