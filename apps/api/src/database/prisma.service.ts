import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

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
