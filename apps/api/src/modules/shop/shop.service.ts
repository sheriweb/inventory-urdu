import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { LeaseStatus, UserRole, Prisma } from '@prisma/client';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { buildPagination, ListQueryDto } from '../../common/dto/list-query.dto';
import { hashPassword, requireShopId } from '../../common/utils';
import { CreateShopDto, UpdateShopProfileDto } from './dto';
import type {
  AdminShopBillingDto,
  AdminShopReminderDto,
  AdminUpdateOwnerDto,
  AdminUpdateShopDto,
  DeleteShopDto,
  ResetOwnerPasswordDto,
} from './dto';
import { AdminShopDataQueryDto } from './dto/admin-shop-data.dto';

const shopProfileSelect = {
  id: true,
  name: true,
  logoUrl: true,
  phone: true,
  mobile: true,
  email: true,
  address: true,
  city: true,
  description: true,
  brandColor: true,
  reminderEnabled: true,
  reminderDaysBefore: true,
  reminderMessageTemplate: true,
  autoRoznamchaOnCollection: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class ShopService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShopDto) {
    const email = dto.ownerEmail.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await hashPassword(dto.ownerPassword);

    const shop = await this.prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          email,
          password: passwordHash,
          name: dto.ownerName,
          role: UserRole.SHOP_OWNER,
        },
      });

      return tx.shop.create({
        data: {
          name: dto.name,
          ownerId: owner.id,
          users: { connect: { id: owner.id } },
        },
        include: {
          owner: { select: { id: true, email: true, name: true, role: true } },
        },
      });
    });

    await this.prisma.user.update({
      where: { id: shop.ownerId },
      data: { shopId: shop.id },
    });

    return shop;
  }

  async findAll() {
    return this.prisma.shop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true } },
        _count: {
          select: {
            customers: true,
            leaseAccounts: true,
            users: true,
            staff: true,
          },
        },
      },
    });
  }

  async getPlatformStats() {
    const [
      totalShops,
      activeShops,
      totalCustomers,
      totalLeases,
      activeLeases,
      totalPayments,
      shopOwners,
    ] = await Promise.all([
      this.prisma.shop.count(),
      this.prisma.shop.count({ where: { isActive: true } }),
      this.prisma.customer.count(),
      this.prisma.leaseAccount.count(),
      this.prisma.leaseAccount.count({ where: { status: LeaseStatus.ACTIVE } }),
      this.prisma.payment.count(),
      this.prisma.user.count({ where: { role: UserRole.SHOP_OWNER } }),
    ]);

    return {
      totalShops,
      activeShops,
      inactiveShops: totalShops - activeShops,
      totalCustomers,
      totalLeases,
      activeLeases,
      totalPayments,
      shopOwners,
    };
  }

  async findOne(id: string) {
    const shop = await this.prisma.shop.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            customers: true,
            leaseAccounts: true,
            users: true,
            staff: true,
            payments: true,
            items: true,
          },
        },
      },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const [activeLeases, defaultedLeases, closedLeases] = await Promise.all([
      this.prisma.leaseAccount.count({ where: { shopId: id, status: LeaseStatus.ACTIVE } }),
      this.prisma.leaseAccount.count({ where: { shopId: id, status: LeaseStatus.DEFAULTED } }),
      this.prisma.leaseAccount.count({ where: { shopId: id, status: LeaseStatus.CLOSED } }),
    ]);

    return {
      ...shop,
      leaseStats: { activeLeases, defaultedLeases, closedLeases },
    };
  }

  async setActive(id: string, isActive: boolean) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.shop.update({
      where: { id },
      data: { isActive },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });
  }

  async adminUpdateShop(id: string, dto: AdminUpdateShopDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id } });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.shop.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.mobile !== undefined ? { mobile: dto.mobile.trim() || null } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
      },
      include: {
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });
  }

  async adminUpdateOwner(shopId: string, dto: AdminUpdateOwnerDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    if (dto.email) {
      const email = dto.email.toLowerCase();
      const existing = await this.prisma.user.findFirst({
        where: { email, NOT: { id: shop.ownerId } },
      });
      if (existing) {
        throw new ConflictException('User with this email already exists');
      }
    }

    return this.prisma.user.update({
      where: { id: shop.ownerId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.toLowerCase() } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
  }

  async resetOwnerPassword(shopId: string, dto: ResetOwnerPasswordDto) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: shop.ownerId },
      data: {
        password: passwordHash,
        refreshToken: null,
      },
    });

    return { reset: true };
  }

  async setOwnerActive(shopId: string, isActive: boolean) {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      select: { ownerId: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.user.update({
      where: { id: shop.ownerId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
  }

  async listOwners() {
    return this.prisma.user.findMany({
      where: { role: UserRole.SHOP_OWNER },
      orderBy: [{ lastLoginAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        ownedShop: {
          select: {
            id: true,
            name: true,
            isActive: true,
            city: true,
            createdAt: true,
            _count: { select: { customers: true, leaseAccounts: true } },
          },
        },
      },
    });
  }

  async getRecentActivity() {
    const [recentShops, recentLogins] = await Promise.all([
      this.prisma.shop.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          owner: { select: { name: true, email: true } },
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: UserRole.SHOP_OWNER,
          lastLoginAt: { not: null },
        },
        take: 6,
        orderBy: { lastLoginAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          lastLoginAt: true,
          ownedShop: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { recentShops, recentLogins };
  }

  private async assertShopExists(id: string) {
    const shop = await this.prisma.shop.findUnique({ where: { id }, select: { id: true } });
    if (!shop) throw new NotFoundException('Shop not found');
  }

  async getShopCustomers(shopId: string, query: ListQueryDto) {
    await this.assertShopExists(shopId);
    const q = query.q?.trim();
    const where: Prisma.CustomerWhereInput = {
      shopId,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { mobile: { contains: q } },
              { cnic: { contains: q } },
            ],
          }
        : {}),
    };
    const { page, limit, skip } = buildPagination(query);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          mobile: true,
          cnic: true,
          city: true,
          isActive: true,
          createdAt: true,
          area: { select: { name: true } },
          _count: { select: { leaseAccounts: true, guarantors: true } },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async getShopLeases(shopId: string, query: AdminShopDataQueryDto) {
    await this.assertShopExists(shopId);
    const q = query.q?.trim();
    const where: Prisma.LeaseAccountWhereInput = {
      shopId,
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              ...(Number.isInteger(Number(q)) ? [{ accountNumber: Number(q) }] : []),
              { customer: { name: { contains: q } } },
              { customer: { mobile: { contains: q } } },
            ],
          }
        : {}),
    };
    const { page, limit, skip } = buildPagination(query);
    const [data, total] = await Promise.all([
      this.prisma.leaseAccount.findMany({
        where,
        orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
        skip,
        take: limit,
        select: {
          id: true,
          accountNumber: true,
          accountDate: true,
          totalAmount: true,
          remainingBalance: true,
          installmentCount: true,
          status: true,
          customer: { select: { id: true, name: true, mobile: true } },
          recoveryMan: { select: { name: true } },
        },
      }),
      this.prisma.leaseAccount.count({ where }),
    ]);
    return {
      data,
      meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async adminUpdateReminder(shopId: string, dto: AdminShopReminderDto) {
    await this.assertShopExists(shopId);
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(dto.reminderEnabled !== undefined
          ? { reminderEnabled: dto.reminderEnabled }
          : {}),
        ...(dto.reminderDaysBefore !== undefined
          ? { reminderDaysBefore: dto.reminderDaysBefore }
          : {}),
        ...(dto.reminderMessageTemplate !== undefined
          ? {
              reminderMessageTemplate:
                dto.reminderMessageTemplate.trim() || null,
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        reminderEnabled: true,
        reminderDaysBefore: true,
        reminderMessageTemplate: true,
      },
    });
  }

  async adminUpdateBilling(shopId: string, dto: AdminShopBillingDto) {
    await this.assertShopExists(shopId);
    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...(dto.billingPlanLabel !== undefined
          ? { billingPlanLabel: dto.billingPlanLabel.trim() || null }
          : {}),
        ...(dto.monthlyFeePkr !== undefined
          ? { monthlyFeePkr: dto.monthlyFeePkr }
          : {}),
        ...(dto.billingNotes !== undefined
          ? { billingNotes: dto.billingNotes.trim() || null }
          : {}),
      },
      select: {
        id: true,
        name: true,
        billingPlanLabel: true,
        monthlyFeePkr: true,
        billingNotes: true,
      },
    });
  }

  async deleteShop(shopId: string, dto: DeleteShopDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.name.trim() !== dto.confirmName.trim()) {
      throw new BadRequestException('دکان کا نام درست نہیں — حذف منسوخ');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.installmentReminderLog.deleteMany({ where: { shopId } });
      await tx.roznamchaEntry.deleteMany({ where: { shopId } });
      await tx.payment.deleteMany({ where: { shopId } });
      await tx.leaseAccount.deleteMany({ where: { shopId } });
      await tx.claim.deleteMany({ where: { shopId } });
      await tx.stockMovement.deleteMany({ where: { shopId } });
      await tx.salesmanStock.deleteMany({ where: { shopId } });
      await tx.guarantor.deleteMany({ where: { shopId } });
      await tx.customer.deleteMany({ where: { shopId } });
      await tx.item.deleteMany({ where: { shopId } });
      await tx.company.deleteMany({ where: { shopId } });
      await tx.staff.deleteMany({ where: { shopId } });
      await tx.area.deleteMany({ where: { shopId } });
      await tx.expenseAccount.deleteMany({ where: { shopId } });
      await tx.auditLog.deleteMany({ where: { shopId } });
      await tx.user.updateMany({
        where: { shopId, id: { not: shop.ownerId } },
        data: { shopId: null },
      });
      await tx.shop.delete({ where: { id: shopId } });
      await tx.user.delete({ where: { id: shop.ownerId } });
    });

    return { deleted: true, shopId };
  }

  async getProfile(user: AuthUser) {
    const shopId = requireShopId(user);
    const shop = await this.prisma.shop.findFirst({
      where: { id: shopId },
      select: shopProfileSelect,
    });
    if (!shop) throw new NotFoundException('Shop not found');
    return shop;
  }

  async updateProfile(user: AuthUser, dto: UpdateShopProfileDto) {
    const shopId = requireShopId(user);
    const shop = await this.prisma.shop.findFirst({ where: { id: shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (!shop.isActive) throw new BadRequestException('Shop is inactive');

    return this.prisma.shop.update({
      where: { id: shopId },
      data: {
        name: dto.name?.trim() || undefined,
        logoUrl: dto.logoUrl === '' ? null : dto.logoUrl,
        phone: dto.phone?.trim() || undefined,
        mobile: dto.mobile?.trim() || undefined,
        email: dto.email?.trim().toLowerCase() || undefined,
        address: dto.address?.trim() || undefined,
        city: dto.city?.trim() || undefined,
        description: dto.description?.trim() || undefined,
        brandColor: dto.brandColor && /^#[0-9A-Fa-f]{6}$/.test(dto.brandColor) ? dto.brandColor.toLowerCase() : undefined,
        reminderEnabled: dto.reminderEnabled,
        reminderDaysBefore: dto.reminderDaysBefore,
        reminderMessageTemplate:
          dto.reminderMessageTemplate === ''
            ? null
            : dto.reminderMessageTemplate?.trim() || undefined,
        autoRoznamchaOnCollection: dto.autoRoznamchaOnCollection,
      },
      select: shopProfileSelect,
    });
  }
}
