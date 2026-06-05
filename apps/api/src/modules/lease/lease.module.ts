import { Module } from '@nestjs/common';
import { LeaseController } from './lease.controller';
import { LeaseService } from './lease.service';
import { ScheduleGeneratorService } from './schedule-generator.service';

@Module({
  controllers: [LeaseController],
  providers: [LeaseService, ScheduleGeneratorService],
  exports: [LeaseService],
})
export class LeaseModule {}
