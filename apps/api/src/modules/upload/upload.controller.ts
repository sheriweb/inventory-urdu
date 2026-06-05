import { Body, Controller, Post } from '@nestjs/common';
import { AuthUser, UserRole } from '@inventory-urdu/shared';
import { Auth, CurrentUser } from '../../common/decorators';
import { MESSAGES } from '../../common/constants';
import { UploadImageDto } from './dto';
import { UploadService } from './upload.service';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @Auth(UserRole.SHOP_OWNER, UserRole.OPERATOR, UserRole.SALESMAN, UserRole.RECOVERY_MAN)
  async uploadImage(@CurrentUser() user: AuthUser, @Body() dto: UploadImageDto) {
    const data = await this.uploadService.saveImage(user, dto);
    return { message: MESSAGES.CREATED('Image'), data };
  }
}
