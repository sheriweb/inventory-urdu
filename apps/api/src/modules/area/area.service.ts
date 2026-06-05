import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { CreateAreaDto, UpdateAreaDto } from './dto';

@Injectable()
export class AreaService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateAreaDto) {
    const shopId = requireShopId(user);
    return this.prisma.area.create({
      data: {
        shopId,
        name: dto.name,
        city: dto.city,
      },
    });
  }

  async findAll(user: AuthUser) {
    const shopId = requireShopId(user);
    return this.prisma.area.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const area = await this.prisma.area.findFirst({ where: { id, shopId } });
    if (!area) throw new NotFoundException(MESSAGES.NOT_FOUND('Area'));
    return area;
  }

  async update(user: AuthUser, id: string, dto: UpdateAreaDto) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    return this.prisma.area.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    const shopId = requireShopId(user);
    await this.prisma.area.update({
      where: { id },
      data: { isActive: false },
    });
    return { id, shopId };
  }
}
