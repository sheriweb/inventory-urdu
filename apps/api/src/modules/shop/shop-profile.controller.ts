import { Body, Controller, Get, Patch } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { UpdateShopProfileDto } from './dto';
import { ShopService } from './shop.service';

@Controller('shop')
export class ShopProfileController {
  constructor(private readonly shopService: ShopService) {}

  @Get('profile')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.SALESMAN, UserRole.RECOVERY_MAN, UserRole.SHAREHOLDER)
  async getProfile(@CurrentUser() user: AuthUser) {
    const shop = await this.shopService.getProfile(user);
    return { message: MESSAGES.FETCHED('Shop'), data: shop };
  }

  @Patch('profile')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateShopProfileDto) {
    const shop = await this.shopService.updateProfile(user, dto);
    return { message: MESSAGES.UPDATED('Shop'), data: shop };
  }
}
