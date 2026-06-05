import { IsBoolean, IsEmail, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateShopDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  ownerEmail!: string;

  @IsString()
  @MinLength(6)
  ownerPassword!: string;

  @IsString()
  @IsNotEmpty()
  ownerName!: string;
}

export class ToggleShopActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class AdminUpdateShopDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class AdminUpdateOwnerDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ResetOwnerPasswordDto {
  @IsString()
  @MinLength(6)
  newPassword!: string;
}

export class ToggleOwnerActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

export class DeleteShopDto {
  @IsString()
  @IsNotEmpty()
  confirmName!: string;
}

export class AdminShopReminderDto {
  @IsOptional()
  @IsBoolean()
  reminderEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  reminderDaysBefore?: number;

  @IsOptional()
  @IsString()
  reminderMessageTemplate?: string;
}

export class AdminShopBillingDto {
  @IsOptional()
  @IsString()
  billingPlanLabel?: string;

  @IsOptional()
  @Type(() => Number)
  monthlyFeePkr?: number;

  @IsOptional()
  @IsString()
  billingNotes?: string;
}

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsBoolean()
  smsAutoEnabled?: boolean;

  @IsOptional()
  @IsString()
  smsProvider?: string;

  @IsOptional()
  @IsString()
  smsSenderId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  defaultReminderDays?: number;

  @IsOptional()
  @IsString()
  billingPlanLabel?: string;

  @IsOptional()
  @IsString()
  billingNotes?: string;

  @IsOptional()
  @Type(() => Number)
  defaultMonthlyFeePkr?: number;
}
