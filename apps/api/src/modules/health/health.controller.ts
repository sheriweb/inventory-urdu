import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PrismaService } from '../../database/prisma.service';

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return '(not set)';
  // mysql://user:pass@host:port/db → hide password only
  return url.replace(/(:\/\/[^:]+:)[^@]*(@)/, '$1***$2');
}

// The MariaDB driver attaches the *real* connection failure as a nested
// `cause`, while Prisma only surfaces a generic "pool timeout". Walk the chain
// so the actual reason (auth, host blocked, RSA key, socket timeout) shows up.
function collectCauses(err: unknown, depth = 0): string[] {
  if (!err || depth > 6) return [];
  const e = err as { message?: string; code?: string; errno?: number; sqlState?: string; cause?: unknown };
  const parts = [e.message || String(err), e.code, e.errno != null ? `errno=${e.errno}` : '', e.sqlState ? `sqlState=${e.sqlState}` : '']
    .filter(Boolean)
    .join(' | ');
  return [parts, ...collectCauses(e.cause, depth + 1)];
}

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  ping() {
    return { ok: true, service: 'inventory-urdu-api' };
  }

  // TEMP diagnostic: bypass Prisma and hit MySQL with the raw mariadb driver
  // using several connection variants, so the *exact* failure reason is
  // visible remotely (the Prisma pool only reports a generic "pool timeout").
  @Public()
  @Get('db-raw')
  async dbRaw() {
    const url = process.env.DATABASE_URL || '';
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch (e) {
      return { ok: false, stage: 'parse-url', error: String(e) };
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mariadb: any;
    try {
      mariadb = await import('mariadb');
    } catch (e) {
      return { ok: false, stage: 'import-mariadb', error: String(e) };
    }

    const base = {
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
      port: parsed.port ? Number(parsed.port) : 3306,
      connectTimeout: 6000,
      allowPublicKeyRetrieval: true,
    };

    const variants: Array<{ name: string; cfg: Record<string, unknown> }> = [
      { name: 'tcp-127.0.0.1', cfg: { ...base, host: '127.0.0.1' } },
      { name: 'tcp-localhost', cfg: { ...base, host: 'localhost' } },
      { name: 'tcp-127-ssl', cfg: { ...base, host: '127.0.0.1', ssl: { rejectUnauthorized: false } } },
      { name: 'socket-run-mysqld', cfg: { ...base, socketPath: '/run/mysqld/mysqld.sock' } },
      { name: 'socket-var-lib', cfg: { ...base, socketPath: '/var/lib/mysql/mysql.sock' } },
      { name: 'socket-tmp', cfg: { ...base, socketPath: '/tmp/mysql.sock' } },
    ];

    const results: Array<Record<string, unknown>> = [];
    for (const v of variants) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let conn: any;
      const started = Date.now();
      try {
        conn = await mariadb.createConnection(v.cfg);
        const rows = await conn.query('SELECT 1 as v');
        results.push({ variant: v.name, ok: true, ms: Date.now() - started, rows });
      } catch (e) {
        const err = e as { message?: string; code?: string; errno?: number; sqlState?: string };
        results.push({
          variant: v.name,
          ok: false,
          ms: Date.now() - started,
          message: String(err?.message || e).slice(0, 300),
          code: err?.code,
          errno: err?.errno,
          sqlState: err?.sqlState,
        });
      } finally {
        if (conn) {
          try {
            await conn.end();
          } catch {
            /* ignore */
          }
        }
      }
    }
    return { ok: results.some((r) => r.ok), host: parsed.hostname, port: base.port, database: base.database, results };
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
        causes: collectCauses(err),
      };
    }
  }
}
