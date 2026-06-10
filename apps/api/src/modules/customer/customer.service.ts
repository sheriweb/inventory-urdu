import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { buildPagination, ListQueryDto } from '../../common/dto/list-query.dto';
import { requireShopId } from '../../common/utils';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

function toNum(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : Number(value);
}

function sanitizeAdditionalMobiles(values?: string[]): string[] {
  if (!values?.length) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

const customerInclude = {
  area: { select: { id: true, name: true, city: true } },
  guarantors: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAreaInShop(shopId: string, areaId: string) {
    const area = await this.prisma.area.findFirst({ where: { id: areaId, shopId } });
    if (!area) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Area'));
    }
  }

  private async assertMobilesAvailable(
    shopId: string,
    mobile?: string,
    additionalMobiles?: string[],
    excludeCustomerId?: string,
  ) {
    const phones = [
      mobile?.trim(),
      ...sanitizeAdditionalMobiles(additionalMobiles),
    ].filter((v): v is string => Boolean(v));

    const unique = new Set(phones);
    if (unique.size !== phones.length) {
      throw new ConflictException('موبائل نمبر دہرائے گئے ہیں');
    }

    const customers = await this.prisma.customer.findMany({
      where: {
        shopId,
        isActive: true,
        ...(excludeCustomerId ? { id: { not: excludeCustomerId } } : {}),
      },
      select: { name: true, mobile: true, additionalMobiles: true },
    });

    for (const phone of phones) {
      for (const customer of customers) {
        const extras = Array.isArray(customer.additionalMobiles)
          ? customer.additionalMobiles.filter((v): v is string => typeof v === 'string')
          : [];
        if (customer.mobile === phone || extras.includes(phone)) {
          throw new ConflictException(`یہ موبائل پہلے سے رجسٹر ہے — گاہک: ${customer.name}`);
        }
      }
    }
  }

  async create(user: AuthUser, dto: CreateCustomerDto) {
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }

    const additionalMobiles = sanitizeAdditionalMobiles(dto.additionalMobiles);
    await this.assertMobilesAvailable(shopId, dto.mobile, additionalMobiles);

    if (dto.cnic?.trim()) {
      const existingCnic = await this.prisma.customer.findFirst({
        where: { shopId, isActive: true, cnic: dto.cnic.trim() },
        select: { id: true, name: true },
      });
      if (existingCnic) {
        throw new ConflictException(`یہ شناختی کارڈ پہلے سے رجسٹر ہے — گاہک: ${existingCnic.name}`);
      }
    }

    return this.prisma.customer.create({
      data: {
        shopId,
        areaId: dto.areaId,
        name: dto.name,
        fatherOrHusbandName: dto.fatherOrHusbandName,
        caste: dto.caste,
        profession: dto.profession,
        mobile: dto.mobile?.trim() || undefined,
        additionalMobiles: additionalMobiles.length > 0 ? additionalMobiles : undefined,
        cnic: dto.cnic,
        cnicPhotoUrl: dto.cnicPhotoUrl,
        photoUrl: dto.photoUrl,
        cnicFrontPhotoUrl: dto.cnicFrontPhotoUrl,
        cnicBackPhotoUrl: dto.cnicBackPhotoUrl,
        chequePhotoUrl: dto.chequePhotoUrl,
        city: dto.city,
        presentAddress: dto.presentAddress,
        permanentAddress: dto.permanentAddress,
        bankName: dto.bankName,
        chequeNumber: dto.chequeNumber,
      },
      include: customerInclude,
    });
  }

  async findAll(user: AuthUser, query: ListQueryDto = {}) {
    const shopId = requireShopId(user);
    const where: Prisma.CustomerWhereInput = { shopId, isActive: true };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { cnic: { contains: q } },
        { fatherOrHusbandName: { contains: q } },
      ];
    }

    const usePagination = Boolean(query.page || query.limit || query.q?.trim());
    if (!usePagination) {
      const data = await this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: customerInclude,
      });
      return { data };
    }

    const { page, limit, skip } = buildPagination(query);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: customerInclude,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const customer = await this.prisma.customer.findFirst({
      where: { id, shopId },
      include: customerInclude,
    });
    if (!customer) throw new NotFoundException(MESSAGES.NOT_FOUND('Customer'));
    return customer;
  }

  /** Rules-based hints for نئی فروخت — last lease of this customer */
  async getSaleHints(user: AuthUser, customerId: string) {
    const shopId = requireShopId(user);
    await this.findOne(user, customerId);

    const lastLease = await this.prisma.leaseAccount.findFirst({
      where: { shopId, customerId },
      orderBy: [{ accountDate: 'desc' }, { accountNumber: 'desc' }],
      select: {
        accountNumber: true,
        totalAmount: true,
        advanceAmount: true,
        installmentCount: true,
        frequency: true,
        currentInstallmentAmount: true,
        salesmanId: true,
        recoveryManId: true,
        outdoorManId: true,
      },
    });

    if (!lastLease) return null;

    const total = toNum(lastLease.totalAmount);
    const advance = toNum(lastLease.advanceAmount);
    const advancePercent = total > 0 ? Math.round((advance / total) * 1000) / 10 : 0;

    return {
      accountNumber: lastLease.accountNumber,
      advancePercent,
      installmentCount: lastLease.installmentCount,
      frequency: lastLease.frequency,
      perInstallmentAmount: toNum(lastLease.currentInstallmentAmount),
      salesmanId: lastLease.salesmanId,
      recoveryManId: lastLease.recoveryManId,
      outdoorManId: lastLease.outdoorManId,
    };
  }

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }

    const additionalMobiles =
      dto.additionalMobiles !== undefined
        ? sanitizeAdditionalMobiles(dto.additionalMobiles)
        : undefined;

    if (dto.mobile !== undefined || dto.additionalMobiles !== undefined) {
      await this.assertMobilesAvailable(
        shopId,
        dto.mobile,
        additionalMobiles,
        id,
      );
    }

    const { additionalMobiles: _extraMobiles, mobile: _mobile, ...rest } = dto;
    return this.prisma.customer.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.mobile !== undefined ? { mobile: dto.mobile?.trim() || null } : {}),
        ...(dto.additionalMobiles !== undefined
          ? {
              additionalMobiles: additionalMobiles?.length
                ? additionalMobiles
                : Prisma.DbNull,
            }
          : {}),
      },
      include: customerInclude,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
