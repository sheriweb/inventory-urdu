import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.service';

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return '(not set)';
  // mysql://user:pass@host:port/db → hide password only
  return url.replace(/(:\/\/[^:]+:)[^@]*(@)/, '$1***$2');
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  ping() {
    return { ok: true, service: 'inventory-urdu-api' };
  }

  @Public()
  @Get('db')
  async db() {
    const databaseUrl = maskDatabaseUrl(process.env.DATABASE_URL);
    try {
      await this.prisma.ensureConnected();
      await this.prisma.$queryRaw`SELECT 1`;
      const users = await this.prisma.user.count();
      return { ok: true, databaseUrl, users };
    } catch (err) {
      const e = err as Error & { code?: string };
      return {
        ok: false,
        databaseUrl,
        errorName: e?.name,
        errorCode: e?.code,
        message: String(e?.message || e).slice(0, 600),
      };
    }
  }
}
