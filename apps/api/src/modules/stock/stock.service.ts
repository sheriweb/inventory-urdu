import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { AddStockDto, StockMovementsQueryDto } from './dto';

function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

function endOfDay(date: Date): Date {
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return end;
}

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async addStock(user: AuthUser, dto: AddStockDto) {
    const shopId = requireShopId(user);

    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, shopId, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Item'));
    }

    const movementDate = dto.movementDate ? new Date(dto.movementDate) : new Date();
    if (Number.isNaN(movementDate.getTime())) {
      throw new BadRequestException('Invalid movement date');
    }

    return this.prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          shopId,
          itemId: dto.itemId,
          type: StockMovementType.IN,
          quantity: dto.quantity,
          supplier: dto.supplier,
          note: dto.note,
          movementDate,
        },
        include: {
          item: {
            select: { id: true, name: true, itemCode: true, stockQuantity: true },
          },
        },
      });

      const updated = await tx.item.update({
        where: { id: dto.itemId },
        data: { stockQuantity: { increment: dto.quantity } },
        include: {
          company: { select: { id: true, name: true } },
        },
      });

      return { movement, item: updated };
    });
  }

  async getStockLevels(user: AuthUser) {
    const shopId = requireShopId(user);

    const items = await this.prisma.item.findMany({
      where: { shopId, isActive: true },
      orderBy: [{ stockQuantity: 'desc' }, { itemCode: 'asc' }],
      include: { company: { select: { id: true, name: true } } },
    });

    const totalUnits = items.reduce((sum, i) => sum + i.stockQuantity, 0);
    const inStock = items.filter((i) => i.stockQuantity > 0).length;
    const outOfStock = items.filter((i) => i.stockQuantity === 0).length;

    return {
      rows: items.map((item) => ({
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        model: item.model,
        companyName: item.company.name,
        purchaseRate: item.purchaseRate,
        saleRate: item.saleRate,
        stockQuantity: item.stockQuantity,
      })),
      summary: {
        totalItems: items.length,
        inStock,
        outOfStock,
        totalUnits,
      },
    };
  }

  async getMovements(user: AuthUser, query: StockMovementsQueryDto) {
    const shopId = requireShopId(user);

    const movementDate: Prisma.DateTimeFilter = {};
    if (query.from) {
      const from = new Date(query.from);
      if (Number.isNaN(from.getTime())) {
        throw new BadRequestException('Invalid from date');
      }
      movementDate.gte = startOfDay(from);
    }
    if (query.to) {
      const to = new Date(query.to);
      if (Number.isNaN(to.getTime())) {
        throw new BadRequestException('Invalid to date');
      }
      movementDate.lte = endOfDay(to);
    }

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        shopId,
        ...(query.itemId ? { itemId: query.itemId } : {}),
        ...(Object.keys(movementDate).length ? { movementDate } : {}),
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        item: {
          select: { id: true, name: true, itemCode: true },
        },
      },
    });

    return movements.map((m) => ({
      id: m.id,
      itemId: m.itemId,
      itemCode: m.item.itemCode,
      itemName: m.item.name,
      type: m.type,
      quantity: m.quantity,
      supplier: m.supplier,
      note: m.note,
      movementDate: m.movementDate,
    }));
  }

  async getStockStatus(user: AuthUser) {
    const shopId = requireShopId(user);

    const items = await this.prisma.item.findMany({
      where: { shopId, isActive: true },
      orderBy: { stockQuantity: 'asc' },
      include: { company: { select: { name: true } } },
    });

    const rows = items.map((item) => {
      let status: 'OK' | 'LOW' | 'OUT' = 'OK';
      if (item.stockQuantity === 0) status = 'OUT';
      else if (item.stockQuantity <= 5) status = 'LOW';

      return {
        id: item.id,
        itemCode: item.itemCode,
        name: item.name,
        companyName: item.company.name,
        stockQuantity: item.stockQuantity,
        status,
        purchaseRate: item.purchaseRate,
        saleRate: item.saleRate,
        stockValue: Number(item.purchaseRate) * item.stockQuantity,
      };
    });

    const totalValue = rows.reduce((sum, r) => sum + r.stockValue, 0);

    return {
      rows,
      summary: {
        totalItems: rows.length,
        outOfStock: rows.filter((r) => r.status === 'OUT').length,
        lowStock: rows.filter((r) => r.status === 'LOW').length,
        totalValue: Math.round(totalValue * 100) / 100,
      },
    };
  }
}
