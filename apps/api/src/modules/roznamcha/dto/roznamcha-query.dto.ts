import { IsDateString, IsOptional } from 'class-validator';

export class RoznamchaDateRangeDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class RoznamchaDailyBalanceDto {
  @IsOptional()
  @IsDateString()
  date?: string;
}
