import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedDemoData } from './seed-demo';

const prisma = new PrismaClient();

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

  const shopOwnerEmail = 'shop@inventory.local';
  const shopOwnerPassword = 'Shop123!';
  const shopOwnerName = 'Shop Owner';
  const shopName = 'ٹیسٹ دکان';
  const shopOwnerHash = await bcrypt.hash(shopOwnerPassword, 12);

  const shopOwner = await prisma.user.upsert({
    where: { email: shopOwnerEmail },
    update: {
      password: shopOwnerHash,
      name: shopOwnerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
    create: {
      email: shopOwnerEmail,
      password: shopOwnerHash,
      name: shopOwnerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: shopOwner.id },
    update: {
      name: shopName,
      isActive: true,
    },
    create: {
      name: shopName,
      ownerId: shopOwner.id,
      users: { connect: { id: shopOwner.id } },
    },
  });

  await prisma.user.update({
    where: { id: shopOwner.id },
    data: { shopId: shop.id },
  });

  console.log(`Demo shop ready: ${shopName} (${shopOwnerEmail})`);

  const forceDemo = process.env.FORCE_DEMO_SEED === '1';
  await seedDemoData(prisma, shop.id, shopOwner.id, forceDemo);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
