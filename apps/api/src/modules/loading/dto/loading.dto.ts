import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class LoadingAssignDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  staffId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  movementDate?: string;
}

export class LoadingUnloadDto {
  @IsUUID()
  itemId!: string;

  @IsUUID()
  staffId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  movementDate?: string;
}

export class SalesmanInventoryQueryDto {
  @IsOptional()
  @IsUUID()
  staffId?: string;
}
