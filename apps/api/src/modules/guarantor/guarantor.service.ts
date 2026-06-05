import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { CustomerService } from '../customer/customer.service';
import { CreateGuarantorDto, UpdateGuarantorDto } from './dto';

@Injectable()
export class GuarantorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  async create(user: AuthUser, customerId: string, dto: CreateGuarantorDto) {
    await this.customerService.findOne(user, customerId);
    const shopId = requireShopId(user);
    return this.prisma.guarantor.create({
      data: {
        shopId,
        customerId,
        name: dto.name,
        cnic: dto.cnic,
        phone: dto.phone,
        cnicFrontPhotoUrl: dto.cnicFrontPhotoUrl,
        cnicBackPhotoUrl: dto.cnicBackPhotoUrl,
        presentAddress: dto.presentAddress,
        permanentAddress: dto.permanentAddress,
      },
    });
  }

  async findAll(user: AuthUser, customerId: string) {
    await this.customerService.findOne(user, customerId);
    const shopId = requireShopId(user);
    return this.prisma.guarantor.findMany({
      where: { shopId, customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(user: AuthUser, customerId: string, id: string) {
    await this.customerService.findOne(user, customerId);
    const shopId = requireShopId(user);
    const guarantor = await this.prisma.guarantor.findFirst({
      where: { id, shopId, customerId },
    });
    if (!guarantor) throw new NotFoundException(MESSAGES.NOT_FOUND('Guarantor'));
    return guarantor;
  }

  async update(user: AuthUser, customerId: string, id: string, dto: UpdateGuarantorDto) {
    await this.findOne(user, customerId, id);
    return this.prisma.guarantor.update({
      where: { id },
      data: dto,
    });
  }

  async remove(user: AuthUser, customerId: string, id: string) {
    await this.findOne(user, customerId, id);
    await this.prisma.guarantor.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
