import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedDemoData } from './seed-demo';

const prisma = new PrismaClient();

const DEMO_SHOPS = [
  {
    email: 'shop1@inventory.local',
    password: 'Shop1Demo!',
    ownerName: 'علی احمد',
    shopName: 'الفا الیکٹرونکس',
    phone: '04235551234',
    mobile: '03001112233',
    city: 'لاہور',
    address: 'مین بازار، لاہور',
    billingPlanLabel: 'Standard',
    monthlyFeePkr: 5000,
    demoOptions: { variant: 1, accountNumberOffset: 0, cityLabel: 'لاہور' },
  },
  {
    email: 'shop2@inventory.local',
    password: 'Shop2Demo!',
    ownerName: 'حسن رضا',
    shopName: 'بیتا ہوم اپلائنسز',
    phone: '0514445566',
    mobile: '03004445566',
    city: 'راولپنڈی',
    address: 'سadar بازار، راولپنڈی',
    billingPlanLabel: 'Premium',
    monthlyFeePkr: 8000,
    demoOptions: { variant: 2, accountNumberOffset: 0, cityLabel: 'راولپنڈی' },
  },
] as const;

const PRODUCTION_SHOPS = [
  {
    email: 'yasir@qistpro.shop',
    password: 'Yasir@2026!',
    ownerName: 'Yasir',
    shopName: 'Yasir Shop',
  },
  {
    email: 'ahad@qistpro.shop',
    password: 'Ahad@2026!',
    ownerName: 'Ahad',
    shopName: 'Ahad Shop',
  },
] as const;

type ShopSeedSpec = {
  email: string;
  password: string;
  ownerName: string;
  shopName: string;
  phone?: string;
  mobile?: string;
  city?: string;
  address?: string;
  billingPlanLabel?: string;
  monthlyFeePkr?: number;
  demoOptions?: (typeof DEMO_SHOPS)[number]['demoOptions'];
};

async function upsertShop(spec: ShopSeedSpec) {
  const hash = await bcrypt.hash(spec.password, 12);

  const owner = await prisma.user.upsert({
    where: { email: spec.email },
    update: {
      password: hash,
      name: spec.ownerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
    create: {
      email: spec.email,
      password: hash,
      name: spec.ownerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: owner.id },
    update: {
      name: spec.shopName,
      phone: spec.phone,
      mobile: spec.mobile,
      city: spec.city,
      address: spec.address,
      billingPlanLabel: spec.billingPlanLabel,
      monthlyFeePkr: spec.monthlyFeePkr,
      isActive: true,
    },
    create: {
      name: spec.shopName,
      phone: spec.phone,
      mobile: spec.mobile,
      city: spec.city,
      address: spec.address,
      billingPlanLabel: spec.billingPlanLabel,
      monthlyFeePkr: spec.monthlyFeePkr,
      ownerId: owner.id,
      users: { connect: { id: owner.id } },
    },
  });

  await prisma.user.update({
    where: { id: owner.id },
    data: { shopId: shop.id },
  });

  return { shop, owner };
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL;
  const password = process.env.SUPER_ADMIN_PASSWORD;
  const name = process.env.SUPER_ADMIN_NAME || 'Super Admin';

  if (!email || !password) {
    throw new Error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env');
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      password: hashed,
      name,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
      shopId: null,
    },
    create: {
      email: email.toLowerCase(),
      password: hashed,
      name,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  console.log(`Super admin ready: ${email}`);

  for (const spec of PRODUCTION_SHOPS) {
    await upsertShop(spec);
    console.log(`Shop ready: ${spec.shopName} (${spec.email} / ${spec.password})`);
  }

  const forceDemo = process.env.FORCE_DEMO_SEED === '1';

  for (const spec of DEMO_SHOPS) {
    const { shop, owner } = await upsertShop(spec);
    console.log(`Demo shop ready: ${spec.shopName} (${spec.email} / ${spec.password})`);
    if (spec.demoOptions) {
      await seedDemoData(prisma, shop.id, owner.id, forceDemo, spec.demoOptions);
    }
  }

  console.log('\n--- Login credentials ---');
  for (const spec of PRODUCTION_SHOPS) {
    console.log(`${spec.shopName}: ${spec.email} / ${spec.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
