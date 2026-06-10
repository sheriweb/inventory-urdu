/**
 * Regenerate installment schedule for a broken lease.
 * Usage: node scripts/fix-lease-schedule.mjs <leaseId> <installmentCount>
 */
import { PrismaClient, InstallmentStatus } from '@prisma/client';

const leaseId = process.argv[2];
const count = Number(process.argv[3] || 3);

if (!leaseId) {
  console.error('Usage: node scripts/fix-lease-schedule.mjs <leaseId> [installmentCount]');
  process.exit(1);
}

const prisma = new PrismaClient();

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function roundMoney(v) {
  return Math.round(v * 100) / 100;
}

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

const lease = await prisma.leaseAccount.findUnique({
  where: { id: leaseId },
  include: { installments: true },
});

if (!lease) {
  console.error('Lease not found');
  process.exit(1);
}

const total = Number(lease.totalAmount);
const advance = Number(lease.advanceAmount);
const remaining = roundMoney(total - advance);
const perInstallment = roundMoney(remaining / count);

const schedules = [];
let left = remaining;
for (let i = 1; i <= count; i++) {
  const scheduledAmount = i === count ? roundMoney(left) : perInstallment;
  left = roundMoney(left - scheduledAmount);
  const dueDate = addMonths(lease.accountDate, i - 1);
  schedules.push({
    leaseAccountId: lease.id,
    installmentNumber: i,
    dueDate,
    dayName: DAY_NAMES[dueDate.getDay()],
    scheduledAmount,
    paidAmount: 0,
    status: InstallmentStatus.PENDING,
    isShort: scheduledAmount < perInstallment,
    carriedForwardAmount: 0,
  });
}

await prisma.$transaction([
  prisma.installmentSchedule.deleteMany({ where: { leaseAccountId: lease.id } }),
  prisma.installmentSchedule.createMany({ data: schedules }),
  prisma.leaseAccount.update({
    where: { id: lease.id },
    data: {
      originalInstallmentAmount: perInstallment,
      currentInstallmentAmount: perInstallment,
      installmentCount: count,
      remainingBalance: remaining,
    },
  }),
]);

console.log(`Fixed lease #${lease.accountNumber}: ${count} installments @ ${perInstallment} each`);
await prisma.$disconnect();
