import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { ClientMonitoringService } from './client-monitoring.service';
import { ClientErrorDto } from './dto/client-error.dto';

@Controller('monitoring')
export class ClientMonitoringController {
  constructor(private readonly monitoring: ClientMonitoringService) {}

  @Public()
  @Post('client-errors')
  @HttpCode(HttpStatus.CREATED)
  async report(@Body() dto: ClientErrorDto) {
    const entry = await this.monitoring.record(dto);
    return { message: 'Error recorded', data: { id: entry.id } };
  }

  @Public()
  @Get('client-errors')
  async list(
    @Headers('x-monitor-key') headerKey: string | undefined,
    @Query('key') queryKey: string | undefined,
    @Query('limit') limit?: string,
  ) {
    this.monitoring.assertMonitorKey(headerKey || queryKey);
    const n = Math.min(Number(limit) || 50, 200);
    const data = await this.monitoring.listFromFile(n);
    return { message: 'Client errors', data };
  }
}
