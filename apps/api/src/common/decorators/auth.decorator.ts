import { applyDecorators, UseGuards } from '@nestjs/common';
import { UserRole } from '@inventory-urdu/shared';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';

export function Auth(...roles: UserRole[]) {
  if (roles.length > 0) {
    return applyDecorators(Roles(...roles), UseGuards(JwtAuthGuard, RolesGuard));
  }
  return applyDecorators(UseGuards(JwtAuthGuard));
}
