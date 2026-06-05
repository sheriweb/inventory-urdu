import { Module } from '@nestjs/common';
import { CustomerModule } from '../customer/customer.module';
import { GuarantorController } from './guarantor.controller';
import { GuarantorService } from './guarantor.service';

@Module({
  imports: [CustomerModule],
  controllers: [GuarantorController],
  providers: [GuarantorService],
})
export class GuarantorModule {}
