import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule as NestScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { appConfig, databaseConfig, jwtConfig } from './config';
import { PrismaModule } from './database/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AuthModule } from './modules/auth/auth.module';
import { ShopModule } from './modules/shop/shop.module';
import { AreaModule } from './modules/area/area.module';
import { StaffModule } from './modules/staff/staff.module';
import { CompanyModule } from './modules/company/company.module';
import { ItemModule } from './modules/item/item.module';
import { CustomerModule } from './modules/customer/customer.module';
import { GuarantorModule } from './modules/guarantor/guarantor.module';
import { LeaseModule } from './modules/lease/lease.module';
import { ScheduleModule } from './modules/schedule/schedule.module';
import { RecoveryModule } from './modules/recovery/recovery.module';
import { ReportModule } from './modules/report/report.module';
import { StockModule } from './modules/stock/stock.module';
import { LoadingModule } from './modules/loading/loading.module';
import { ClaimModule } from './modules/claim/claim.module';
import { RoznamchaModule } from './modules/roznamcha/roznamcha.module';
import { UploadModule } from './modules/upload/upload.module';
import { AutomationModule } from './modules/automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env', '../../.env'],
    }),
    NestScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ShopModule,
    AreaModule,
    StaffModule,
    CompanyModule,
    ItemModule,
    CustomerModule,
    GuarantorModule,
    LeaseModule,
    ScheduleModule,
    RecoveryModule,
    ReportModule,
    StockModule,
    LoadingModule,
    ClaimModule,
    RoznamchaModule,
    UploadModule,
    AutomationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
