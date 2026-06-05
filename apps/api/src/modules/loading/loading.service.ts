import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser, StaffType } from '@inventory-urdu/shared';
import { StockMovementType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { LoadingAssignDto, LoadingUnloadDto, SalesmanInventoryQueryDto } from './dto';

@Injectable()
export class LoadingService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertSalesman(shopId: string, staffId: string) {
    const staff = await this.prisma.staff.findFirst({
      where: { id: staffId, shopId, isActive: true, type: StaffType.SALESMAN },
    });
    if (!staff) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Salesman'));
    }
    return staff;
  }

  private async assertItem(shopId: string, itemId: string) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, shopId, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Item'));
    }
    return item;
  }

  async assign(user: AuthUser, dto: LoadingAssignDto) {
    const shopId = requireShopId(user);
    await this.assertSalesman(shopId, dto.staffId);
    const item = await this.assertItem(shopId, dto.itemId);

    if (item.stockQuantity < dto.quantity) {
      throw new BadRequestException('Shop stock is insufficient for loading');
    }

    const movementDate = dto.movementDate ? new Date(dto.movementDate) : new Date();
    if (Number.isNaN(movementDate.getTime())) {
      throw new BadRequestException('Invalid movement date');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: dto.itemId },
        data: { stockQuantity: { decrement: dto.quantity } },
      });

      await tx.salesmanStock.upsert({
        where: {
          shopId_staffId_itemId: {
            shopId,
            staffId: dto.staffId,
            itemId: dto.itemId,
          },
        },
        create: {
          shopId,
          staffId: dto.staffId,
          itemId: dto.itemId,
          quantity: dto.quantity,
        },
        update: { quantity: { increment: dto.quantity } },
      });

      const movement = await tx.stockMovement.create({
        data: {
          shopId,
          itemId: dto.itemId,
          staffId: dto.staffId,
          type: StockMovementType.LOAD,
          quantity: dto.quantity,
          note: dto.note,
          movementDate,
        },
        include: {
          item: { select: { name: true, itemCode: true } },
          staff: { select: { name: true } },
        },
      });

      return movement;
    });
  }

  async unload(user: AuthUser, dto: LoadingUnloadDto) {
    const shopId = requireShopId(user);
    await this.assertSalesman(shopId, dto.staffId);
    await this.assertItem(shopId, dto.itemId);

    const holding = await this.prisma.salesmanStock.findUnique({
      where: {
        shopId_staffId_itemId: {
          shopId,
          staffId: dto.staffId,
          itemId: dto.itemId,
        },
      },
    });

    if (!holding || holding.quantity < dto.quantity) {
      throw new BadRequestException('Salesman does not have enough stock to unload');
    }

    const movementDate = dto.movementDate ? new Date(dto.movementDate) : new Date();
    if (Number.isNaN(movementDate.getTime())) {
      throw new BadRequestException('Invalid movement date');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.item.update({
        where: { id: dto.itemId },
        data: { stockQuantity: { increment: dto.quantity } },
      });

      const newQty = holding.quantity - dto.quantity;
      if (newQty === 0) {
        await tx.salesmanStock.delete({ where: { id: holding.id } });
      } else {
        await tx.salesmanStock.update({
          where: { id: holding.id },
          data: { quantity: newQty },
        });
      }

      const movement = await tx.stockMovement.create({
        data: {
          shopId,
          itemId: dto.itemId,
          staffId: dto.staffId,
          type: StockMovementType.UNLOAD,
          quantity: dto.quantity,
          note: dto.note,
          movementDate,
        },
        include: {
          item: { select: { name: true, itemCode: true } },
          staff: { select: { name: true } },
        },
      });

      return movement;
    });
  }

  async getSalesmanInventory(user: AuthUser, query: SalesmanInventoryQueryDto) {
    const shopId = requireShopId(user);

    const rows = await this.prisma.salesmanStock.findMany({
      where: {
        shopId,
        ...(query.staffId ? { staffId: query.staffId } : {}),
        quantity: { gt: 0 },
      },
      orderBy: [{ staff: { name: 'asc' } }, { item: { itemCode: 'asc' } }],
      include: {
        staff: { select: { id: true, name: true } },
        item: { select: { id: true, name: true, itemCode: true, saleRate: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      staffId: row.staffId,
      staffName: row.staff.name,
      itemId: row.itemId,
      itemCode: row.item.itemCode,
      itemName: row.item.name,
      quantity: row.quantity,
      saleRate: row.item.saleRate,
    }));
  }

  async getLoadingHistory(user: AuthUser, query: SalesmanInventoryQueryDto) {
    const shopId = requireShopId(user);

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        shopId,
        type: { in: [StockMovementType.LOAD, StockMovementType.UNLOAD] },
        ...(query.staffId ? { staffId: query.staffId } : {}),
      },
      orderBy: [{ movementDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        item: { select: { name: true, itemCode: true } },
        staff: { select: { name: true } },
      },
    });

    return movements.map((m) => ({
      id: m.id,
      type: m.type,
      itemCode: m.item.itemCode,
      itemName: m.item.name,
      staffName: m.staff?.name ?? '—',
      quantity: m.quantity,
      movementDate: m.movementDate,
      note: m.note,
    }));
  }
}
