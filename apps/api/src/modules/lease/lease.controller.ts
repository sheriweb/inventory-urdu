import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import {
  AccountsQueryDto,
  CreateLeaseAccountDto,
  DiscountLeaseDto,
  UpdateLeaseAccountDto,
} from './dto';
import { LeaseService } from './lease.service';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('leases')
export class LeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.SALESMAN)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateLeaseAccountDto) {
    const data = await this.leaseService.create(user, dto);
    return { message: MESSAGES.CREATED('Lease account'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(@CurrentUser() user: AuthUser, @Query() query: AccountsQueryDto) {
    const result = await this.leaseService.findAll(user, query);
    if (Array.isArray(result)) {
      return { message: MESSAGES.LIST_FETCHED('Lease account'), data: result };
    }
    return {
      message: MESSAGES.LIST_FETCHED('Lease account'),
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.leaseService.findOne(user, id);
    return { message: MESSAGES.FETCHED('Lease account'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateLeaseAccountDto,
  ) {
    const data = await this.leaseService.update(user, id, dto);
    return { message: MESSAGES.UPDATED('Lease account'), data };
  }

  @Post(':id/discount')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async discount(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: DiscountLeaseDto,
  ) {
    const data = await this.leaseService.applyDiscount(user, id, dto);
    return { message: MESSAGES.CREATED('Discount'), data };
  }
}
