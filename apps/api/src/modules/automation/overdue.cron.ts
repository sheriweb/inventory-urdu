import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AutomationService } from './automation.service';

@Injectable()
export class OverdueCronService {
  private readonly logger = new Logger(OverdueCronService.name);

  constructor(private readonly automationService: AutomationService) {}

  /** Daily at 12:05 AM — auto-mark overdue installments (A1). */
  @Cron('5 0 * * *')
  async handleMidnightOverdue() {
    try {
      const count = await this.automationService.markOverdueInstallments();
      if (count > 0) {
        this.logger.log(`Midnight job: ${count} overdue installment(s) updated`);
      }
    } catch (err) {
      this.logger.error('Midnight overdue job failed', err);
    }
  }
}
