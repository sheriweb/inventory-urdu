import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthUser } from '@inventory-urdu/shared';
import { PrismaService } from '../../database/prisma.service';
import { MESSAGES } from '../../common/constants';
import { requireShopId } from '../../common/utils';
import { CustomerService } from '../customer/customer.service';
import { CreateGuarantorDto, UpdateGuarantorDto } from './dto';

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

@Injectable()
export class GuarantorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerService: CustomerService,
  ) {}

  async create(user: AuthUser, customerId: string, dto: CreateGuarantorDto) {
    await this.customerService.findOne(user, customerId);
    const shopId = requireShopId(user);
    const additionalMobiles = sanitizeAdditionalMobiles(dto.additionalMobiles);
    return this.prisma.guarantor.create({
      data: {
        shopId,
        customerId,
        name: dto.name,
        fatherOrHusbandName: dto.fatherOrHusbandName,
        caste: dto.caste,
        cnic: dto.cnic,
        phone: dto.phone,
        additionalMobiles: additionalMobiles.length > 0 ? additionalMobiles : undefined,
        cnicFrontPhotoUrl: dto.cnicFrontPhotoUrl,
        cnicBackPhotoUrl: dto.cnicBackPhotoUrl,
        photoUrl: dto.photoUrl,
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
    const additionalMobiles =
      dto.additionalMobiles !== undefined
        ? sanitizeAdditionalMobiles(dto.additionalMobiles)
        : undefined;
    const { additionalMobiles: _extraMobiles, ...rest } = dto;
    return this.prisma.guarantor.update({
      where: { id },
      data: {
        ...rest,
        ...(dto.additionalMobiles !== undefined
          ? {
              additionalMobiles: additionalMobiles?.length
                ? additionalMobiles
                : Prisma.DbNull,
            }
          : {}),
      },
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
