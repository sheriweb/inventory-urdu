import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { StaffType } from '@inventory-urdu/shared';

export class CreateStaffDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsEnum(StaffType)
  type!: StaffType;

  @IsOptional()
  @IsUUID()
  areaId?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsEnum(StaffType)
  type?: StaffType;

  @IsOptional()
  @IsUUID()
  areaId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
