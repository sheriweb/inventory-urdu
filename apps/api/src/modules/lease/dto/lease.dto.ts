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
  ValidateNested,
} from 'class-validator';

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

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  installmentAmount!: number;

  @IsEnum(InstallmentFrequency)
  frequency!: InstallmentFrequency;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateLeaseItemDto)
  items!: CreateLeaseItemDto[];
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
  @IsUUID()
  salesmanId?: string | null;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string | null;

  @IsOptional()
  @IsUUID()
  outdoorManId?: string | null;

  @IsOptional()
  @IsString()
  note?: string | null;

  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;
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
