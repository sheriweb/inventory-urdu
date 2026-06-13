import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Keep the connection pool small and the timeouts bounded. Shared hosting
// (Hostinger/CloudLinux) is very sensitive to connection/process pressure, so
// we cap the pool and fail fast instead of hanging forever on a stuck pool.
function withPoolParams(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '3');
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '20');
    }
    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', process.env.DB_CONNECT_TIMEOUT || '15');
    }
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;
  private readonly databaseUrl: string;

  constructor() {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error('DATABASE_URL is not set');
    }
    const url = withPoolParams(raw);
    super({
      datasources: { db: { url } },
      log: ['warn', 'error'],
    });
    this.databaseUrl = url;
  }

  async ensureConnected() {
    if (this.connected) {
      return;
    }
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
