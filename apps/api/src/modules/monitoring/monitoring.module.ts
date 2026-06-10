import { Module } from '@nestjs/common';
import { ClientMonitoringController } from './client-monitoring.controller';
import { ClientMonitoringService } from './client-monitoring.service';

@Module({
  controllers: [ClientMonitoringController],
  providers: [ClientMonitoringService],
})
export class MonitoringModule {}
