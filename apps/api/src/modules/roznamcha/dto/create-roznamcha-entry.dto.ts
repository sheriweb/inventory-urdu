import { IsDateString, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateRoznamchaEntryDto {
  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsUUID()
  expenseAccountId?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expenseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recoveryAmount?: number;
}
