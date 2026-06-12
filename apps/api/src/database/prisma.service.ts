import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  constructor() {
    super();
    // A panicked query engine never recovers; exit so the watchdog in
    // server.js relaunches a fresh API process within ~30s.
    this.$use(async (params, next) => {
      try {
        return await next(params);
      } catch (err) {
        const message = String((err as Error)?.message || err);
        if (message.includes('PANIC') || message.includes('timer has gone away')) {
          console.error('Prisma engine panic detected — exiting for watchdog restart:', message);
          setTimeout(() => process.exit(1), 250).unref();
        }
        throw err;
      }
    });
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
