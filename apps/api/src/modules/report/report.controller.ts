import { Controller, Get, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { DateRangeQueryDto } from './dto';
import { ReportService } from './report.service';

const REPORT_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('short-list')
  @Auth(...REPORT_ROLES)
  async shortList(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getShortListReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Short list report'), data };
  }

  @Get('short-balance')
  @Auth(...REPORT_ROLES)
  async shortBalance(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getShortBalanceReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Short balance report'), data };
  }

  @Get('recovery-detail')
  @Auth(...REPORT_ROLES)
  async recoveryDetail(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getRecoveryDetailReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Recovery detail report'), data };
  }

  @Get('recovery-man')
  @Auth(...REPORT_ROLES)
  async recoveryMan(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getRecoveryManReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Recovery man report'), data };
  }

  @Get('advance')
  @Auth(...REPORT_ROLES)
  async advance(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getAdvanceDetailReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Advance detail report'), data };
  }

  @Get('sales')
  @Auth(...REPORT_ROLES)
  async sales(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getSalesReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Sales report'), data };
  }

  @Get('bill-profit')
  @Auth(...REPORT_ROLES)
  async billProfit(@CurrentUser() user: AuthUser, @Query() query: DateRangeQueryDto) {
    const data = await this.reportService.getBillProfitReport(user, query);
    return { message: MESSAGES.LIST_FETCHED('Bill profit report'), data };
  }
}
