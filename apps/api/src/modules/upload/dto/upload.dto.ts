import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @IsString()
  @IsNotEmpty()
  data!: string;

  @IsOptional()
  @IsString()
  filename?: string;
}
