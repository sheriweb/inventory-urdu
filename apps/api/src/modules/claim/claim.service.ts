import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { ClaimType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { ClaimsQueryDto, CreateClaimDto } from './dto';

@Injectable()
export class ClaimService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateClaimDto) {
    const shopId = requireShopId(user);

    const item = await this.prisma.item.findFirst({
      where: { id: dto.itemId, shopId, isActive: true },
    });
    if (!item) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Item'));
    }

    if (dto.type === ClaimType.CUSTOMER && !dto.customerId) {
      throw new BadRequestException('Customer is required for customer claim');
    }

    if (dto.staffId) {
      const staff = await this.prisma.staff.findFirst({
        where: { id: dto.staffId, shopId, isActive: true },
      });
      if (!staff) {
        throw new BadRequestException(MESSAGES.NOT_FOUND('Staff'));
      }
    }

    if (dto.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: dto.customerId, shopId, isActive: true },
      });
      if (!customer) {
        throw new BadRequestException(MESSAGES.NOT_FOUND('Customer'));
      }
    }

    const claimDate = dto.claimDate ? new Date(dto.claimDate) : new Date();
    if (Number.isNaN(claimDate.getTime())) {
      throw new BadRequestException('Invalid claim date');
    }

    return this.prisma.claim.create({
      data: {
        shopId,
        type: dto.type,
        itemId: dto.itemId,
        staffId: dto.staffId,
        customerId: dto.customerId,
        quantity: dto.quantity,
        detail: dto.detail,
        imageUrl: dto.imageUrl,
        claimDate,
      },
      include: {
        item: { select: { name: true, itemCode: true } },
        staff: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });
  }

  async findAll(user: AuthUser, query: ClaimsQueryDto) {
    const shopId = requireShopId(user);

    const claims = await this.prisma.claim.findMany({
      where: {
        shopId,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: [{ claimDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        item: { select: { name: true, itemCode: true } },
        staff: { select: { name: true } },
        customer: { select: { name: true } },
      },
    });

    return claims.map((c) => ({
      id: c.id,
      type: c.type,
      itemCode: c.item.itemCode,
      itemName: c.item.name,
      staffName: c.staff?.name ?? null,
      customerName: c.customer?.name ?? null,
      quantity: c.quantity,
      detail: c.detail,
      imageUrl: c.imageUrl,
      claimDate: c.claimDate,
      createdAt: c.createdAt,
    }));
  }

  async remove(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const claim = await this.prisma.claim.findFirst({ where: { id, shopId } });
    if (!claim) {
      throw new NotFoundException(MESSAGES.NOT_FOUND('Claim'));
    }
    await this.prisma.claim.delete({ where: { id } });
  }
}
