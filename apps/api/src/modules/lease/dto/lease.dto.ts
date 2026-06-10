import { InstallmentFrequency, LeaseStatus } from '@inventory-urdu/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
  IsObject,
} from 'class-validator';

export class LeaseItemDetailFieldDto {
  @IsString()
  @IsNotEmpty()
  label!: string;

  @IsString()
  value!: string;
}

export class LeaseItemUnitDetailDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  unitIndex!: number;

  @IsOptional()
  @IsObject()
  values?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseItemDetailFieldDto)
  fields?: LeaseItemDetailFieldDto[];
}

export class CreateLeaseItemDto {
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @IsString()
  @IsNotEmpty()
  itemName!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LeaseItemUnitDetailDto)
  unitDetails?: LeaseItemUnitDetailDto[];
}

export class CreateLeaseInstallmentRowDto {
  @IsDateString()
  dueDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  scheduledAmount!: number;
}

export class CreateLeaseAccountDto {
  @IsDateString()
  accountDate!: string;

  @IsUUID()
  customerId!: string;

  @IsOptional()
  @IsUUID()
  salesmanId?: string;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string;

  @IsOptional()
  @IsUUID()
  outdoorManId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  advanceAmount!: number;

  @ValidateIf((dto: CreateLeaseAccountDto) => !dto.installments?.length)
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  installmentAmount?: number;

  @IsEnum(InstallmentFrequency)
  frequency!: InstallmentFrequency;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLeaseInstallmentRowDto)
  installments?: CreateLeaseInstallmentRowDto[];

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLeaseItemDto)
  items!: CreateLeaseItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receiptNumber?: number;
}

export class AccountsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class UpdateLeaseAccountDto {
  @IsOptional()
  @IsDateString()
  accountDate?: string;

  @IsOptional()
  @IsUUID()
  salesmanId?: string | null;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string | null;

  @IsOptional()
  @IsUUID()
  outdoorManId?: string | null;

  @IsOptional()
  @IsEnum(InstallmentFrequency)
  frequency?: InstallmentFrequency;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  currentInstallmentAmount?: number;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  accountNumber?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  receiptNumber?: number;
}

export class DiscountLeaseDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
