import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthUser } from '@inventory-urdu/shared';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { requireShopId } from '../../common/utils';
import { UploadImageDto } from './dto';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/pjpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function resolveExtension(mime: string, filename?: string): string | null {
  const fromMime = MIME_TO_EXT[mime.toLowerCase()];
  if (fromMime) return fromMime;

  const fromName = extname(filename ?? '').toLowerCase();
  if (fromName === '.jpeg') return '.jpg';
  if (ALLOWED_EXT.has(fromName)) return fromName === '.jpeg' ? '.jpg' : fromName;

  return null;
}

@Injectable()
export class UploadService {
  private readonly uploadRoot: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadRoot = join(process.cwd(), 'uploads');
  }

  async saveImage(user: AuthUser, dto: UploadImageDto) {
    const shopId = requireShopId(user);
    const match = dto.data.match(/^data:([\w/+.-]+);base64,(.+)$/s);
    if (!match) {
      throw new BadRequestException('صرف تصویر فائل اپ لوڈ کریں');
    }

    const mime = match[1];
    const base64 = match[2];
    const ext = resolveExtension(mime, dto.filename);
    if (!ext) {
      throw new BadRequestException('jpg، png، webp یا gif تصویر استعمال کریں');
    }

    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length > MAX_BYTES) {
      throw new BadRequestException('تصویر 5MB سے چھوٹی ہونی چاہیے');
    }

    const shopDir = join(this.uploadRoot, shopId);
    await mkdir(shopDir, { recursive: true });

    const filename = `${randomUUID()}${ext}`;
    await writeFile(join(shopDir, filename), buffer);

    const apiPrefix = this.configService.get<string>('app.apiPrefix') ?? 'api/v1';
    const url = `/${apiPrefix}/uploads/${shopId}/${filename}`;
    return { url, filename };
  }
}
