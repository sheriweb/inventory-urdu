import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { ListQueryDto } from '../../common/dto/list-query.dto';
import { ItemService } from './item.service';
import { CreateItemDto, UpdateItemDto } from './dto';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('items')
export class ItemController {
  constructor(private readonly itemService: ItemService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateItemDto) {
    const data = await this.itemService.create(user, dto);
    return { message: MESSAGES.CREATED('Item'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(@CurrentUser() user: AuthUser, @Query() query: ListQueryDto) {
    const result = await this.itemService.findAll(user, query);
    if ('meta' in result) {
      return { message: MESSAGES.LIST_FETCHED('Item'), data: result.data, meta: result.meta };
    }
    return { message: MESSAGES.LIST_FETCHED('Item'), data: result.data };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.itemService.findOne(user, id);
    return { message: MESSAGES.FETCHED('Item'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    const data = await this.itemService.update(user, id, dto);
    return { message: MESSAGES.UPDATED('Item'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.itemService.remove(user, id);
    return { message: MESSAGES.DELETED('Item') };
  }
}
