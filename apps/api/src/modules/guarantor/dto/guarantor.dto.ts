import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGuarantorDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  cnic?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  presentAddress?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  cnicFrontPhotoUrl?: string;

  @IsOptional()
  @IsString()
  cnicBackPhotoUrl?: string;
}

export class UpdateGuarantorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  cnic?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  presentAddress?: string;

  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @IsOptional()
  @IsString()
  cnicFrontPhotoUrl?: string;

  @IsOptional()
  @IsString()
  cnicBackPhotoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
