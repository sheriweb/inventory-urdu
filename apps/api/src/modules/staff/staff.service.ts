import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { CreateStaffDto, UpdateStaffDto } from './dto';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertAreaInShop(shopId: string, areaId: string) {
    const area = await this.prisma.area.findFirst({ where: { id: areaId, shopId } });
    if (!area) {
      throw new BadRequestException(MESSAGES.NOT_FOUND('Area'));
    }
  }

  async create(user: AuthUser, dto: CreateStaffDto) {
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }
    return this.prisma.staff.create({
      data: {
        shopId,
        name: dto.name,
        mobile: dto.mobile,
        type: dto.type,
        areaId: dto.areaId,
      },
      include: { area: { select: { id: true, name: true } } },
    });
  }

  async findAll(user: AuthUser) {
    const shopId = requireShopId(user);
    return this.prisma.staff.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: { area: { select: { id: true, name: true } } },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const staff = await this.prisma.staff.findFirst({
      where: { id, shopId },
      include: { area: { select: { id: true, name: true } } },
    });
    if (!staff) throw new NotFoundException(MESSAGES.NOT_FOUND('Staff'));
    return staff;
  }

  async update(user: AuthUser, id: string, dto: UpdateStaffDto) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    if (dto.areaId) {
      await this.assertAreaInShop(shopId, dto.areaId);
    }
    return this.prisma.staff.update({
      where: { id },
      data: dto,
      include: { area: { select: { id: true, name: true } } },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.staff.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
