import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { OverdueCronService } from './overdue.cron';

@Module({
  providers: [AutomationService, OverdueCronService],
  exports: [AutomationService],
})
export class AutomationModule {}
