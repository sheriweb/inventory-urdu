import { Module } from '@nestjs/common';
import { RecoveryController } from './recovery.controller';
import { RecoveryService } from './recovery.service';
import { PaymentRecordingService } from './payment-recording.service';
import { RoznamchaModule } from '../roznamcha/roznamcha.module';
import { AutomationModule } from '../automation/automation.module';

@Module({
  imports: [RoznamchaModule, AutomationModule],
  controllers: [RecoveryController],
  providers: [RecoveryService, PaymentRecordingService],
  exports: [RecoveryService, PaymentRecordingService],
})
export class RecoveryModule {}
