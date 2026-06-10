import { Module } from '@nestjs/common';
import { RecoveryModule } from '../recovery/recovery.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';

@Module({
  imports: [RecoveryModule],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService],
})
export class ReportModule {}
