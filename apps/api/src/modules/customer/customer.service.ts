import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { buildPagination, ListQueryDto } from '../../common/dto/list-query.dto';
import { requireShopId } from '../../common/utils';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

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

  async create(user: AuthUser, dto: CreateCustomerDto) {
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }

    if (dto.mobile?.trim()) {
      const existingMobile = await this.prisma.customer.findFirst({
        where: { shopId, isActive: true, mobile: dto.mobile.trim() },
        select: { id: true, name: true },
      });
      if (existingMobile) {
        throw new ConflictException(`یہ موبائل پہلے سے رجسٹر ہے — گاہک: ${existingMobile.name}`);
      }
    }

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
        mobile: dto.mobile,
        cnic: dto.cnic,
        cnicPhotoUrl: dto.cnicPhotoUrl,
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

  async update(user: AuthUser, id: string, dto: UpdateCustomerDto) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }
    return this.prisma.customer.update({
      where: { id },
      data: dto,
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
