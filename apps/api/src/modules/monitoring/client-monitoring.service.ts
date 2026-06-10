import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, mkdir, readFile } from 'fs/promises';
import { dirname } from 'path';
import { ClientErrorDto } from './dto/client-error.dto';

export type StoredClientError = ClientErrorDto & {
  id: string;
  at: string;
};

const MAX_MEMORY = 200;

@Injectable()
export class ClientMonitoringService {
  private readonly logger = new Logger('ClientError');
  private readonly memory: StoredClientError[] = [];

  constructor(private readonly configService: ConfigService) {}

  private logPath(): string {
    return (
      this.configService.get<string>('CLIENT_ERROR_LOG') ||
      `${process.cwd()}/../../.demo/client-errors.jsonl`
    );
  }

  private monitorKey(): string {
    return this.configService.get<string>('CLIENT_MONITOR_KEY') || 'demo-monitor';
  }

  assertMonitorKey(key?: string) {
    if (!key || key !== this.monitorKey()) {
      throw new UnauthorizedException('Invalid monitor key');
    }
  }

  async record(dto: ClientErrorDto): Promise<StoredClientError> {
    const entry: StoredClientError = {
      ...dto,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
      level: dto.level || 'error',
    };

    this.memory.unshift(entry);
    if (this.memory.length > MAX_MEMORY) this.memory.length = MAX_MEMORY;

    const path = this.logPath();
    await mkdir(dirname(path), { recursive: true });
    await appendFile(path, `${JSON.stringify(entry)}\n`, 'utf8');

    const who = entry.userEmail || 'guest';
    const where = entry.url || '-';
    this.logger.error(
      `[${entry.type}] ${who} @ ${where}\n  → ${entry.message}${entry.stack ? `\n  ${entry.stack.split('\n').slice(0, 3).join('\n  ')}` : ''}`,
    );

    return entry;
  }

  listRecent(limit = 50): StoredClientError[] {
    return this.memory.slice(0, Math.min(limit, MAX_MEMORY));
  }

  async listFromFile(limit = 50): Promise<StoredClientError[]> {
    const path = this.logPath();
    try {
      const raw = await readFile(path, 'utf8');
      return raw
        .trim()
        .split('\n')
        .filter(Boolean)
        .slice(-limit)
        .reverse()
        .map((line) => JSON.parse(line) as StoredClientError);
    } catch {
      return this.listRecent(limit);
    }
  }
}
