import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { UpdatePlatformSettingsDto } from './dto';

function toNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value == null) return null;
  return typeof value === 'number' ? value : Number(value);
}

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private async ensureRow() {
    return this.prisma.platformSettings.upsert({
      where: { id: 'default' },
      create: { id: 'default' },
      update: {},
    });
  }

  async getSettings() {
    const row = await this.ensureRow();
    const smsApiConfigured = Boolean(
      this.configService.get<string>('SMS_API_KEY')?.trim(),
    );

    return {
      ...row,
      defaultMonthlyFeePkr: toNumber(row.defaultMonthlyFeePkr),
      smsApiConfigured,
      smsMode: row.smsAutoEnabled && smsApiConfigured
        ? 'auto'
        : 'manual_whatsapp_sms',
    };
  }

  async updateSettings(dto: UpdatePlatformSettingsDto) {
    await this.ensureRow();
    return this.prisma.platformSettings.update({
      where: { id: 'default' },
      data: {
        ...(dto.smsAutoEnabled !== undefined
          ? { smsAutoEnabled: dto.smsAutoEnabled }
          : {}),
        ...(dto.smsProvider !== undefined
          ? { smsProvider: dto.smsProvider.trim() || null }
          : {}),
        ...(dto.smsSenderId !== undefined
          ? { smsSenderId: dto.smsSenderId.trim() || null }
          : {}),
        ...(dto.defaultReminderDays !== undefined
          ? { defaultReminderDays: dto.defaultReminderDays }
          : {}),
        ...(dto.billingPlanLabel !== undefined
          ? { billingPlanLabel: dto.billingPlanLabel.trim() || null }
          : {}),
        ...(dto.billingNotes !== undefined
          ? { billingNotes: dto.billingNotes.trim() || null }
          : {}),
        ...(dto.defaultMonthlyFeePkr !== undefined
          ? { defaultMonthlyFeePkr: dto.defaultMonthlyFeePkr }
          : {}),
      },
    });
  }
}
