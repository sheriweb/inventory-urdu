import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { buildPagination, ListQueryDto } from '../../common/dto/list-query.dto';
import { requireShopId } from '../../common/utils';
import { CreateItemDto, ItemIdentifierFieldDto, UpdateItemDto } from './dto';

function slugKey(label: string, index: number): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return base || `field_${index + 1}`;
}

function normalizeIdentifierFieldsForDb(
  fields?: ItemIdentifierFieldDto[],
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (fields === undefined) return undefined;
  const normalized = fields
    .filter((field) => field?.label?.trim())
    .map((field, index) => ({
      key: field.key?.trim() || slugKey(field.label, index),
      label: field.label.trim(),
      required: Boolean(field.required),
    }));
  return normalized.length > 0 ? normalized : Prisma.DbNull;
}

@Injectable()
export class ItemService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertCompanyInShop(shopId: string, companyId: string) {
    const company = await this.prisma.company.findFirst({ where: { id: companyId, shopId } });
    if (!company) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Company'));
    }
  }

  private async nextItemCode(shopId: string, tx: Prisma.TransactionClient) {
    const result = await tx.item.aggregate({
      where: { shopId },
      _max: { itemCode: true },
    });
    return (result._max.itemCode ?? 0) + 1;
  }

  async create(user: AuthUser, dto: CreateItemDto) {
    const shopId = requireShopId(user);
    await this.assertCompanyInShop(shopId, dto.companyId);

    return this.prisma.$transaction(async (tx) => {
      const itemCode = await this.nextItemCode(shopId, tx);
      return tx.item.create({
        data: {
          shopId,
          companyId: dto.companyId,
          itemCode,
          name: dto.name,
          model: dto.model,
          purchaseRate: dto.purchaseRate,
          saleRate: dto.saleRate,
          identifierFields: normalizeIdentifierFieldsForDb(dto.identifierFields),
        },
        include: { company: { select: { id: true, name: true } } },
      });
    });
  }

  async findAll(user: AuthUser, query: ListQueryDto = {}) {
    const shopId = requireShopId(user);
    const where: Prisma.ItemWhereInput = { shopId, isActive: true };

    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [{ name: { contains: q } }, { model: { contains: q } }];
    }

    const usePagination = Boolean(query.page || query.limit || query.q?.trim());
    if (!usePagination) {
      const data = await this.prisma.item.findMany({
        where,
        orderBy: { itemCode: 'asc' },
        include: { company: { select: { id: true, name: true } } },
      });
      return { data };
    }

    const { page, limit, skip } = buildPagination(query);
    const [data, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        orderBy: { itemCode: 'asc' },
        skip,
        take: limit,
        include: { company: { select: { id: true, name: true } } },
      }),
      this.prisma.item.count({ where }),
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
    const item = await this.prisma.item.findFirst({
      where: { id, shopId },
      include: { company: { select: { id: true, name: true } } },
    });
    if (!item) throw new NotFoundException(MESSAGES.NOT_FOUND('Item'));
    return item;
  }

  async update(user: AuthUser, id: string, dto: UpdateItemDto) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    if (dto.companyId) {
      await this.assertCompanyInShop(shopId, dto.companyId);
    }

    const data: Prisma.ItemUncheckedUpdateInput = {};
    if (dto.companyId !== undefined) data.companyId = dto.companyId;
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.purchaseRate !== undefined) data.purchaseRate = dto.purchaseRate;
    if (dto.saleRate !== undefined) data.saleRate = dto.saleRate;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.identifierFields !== undefined) {
      data.identifierFields = normalizeIdentifierFieldsForDb(dto.identifierFields);
    }

    return this.prisma.item.update({
      where: { id },
      data,
      include: { company: { select: { id: true, name: true } } },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.item.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
