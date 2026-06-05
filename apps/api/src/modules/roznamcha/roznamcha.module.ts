import { Module } from '@nestjs/common';
import { RoznamchaController } from './roznamcha.controller';
import { RoznamchaService } from './roznamcha.service';

@Module({
  controllers: [RoznamchaController],
  providers: [RoznamchaService],
  exports: [RoznamchaService],
})
export class RoznamchaModule {}
