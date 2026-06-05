import { ExpenseGroup } from '@prisma/client';
import { IsEnum, IsString, MinLength } from 'class-validator';

export class CreateExpenseAccountDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEnum(ExpenseGroup)
  group!: ExpenseGroup;
}
