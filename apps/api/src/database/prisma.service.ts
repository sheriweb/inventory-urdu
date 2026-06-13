import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

function buildAdapterConfig(databaseUrl: string) {
  const parsed = new URL(databaseUrl);
  const socketPath = parsed.searchParams.get('socket') || undefined;
  // The MariaDB driver treats "localhost" as a socket on some platforms; force
  // TCP on shared hosting where the engine connects fine over 127.0.0.1.
  const host = parsed.hostname === 'localhost' && !socketPath ? '127.0.0.1' : parsed.hostname;
  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, '')),
    socketPath,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 3),
    acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 20_000),
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 15_000),
    // IMPORTANT: keep this BELOW acquireTimeout. Otherwise the pool acquire
    // times out with a generic "pool timeout" before the driver surfaces the
    // real connection failure (auth / host blocked / RSA key / socket).
    initializationTimeout: Number(process.env.DB_INIT_TIMEOUT_MS || 8_000),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_SECONDS || 300),
    // Required when MySQL 8 uses caching_sha2_password over a non-TLS socket.
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
        console.error('Prisma MariaDB connection error:', {
          message: (err as { message?: string })?.message,
          code: (err as { code?: string })?.code,
          errno: (err as { errno?: number })?.errno,
          sqlState: (err as { sqlState?: string })?.sqlState,
        });
      },
    });
    super({ adapter, log: ['warn', 'error'] });
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
      console.error('Prisma connect failed:', {
        databaseUrl: this.databaseUrl.replace(/(:\/\/[^:]+:)[^@]*(@)/, '$1***$2'),
        message: (err as Error)?.message || String(err),
        cause: serializeCause((err as { cause?: unknown })?.cause),
      });
      throw err;
    }
  }

  async onModuleInit() {
    // Don't block (or crash) boot on a slow DB. Attempt a connection in the
    // background so the real failure is logged early, but let the app come up.
    void this.ensureConnected().catch(() => {
      /* already logged in ensureConnected */
    });
  }

  async onModuleDestroy() {
    if (this.connected) {
      await this.$disconnect();
    }
  }
}

function serializeCause(cause: unknown, depth = 0): string {
  if (!cause || depth > 6) return '';
  const c = cause as { message?: string; code?: string; errno?: number; sqlState?: string; cause?: unknown };
  const head = [c.message || String(cause), c.code, c.errno != null ? `errno=${c.errno}` : '', c.sqlState ? `sqlState=${c.sqlState}` : '']
    .filter(Boolean)
    .join(' | ');
  const next = serializeCause(c.cause, depth + 1);
  return next ? `${head} -> ${next}` : head;
}
