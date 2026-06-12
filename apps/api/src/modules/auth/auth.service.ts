import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { comparePassword, hashPassword } from '../../common/utils';
import { MESSAGES } from '../../common/constants';
import { isMissingColumnError } from '../../common/utils/prisma-errors';
import { LoginDto, RefreshTokenDto, UpdateAccountDto } from './dto';
import { IAuthResponse, IAuthTokens, IJwtPayload } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<IAuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !(await comparePassword(dto.password, user.password))) {
      throw new UnauthorizedException(MESSAGES.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new UnauthorizedException(MESSAGES.ACCOUNT_DISABLED);
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshToken: await hashPassword(tokens.refreshToken),
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`Login: ${user.email}`);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        shopId: user.shopId,
      },
      tokens,
    };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<IAuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshToken) throw new UnauthorizedException(MESSAGES.TOKEN_INVALID);

    const valid = await comparePassword(refreshToken, user.refreshToken);
    if (!valid) throw new UnauthorizedException(MESSAGES.TOKEN_INVALID);

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        shopId: user.shopId,
      },
      {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '365d'),
      },
    );

    return { accessToken, refreshToken };
  }

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  async getMe(userId: string) {
    const baseSelect = {
      id: true,
      email: true,
      name: true,
      role: true,
      shopId: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      shop: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          phone: true,
          mobile: true,
          email: true,
          address: true,
          city: true,
          description: true,
          brandColor: true,
          romanUrduEnabled: true,
        },
      },
    } as const;

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: baseSelect,
      });
      if (!user) throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
      return user;
    } catch (err) {
      if (!isMissingColumnError(err, 'romanUrduEnabled')) throw err;
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          shopId: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          shop: {
            select: {
              id: true,
              name: true,
              logoUrl: true,
              phone: true,
              mobile: true,
              email: true,
              address: true,
              city: true,
              description: true,
              brandColor: true,
            },
          },
        },
      });
      if (!user) throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);
      return {
        ...user,
        shop: user.shop ? { ...user.shop, romanUrduEnabled: false } : user.shop,
      };
    }
  }

  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException(MESSAGES.UNAUTHORIZED);

    const nextName = dto.name?.trim();
    const nextEmail = dto.email?.trim().toLowerCase();
    const nextPassword = dto.newPassword?.trim();

    if (!nextName && !nextEmail && !nextPassword) {
      throw new BadRequestException('کوئی تبدیلی نہیں');
    }

    if ((nextEmail && nextEmail !== user.email) || nextPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('موجودہ پاس ورڈ درج کریں');
      }
      const valid = await comparePassword(dto.currentPassword, user.password);
      if (!valid) throw new UnauthorizedException('موجودہ پاس ورڈ غلط ہے');
    }

    const data: { name?: string; email?: string; password?: string; refreshToken?: null } = {};
    if (nextName) data.name = nextName;
    if (nextEmail && nextEmail !== user.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: nextEmail } });
      if (taken && taken.id !== userId) {
        throw new ConflictException('یہ ای میل پہلے سے استعمال میں ہے');
      }
      data.email = nextEmail;
    }
    if (nextPassword) {
      data.password = await hashPassword(nextPassword);
      data.refreshToken = null;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        shopId: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    this.logger.log(`Account updated: ${updated.email}`);
    return updated;
  }

  private async generateTokens(payload: IJwtPayload): Promise<IAuthTokens> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '365d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '3650d'),
      }),
    ]);
    return { accessToken, refreshToken };
  }
}
