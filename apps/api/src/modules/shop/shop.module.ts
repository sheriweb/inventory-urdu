import { Module } from '@nestjs/common';
import { ShopController } from './shop.controller';
import { PlatformController } from './platform.controller';
import { ShopProfileController } from './shop-profile.controller';
import { ShopService } from './shop.service';
import { PlatformSettingsService } from './platform-settings.service';

@Module({
  controllers: [ShopController, PlatformController, ShopProfileController],
  providers: [ShopService, PlatformSettingsService],
  exports: [ShopService, PlatformSettingsService],
})
export class ShopModule {}
