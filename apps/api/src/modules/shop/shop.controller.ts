import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UserRole } from '@inventory-urdu/shared';
import { Auth } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import {
  AdminShopBillingDto,
  AdminShopDataQueryDto,
  AdminShopReminderDto,
  AdminUpdateOwnerDto,
  AdminUpdateShopDto,
  CreateShopDto,
  DeleteShopDto,
  ResetOwnerPasswordDto,
  ToggleOwnerActiveDto,
  ToggleShopActiveDto,
} from './dto';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ShopService } from './shop.service';

@Controller('shops')
@Auth(UserRole.SUPER_ADMIN)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Post()
  async create(@Body() dto: CreateShopDto) {
    const shop = await this.shopService.create(dto);
    return { message: MESSAGES.CREATED('Shop'), data: shop };
  }

  @Get()
  async list() {
    const shops = await this.shopService.findAll();
    return { message: MESSAGES.LIST_FETCHED('Shop'), data: shops };
  }

  @Get('stats')
  async stats() {
    const data = await this.shopService.getPlatformStats();
    return { message: MESSAGES.FETCHED('Platform stats'), data };
  }

  @Get('owners')
  async owners() {
    const data = await this.shopService.listOwners();
    return { message: MESSAGES.LIST_FETCHED('Shop owner'), data };
  }

  @Get('activity')
  async activity() {
    const data = await this.shopService.getRecentActivity();
    return { message: MESSAGES.FETCHED('Platform activity'), data };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    const data = await this.shopService.findOne(id);
    return { message: MESSAGES.FETCHED('Shop'), data };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: AdminUpdateShopDto) {
    const data = await this.shopService.adminUpdateShop(id, dto);
    return { message: MESSAGES.UPDATED('Shop'), data };
  }

  @Patch(':id/active')
  async toggleActive(@Param('id') id: string, @Body() dto: ToggleShopActiveDto) {
    const shop = await this.shopService.setActive(id, dto.isActive);
    return { message: MESSAGES.UPDATED('Shop'), data: shop };
  }

  @Patch(':id/owner')
  async updateOwner(@Param('id') id: string, @Body() dto: AdminUpdateOwnerDto) {
    const data = await this.shopService.adminUpdateOwner(id, dto);
    return { message: MESSAGES.UPDATED('Shop owner'), data };
  }

  @Patch(':id/owner/active')
  async toggleOwnerActive(
    @Param('id') id: string,
    @Body() dto: ToggleOwnerActiveDto,
  ) {
    const data = await this.shopService.setOwnerActive(id, dto.isActive);
    return { message: MESSAGES.UPDATED('Shop owner'), data };
  }

  @Post(':id/owner/reset-password')
  async resetOwnerPassword(
    @Param('id') id: string,
    @Body() dto: ResetOwnerPasswordDto,
  ) {
    const data = await this.shopService.resetOwnerPassword(id, dto);
    return { message: MESSAGES.UPDATED('Shop owner password'), data };
  }

  @Get(':id/customers')
  async shopCustomers(@Param('id') id: string, @Query() query: ListQueryDto) {
    const result = await this.shopService.getShopCustomers(id, query);
    return {
      message: MESSAGES.LIST_FETCHED('Customer'),
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id/leases')
  async shopLeases(@Param('id') id: string, @Query() query: AdminShopDataQueryDto) {
    const result = await this.shopService.getShopLeases(id, query);
    return {
      message: MESSAGES.LIST_FETCHED('Lease account'),
      data: result.data,
      meta: result.meta,
    };
  }

  @Patch(':id/reminder-settings')
  async updateReminder(
    @Param('id') id: string,
    @Body() dto: AdminShopReminderDto,
  ) {
    const data = await this.shopService.adminUpdateReminder(id, dto);
    return { message: MESSAGES.UPDATED('Shop reminder settings'), data };
  }

  @Patch(':id/billing')
  async updateBilling(
    @Param('id') id: string,
    @Body() dto: AdminShopBillingDto,
  ) {
    const data = await this.shopService.adminUpdateBilling(id, dto);
    return { message: MESSAGES.UPDATED('Shop billing'), data };
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Body() dto: DeleteShopDto) {
    const data = await this.shopService.deleteShop(id, dto);
    return { message: MESSAGES.DELETED('Shop'), data };
  }
}
