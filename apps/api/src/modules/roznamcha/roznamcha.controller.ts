import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import {
  CreateExpenseAccountDto,
  CreateRoznamchaEntryDto,
  RoznamchaDailyBalanceDto,
  RoznamchaDateRangeDto,
} from './dto';
import { RoznamchaService } from './roznamcha.service';

const ROZNAMCHA_ROLES = [UserRole.SHOP_OWNER, UserRole.OPERATOR] as const;

@Controller('roznamcha')
export class RoznamchaController {
  constructor(private readonly roznamchaService: RoznamchaService) {}

  @Get('expense-accounts')
  @Auth(...ROZNAMCHA_ROLES)
  async expenseAccounts(@CurrentUser() user: AuthUser) {
    const data = await this.roznamchaService.listExpenseAccounts(user);
    return { message: MESSAGES.LIST_FETCHED('Expense account'), data };
  }

  @Post('expense-accounts')
  @Auth(...ROZNAMCHA_ROLES)
  async createExpenseAccount(@CurrentUser() user: AuthUser, @Body() dto: CreateExpenseAccountDto) {
    const data = await this.roznamchaService.createExpenseAccount(user, dto);
    return { message: MESSAGES.CREATED('Expense account'), data };
  }

  @Post('entries')
  @Auth(...ROZNAMCHA_ROLES)
  async createEntry(@CurrentUser() user: AuthUser, @Body() dto: CreateRoznamchaEntryDto) {
    const data = await this.roznamchaService.createEntry(user, dto);
    return { message: MESSAGES.CREATED('Roznamcha entry'), data };
  }

  @Get('entries')
  @Auth(...ROZNAMCHA_ROLES)
  async listEntries(@CurrentUser() user: AuthUser, @Query() query: RoznamchaDateRangeDto) {
    const data = await this.roznamchaService.listEntries(user, query);
    return { message: MESSAGES.LIST_FETCHED('Roznamcha entry'), data };
  }

  @Get('cash-book')
  @Auth(...ROZNAMCHA_ROLES)
  async cashBook(@CurrentUser() user: AuthUser, @Query() query: RoznamchaDateRangeDto) {
    const data = await this.roznamchaService.cashBook(user, query);
    return { message: MESSAGES.LIST_FETCHED('Cash book'), data };
  }

  @Get('trial-balance')
  @Auth(...ROZNAMCHA_ROLES)
  async trialBalance(@CurrentUser() user: AuthUser, @Query() query: RoznamchaDateRangeDto) {
    const data = await this.roznamchaService.trialBalance(user, query);
    return { message: MESSAGES.LIST_FETCHED('Trial balance'), data };
  }

  @Get('daily-balance')
  @Auth(...ROZNAMCHA_ROLES)
  async dailyBalance(@CurrentUser() user: AuthUser, @Query() query: RoznamchaDailyBalanceDto) {
    const data = await this.roznamchaService.dailyBalance(user, query);
    return { message: MESSAGES.FETCHED('Daily balance'), data };
  }

  @Delete('entries/:id')
  @Auth(...ROZNAMCHA_ROLES)
  async removeEntry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.roznamchaService.removeEntry(user, id);
    return { message: MESSAGES.DELETED('Roznamcha entry') };
  }
}
