import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto } from './dto';
import { Auth, CurrentUser, Public } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { message: MESSAGES.LOGIN_SUCCESS, data: result };
  }

  @Public()
  @UseGuards(AuthGuard('jwt-refresh'))
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@CurrentUser('id') userId: string, @Body() dto: RefreshTokenDto) {
    const tokens = await this.authService.refreshTokens(userId, dto.refreshToken);
    return { message: MESSAGES.TOKEN_REFRESHED, data: tokens };
  }

  @Auth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser('id') userId: string) {
    await this.authService.logout(userId);
    return { message: MESSAGES.LOGOUT_SUCCESS, data: null };
  }

  @Auth()
  @Get('me')
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.authService.getMe(userId);
    return { message: MESSAGES.FETCHED('Profile'), data: user };
  }
}
