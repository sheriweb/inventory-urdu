import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { AreaService } from './area.service';
import { CreateAreaDto, UpdateAreaDto } from './dto';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('areas')
export class AreaController {
  constructor(private readonly areaService: AreaService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateAreaDto) {
    const data = await this.areaService.create(user, dto);
    return { message: MESSAGES.CREATED('Area'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.areaService.findAll(user);
    return { message: MESSAGES.LIST_FETCHED('Area'), data };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.areaService.findOne(user, id);
    return { message: MESSAGES.FETCHED('Area'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateAreaDto,
  ) {
    const data = await this.areaService.update(user, id, dto);
    return { message: MESSAGES.UPDATED('Area'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.areaService.remove(user, id);
    return { message: MESSAGES.DELETED('Area') };
  }
}
