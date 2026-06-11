/**
 * One-off: create Yasir & Ahad shop owners on production DB.
 * Run on server: node scripts/create-yasir-ahad-shops.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnv() {
  for (const file of [
    path.join(root, 'hostinger-production.env'),
    path.join(root, 'deploy/hostinger-production.env'),
  ]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (!process.env[key]) process.env[key] = trimmed.slice(eq + 1).trim();
    }
  }
}

const SHOPS = [
  {
    shopName: 'Yasir Shop',
    ownerName: 'Yasir',
    email: 'yasir@qistpro.shop',
    password: 'Yasir@2026!',
  },
  {
    shopName: 'Ahad Shop',
    ownerName: 'Ahad',
    email: 'ahad@qistpro.shop',
    password: 'Ahad@2026!',
  },
];

async function upsertShop(prisma, spec) {
  const email = spec.email.toLowerCase();
  const hash = await bcrypt.hash(spec.password, 12);

  const owner = await prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      name: spec.ownerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
    create: {
      email,
      password: hash,
      name: spec.ownerName,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
  });

  const shop = await prisma.shop.upsert({
    where: { ownerId: owner.id },
    update: { name: spec.shopName, isActive: true },
    create: {
      name: spec.shopName,
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

loadEnv();
const prisma = new PrismaClient();

try {
  for (const spec of SHOPS) {
    const { shop, owner } = await upsertShop(prisma, spec);
    console.log(`OK: ${shop.name} | login: ${owner.email} | password: ${spec.password}`);
  }
} finally {
  await prisma.$disconnect();
}
