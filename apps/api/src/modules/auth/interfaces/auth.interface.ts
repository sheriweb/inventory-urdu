import { UserRole } from '@prisma/client';

export interface IJwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  shopId?: string | null;
}

export interface IAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface IAuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    shopId?: string | null;
  };
  tokens: IAuthTokens;
}
