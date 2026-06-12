import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import {
  CollectAdvanceDto,
  CollectPaymentDto,
  MarkReminderSentDto,
  PaymentRecordsQueryDto,
  RecoveryListQueryDto,
  ReminderQueryDto,
} from './dto';
import { RecoveryService } from './recovery.service';

const RECOVERY_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.RECOVERY_MAN,
  UserRole.SALESMAN,
] as const;

@Controller('recovery')
export class RecoveryController {
  constructor(private readonly recoveryService: RecoveryService) {}

  @Get('dashboard-stats')
  @Auth(...RECOVERY_ROLES)
  async getDashboardStats(@CurrentUser() user: AuthUser) {
    const data = await this.recoveryService.getDashboardStats(user);
    return { message: MESSAGES.FETCHED('Dashboard stats'), data };
  }

  @Get('list')
  @Auth(...RECOVERY_ROLES)
  async getRecoveryList(
    @CurrentUser() user: AuthUser,
    @Query() query: RecoveryListQueryDto,
  ) {
    const data = await this.recoveryService.getRecoveryList(user, query);
    return { message: MESSAGES.LIST_FETCHED('Recovery'), data };
  }

  @Post('collect')
  @Auth(...RECOVERY_ROLES)
  async collectPayment(
    @CurrentUser() user: AuthUser,
    @Body() dto: CollectPaymentDto,
  ) {
    const data = await this.recoveryService.collectPayment(user, dto);
    return { message: MESSAGES.CREATED('Payment'), data };
  }

  @Post('advance')
  @Auth(...RECOVERY_ROLES)
  async collectAdvance(
    @CurrentUser() user: AuthUser,
    @Body() dto: CollectAdvanceDto,
  ) {
    const data = await this.recoveryService.collectAdvance(user, dto);
    return { message: MESSAGES.CREATED('Advance payment'), data };
  }

  @Get('payments')
  @Auth(...RECOVERY_ROLES)
  async getPaymentRecords(
    @CurrentUser() user: AuthUser,
    @Query() query: PaymentRecordsQueryDto,
  ) {
    const data = await this.recoveryService.getPaymentRecords(user, query);
    return { message: MESSAGES.LIST_FETCHED('Payment'), data };
  }

  @Delete('payments/:id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async deletePayment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.recoveryService.deletePayment(user, id);
    return { message: MESSAGES.DELETED('Payment') };
  }

  @Get('payments/:id')
  @Auth(...RECOVERY_ROLES)
  async getPayment(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const data = await this.recoveryService.getPaymentById(user, id);
    return { message: MESSAGES.FETCHED('Payment'), data };
  }

  @Get('reminders')
  @Auth(...RECOVERY_ROLES)
  async getReminders(@CurrentUser() user: AuthUser, @Query() query: ReminderQueryDto) {
    const data = await this.recoveryService.listInstallmentReminders(user, query);
    return { message: MESSAGES.LIST_FETCHED('Reminder'), data };
  }

  @Get('bulk-payment-messages')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.RECOVERY_MAN)
  async getBulkPaymentMessages(@CurrentUser() user: AuthUser) {
    const data = await this.recoveryService.listBulkPaymentMessages(user);
    return { message: MESSAGES.LIST_FETCHED('Bulk payment messages'), data };
  }

  @Post('reminders/:scheduleId/sent')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.RECOVERY_MAN)
  async markReminderSent(
    @CurrentUser() user: AuthUser,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: MarkReminderSentDto,
  ) {
    const data = await this.recoveryService.markReminderSent(user, scheduleId, dto);
    return { message: MESSAGES.UPDATED('Reminder'), data };
  }
}
