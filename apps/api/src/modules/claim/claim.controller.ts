import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { ClaimsQueryDto, CreateClaimDto } from './dto';
import { ClaimService } from './claim.service';

const CLAIM_ROLES = [UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.SALESMAN] as const;

@Controller('claims')
export class ClaimController {
  constructor(private readonly claimService: ClaimService) {}

  @Post()
  @Auth(...CLAIM_ROLES)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateClaimDto) {
    const data = await this.claimService.create(user, dto);
    return { message: MESSAGES.CREATED('Claim'), data };
  }

  @Get()
  @Auth(...CLAIM_ROLES)
  async list(@CurrentUser() user: AuthUser, @Query() query: ClaimsQueryDto) {
    const data = await this.claimService.findAll(user, query);
    return { message: MESSAGES.LIST_FETCHED('Claim'), data };
  }

  @Delete(':id')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    await this.claimService.remove(user, id);
    return { message: MESSAGES.DELETED('Claim') };
  }
}
