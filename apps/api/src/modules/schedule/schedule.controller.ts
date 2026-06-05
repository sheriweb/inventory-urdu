import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { PayInstallmentScheduleDto, UpdateInstallmentScheduleDto } from './dto';
import { ScheduleService } from './schedule.service';

const SHOP_READ_ROLES = [
  UserRole.SHOP_OWNER,
  UserRole.OPERATOR,
  UserRole.SALESMAN,
  UserRole.RECOVERY_MAN,
] as const;

@Controller()
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Patch('leases/:leaseId/schedules/:scheduleId')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.RECOVERY_MAN)
  async updateSchedule(
    @CurrentUser() user: AuthUser,
    @Param('leaseId') leaseId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: UpdateInstallmentScheduleDto,
  ) {
    const data = await this.scheduleService.updateSchedule(
      user,
      leaseId,
      scheduleId,
      dto,
    );
    return { message: MESSAGES.UPDATED('Installment schedule'), data };
  }

  @Post('leases/:leaseId/schedules/:scheduleId/pay')
  @Auth(
    UserRole.SHOP_OWNER,
    UserRole.OPERATOR,
    UserRole.RECOVERY_MAN,
    UserRole.SALESMAN,
  )
  async paySchedule(
    @CurrentUser() user: AuthUser,
    @Param('leaseId') leaseId: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: PayInstallmentScheduleDto,
  ) {
    const data = await this.scheduleService.paySchedule(
      user,
      leaseId,
      scheduleId,
      dto,
    );
    return { message: MESSAGES.UPDATED('Installment payment'), data };
  }

  @Get('installments/short')
  @Auth(...SHOP_READ_ROLES)
  async listShort(@CurrentUser() user: AuthUser) {
    const data = await this.scheduleService.listShortInstallments(user);
    return { message: MESSAGES.LIST_FETCHED('Short installment'), data };
  }
}
