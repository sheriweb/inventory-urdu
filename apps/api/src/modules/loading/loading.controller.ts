import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { LoadingAssignDto, LoadingUnloadDto, SalesmanInventoryQueryDto } from './dto';
import { LoadingService } from './loading.service';

const LOADING_ROLES = [UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.SALESMAN] as const;

@Controller('loading')
export class LoadingController {
  constructor(private readonly loadingService: LoadingService) {}

  @Post('assign')
  @Auth(...LOADING_ROLES)
  async assign(@CurrentUser() user: AuthUser, @Body() dto: LoadingAssignDto) {
    const data = await this.loadingService.assign(user, dto);
    return { message: MESSAGES.CREATED('Loading'), data };
  }

  @Post('unload')
  @Auth(...LOADING_ROLES)
  async unload(@CurrentUser() user: AuthUser, @Body() dto: LoadingUnloadDto) {
    const data = await this.loadingService.unload(user, dto);
    return { message: MESSAGES.CREATED('Unloading'), data };
  }

  @Get('inventory')
  @Auth(...LOADING_ROLES)
  async inventory(@CurrentUser() user: AuthUser, @Query() query: SalesmanInventoryQueryDto) {
    const data = await this.loadingService.getSalesmanInventory(user, query);
    return { message: MESSAGES.LIST_FETCHED('Salesman inventory'), data };
  }

  @Get('history')
  @Auth(...LOADING_ROLES)
  async history(@CurrentUser() user: AuthUser, @Query() query: SalesmanInventoryQueryDto) {
    const data = await this.loadingService.getLoadingHistory(user, query);
    return { message: MESSAGES.LIST_FETCHED('Loading history'), data };
  }
}
