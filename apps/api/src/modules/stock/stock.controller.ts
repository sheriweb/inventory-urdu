import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { AddStockDto, StockMovementsQueryDto } from './dto';
import { StockService } from './stock.service';

const STOCK_ROLES = [UserRole.SHOP_OWNER, UserRole.OPERATOR] as const;

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Post('in')
  @Auth(...STOCK_ROLES)
  async addStock(@CurrentUser() user: AuthUser, @Body() dto: AddStockDto) {
    const data = await this.stockService.addStock(user, dto);
    return { message: MESSAGES.CREATED('Stock entry'), data };
  }

  @Get()
  @Auth(...STOCK_ROLES, UserRole.SALESMAN)
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.stockService.getStockLevels(user);
    return { message: MESSAGES.LIST_FETCHED('Stock'), data };
  }

  @Get('movements')
  @Auth(...STOCK_ROLES)
  async movements(@CurrentUser() user: AuthUser, @Query() query: StockMovementsQueryDto) {
    const data = await this.stockService.getMovements(user, query);
    return { message: MESSAGES.LIST_FETCHED('Stock movement'), data };
  }

  @Get('status')
  @Auth(...STOCK_ROLES, UserRole.SALESMAN)
  async status(@CurrentUser() user: AuthUser) {
    const data = await this.stockService.getStockStatus(user);
    return { message: MESSAGES.LIST_FETCHED('Stock status'), data };
  }
}
