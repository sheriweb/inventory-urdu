import { Type } from 'class-transformer';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  recoveryManId?: string;

  @IsOptional()
  @IsUUID()
  salesmanId?: string;

  @IsOptional()
  @IsUUID()
  outdoorManId?: string;
}

export class AccountsQueryDto extends DateRangeQueryDto {
  @IsOptional()
  search?: string;

  @IsOptional()
  status?: string;
}
