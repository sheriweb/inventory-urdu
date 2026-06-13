import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

type BootstrapOptions = {
  adapter?: ExpressAdapter;
  listen?: boolean;
  port?: number;
  logger?: Pick<Console, 'log' | 'error'>;
};

export async function bootstrap(options: BootstrapOptions = {}) {
  const app = options.adapter
    ? await NestFactory.create<NestExpressApplication>(AppModule, options.adapter)
    : await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  const apiPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  app.useBodyParser('json', { limit: '12mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '12mb' });

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: `/${apiPrefix}/uploads/`,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = options.port ?? configService.get<number>('app.port') ?? 4001;
  if (options.listen === false) {
    await app.init();
    (options.logger ?? console).log(`Inventory Urdu API mounted at /${apiPrefix}`);
  } else {
    await app.listen(port);
    (options.logger ?? console).log(`Inventory Urdu API listening on http://localhost:${port}/${apiPrefix}`);
  }
  return app;
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
