import { Module, forwardRef } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { RecoveryModule } from '../recovery/recovery.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [forwardRef(() => RecoveryModule), AutomationModule],
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
