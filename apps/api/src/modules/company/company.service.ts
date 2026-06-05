import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { CreateCompanyDto, UpdateCompanyDto } from './dto';

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, dto: CreateCompanyDto) {
    const shopId = requireShopId(user);
    return this.prisma.company.create({
      data: { shopId, name: dto.name },
    });
  }

  async findAll(user: AuthUser) {
    const shopId = requireShopId(user);
    return this.prisma.company.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, id: string) {
    const shopId = requireShopId(user);
    const company = await this.prisma.company.findFirst({ where: { id, shopId } });
    if (!company) throw new NotFoundException(MESSAGES.NOT_FOUND('Company'));
    return company;
  }

  async update(user: AuthUser, id: string, dto: UpdateCompanyDto) {
    await this.findOne(user, id);
    return this.prisma.company.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.findOne(user, id);
    await this.prisma.company.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
