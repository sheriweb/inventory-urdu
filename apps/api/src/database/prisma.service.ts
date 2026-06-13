import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

function buildAdapterConfig(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    socketPath: parsed.searchParams.get('socket') || undefined,
    // Shared hosting is sensitive to thread/process pressure, so keep the
    // DB pool to a single connection per app process.
    connectionLimit: 1,
    minimumIdle: 0,
  };
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  constructor() {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not set');
    }
    const adapter = new PrismaMariaDb(buildAdapterConfig(url));
    super({ adapter });
  }

  async ensureConnected() {
    if (!this.connected) {
      await this.$connect();
      this.connected = true;
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
