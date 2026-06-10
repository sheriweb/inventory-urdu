import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { CustomerService } from './customer.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateCustomerDto) {
    const data = await this.customerService.create(user, dto);
    return { message: MESSAGES.CREATED('Customer'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    const result = await this.customerService.findAll(user, query);
    if ('meta' in result) {
      return { message: MESSAGES.LIST_FETCHED('Customer'), data: result.data, meta: result.meta };
    }
    return { message: MESSAGES.LIST_FETCHED('Customer'), data: result.data };
  }

  @Get(':id/sale-hints')
  @Auth(...SHOP_READ_ROLES)
  async saleHints(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.customerService.getSaleHints(user, id);
    return { message: MESSAGES.FETCHED('Customer sale hints'), data };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.customerService.findOne(user, id);
    return { message: MESSAGES.FETCHED('Customer'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const data = await this.customerService.update(user, id, dto);
    return { message: MESSAGES.UPDATED('Customer'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.customerService.remove(user, id);
    return { message: MESSAGES.DELETED('Customer') };
  }
}
