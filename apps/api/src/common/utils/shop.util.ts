import { ForbiddenException } from '@nestjs/common';
import { MESSAGES } from '../constants';

export function requireShopId(user: { shopId?: string | null }): string {
  if (!user.shopId) {
    throw new ForbiddenException(MESSAGES.FORBIDDEN);
  }
  return user.shopId;
}
