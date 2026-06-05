import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { ClaimType } from '@prisma/client';

export class CreateClaimDto {
  @IsEnum(ClaimType)
  type!: ClaimType;

  @IsUUID()
  itemId!: string;

  @IsOptional()
  @IsUUID()
  staffId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsDateString()
  claimDate?: string;
}

export class ClaimsQueryDto {
  @IsOptional()
  @IsEnum(ClaimType)
  type?: ClaimType;
}
