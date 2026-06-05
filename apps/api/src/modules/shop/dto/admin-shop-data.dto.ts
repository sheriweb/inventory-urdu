import { Type } from 'class-transformer';
import { IsEnum, IsOptional } from 'class-validator';
import { LeaseStatus } from '@prisma/client';
import { ListQueryDto } from '../../../common/dto/list-query.dto';

export class AdminShopDataQueryDto extends ListQueryDto {
  @IsOptional()
  @IsEnum(LeaseStatus)
  status?: LeaseStatus;
}
