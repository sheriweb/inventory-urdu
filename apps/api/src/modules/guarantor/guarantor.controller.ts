import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { GuarantorService } from './guarantor.service';
import { CreateGuarantorDto, UpdateGuarantorDto } from './dto';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('customers/:customerId/guarantors')
export class GuarantorController {
  constructor(private readonly guarantorService: GuarantorService) {}

  @Post()
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async create(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Body() dto: CreateGuarantorDto,
  ) {
    const data = await this.guarantorService.create(user, customerId, dto);
    return { message: MESSAGES.CREATED('Guarantor'), data };
  }

  @Get()
  @Auth(...SHOP_READ_ROLES)
  async list(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
  ) {
    const data = await this.guarantorService.findAll(user, customerId);
    return { message: MESSAGES.LIST_FETCHED('Guarantor'), data };
  }

  @Get(':id')
  @Auth(...SHOP_READ_ROLES)
  async getOne(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
  ) {
    const data = await this.guarantorService.findOne(user, customerId, id);
    return { message: MESSAGES.FETCHED('Guarantor'), data };
  }

  @Patch(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGuarantorDto,
  ) {
    const data = await this.guarantorService.update(user, customerId, id, dto);
    return { message: MESSAGES.UPDATED('Guarantor'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('customerId') customerId: string,
    @Param('id') id: string,
  ) {
    await this.guarantorService.remove(user, customerId, id);
    return { message: MESSAGES.DELETED('Guarantor') };
  }
}
