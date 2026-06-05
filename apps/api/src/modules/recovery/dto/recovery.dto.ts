import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsIn,
  Max,
  Min,
} from 'class-validator';

export class RecoveryListQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string;
}

export class CollectPaymentDto {
  @IsUUID()
  leaseAccountId!: string;

  @IsUUID()
  scheduleId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CollectAdvanceDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountNumber!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class PaymentRecordsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string;
}

export class ReminderQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(14)
  daysBefore?: number;
}

export class MarkReminderSentDto {
  @IsIn(['WHATSAPP', 'SMS'])
  channel!: 'WHATSAPP' | 'SMS';
}
