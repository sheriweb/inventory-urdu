import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  ping() {
    return { ok: true, service: 'inventory-urdu-api' };
  }
}
