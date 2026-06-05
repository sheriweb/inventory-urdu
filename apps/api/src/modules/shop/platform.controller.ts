import { Controller, Get, Patch, Body } from '@nestjs/common';
import { UserRole } from '@inventory-urdu/shared';
import { Auth } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { UpdatePlatformSettingsDto } from './dto';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('platform')
@Auth(UserRole.SUPER_ADMIN)
export class PlatformController {
  constructor(private readonly platformSettings: PlatformSettingsService) {}

  @Get('settings')
  async getSettings() {
    const data = await this.platformSettings.getSettings();
    return { message: MESSAGES.FETCHED('Platform settings'), data };
  }

  @Patch('settings')
  async updateSettings(@Body() dto: UpdatePlatformSettingsDto) {
    const data = await this.platformSettings.updateSettings(dto);
    return { message: MESSAGES.UPDATED('Platform settings'), data };
  }
}
