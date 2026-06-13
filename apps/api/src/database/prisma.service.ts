import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

function buildAdapterConfig(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const socketPath = parsed.searchParams.get('socket') || undefined;
  const host = parsed.hostname === 'localhost' && !socketPath ? '127.0.0.1' : parsed.hostname;
  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    socketPath,
    // Shared hosting is sensitive to thread/process pressure, so keep the
    // DB pool to a single connection per app process.
    connectionLimit: 1,
    minimumIdle: 0,
    acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 20_000),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10_000),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_SECONDS || 300),
    allowPublicKeyRetrieval: true,
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;
  private readonly databaseUrl: string;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaMariaDb(buildAdapterConfig(url), {
      onConnectionError: (err) => {
        const details = {
          message: err?.message,
          code: (err as { code?: string })?.code,
          errno: (err as { errno?: number })?.errno,
          sqlState: (err as { sqlState?: string })?.sqlState,
          fatal: (err as { fatal?: boolean })?.fatal,
        };
        console.error('Prisma MariaDB connection error:', details);
      },
    });
    super({ adapter });
    this.databaseUrl = url;
  }

  async ensureConnected() {
    if (!this.connected) {
      try {
        await this.$connect();
        this.connected = true;
      } catch (err) {
        const cause = (err as { cause?: unknown })?.cause;
        const details = cause && typeof cause === 'object' ? JSON.stringify(cause) : String(cause || '');
        console.error('Prisma connect failed:', {
          databaseUrl: this.databaseUrl.replace(/(:\/\/[^:]+:)[^@]*(@)/, '$1***$2'),
          message: (err as Error)?.message || String(err),
          cause: details,
        });
        throw err;
      }
    }
  }

  async onModuleInit() {
    if (process.env.LAZY_DB_CONNECT === '1' || process.env.HOSTINGER_COMBINED === '1') {
      return;
    }
    await this.ensureConnected();
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}
