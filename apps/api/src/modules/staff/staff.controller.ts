import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { StaffService } from './staff.service';
import { CreateStaffDto, UpdateStaffDto } from './dto';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateStaffDto) {
    const data = await this.staffService.create(user, dto);
    return { message: MESSAGES.CREATED('Staff'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.staffService.findAll(user);
    return { message: MESSAGES.LIST_FETCHED('Staff'), data };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.staffService.findOne(user, id);
    return { message: MESSAGES.FETCHED('Staff'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    const data = await this.staffService.update(user, id, dto);
    return { message: MESSAGES.UPDATED('Staff'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.staffService.remove(user, id);
    return { message: MESSAGES.DELETED('Staff') };
  }
}
