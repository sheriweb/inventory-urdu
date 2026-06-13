import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

type BootstrapOptions = {
  adapter?: ExpressAdapter;
  mountPath?: string;
  listen?: boolean;
  port?: number;
  logger?: Pick<Console, 'log' | 'error'>;
};

export async function bootstrap(options: BootstrapOptions = {}) {
  const rawAdapter = options.adapter ?? new ExpressAdapter();
  const mountedExpress = options.adapter ? express() : null;
  const adapter = mountedExpress ? new ExpressAdapter(mountedExpress) : rawAdapter;
  const app = options.adapter
    ? await NestFactory.create<NestExpressApplication>(AppModule, adapter)
    : await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins = configService.get<string[]>('app.corsOrigins') ?? [];
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  });

  const configuredPrefix = configService.get<string>('app.apiPrefix') ?? 'api/v1';
  const apiPrefix = options.listen === false && options.mountPath ? '' : configuredPrefix;
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }

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
    if (mountedExpress) {
      rawAdapter.use(options.mountPath || `/${configuredPrefix}`, mountedExpress);
    }
    (options.logger ?? console).log(`Inventory Urdu API mounted at ${options.mountPath || `/${configuredPrefix}`}`);
  } else {
    await app.listen(port);
    (options.logger ?? console).log(`Inventory Urdu API listening on http://localhost:${port}/${configuredPrefix}`);
  }
  return app;
}

if (require.main === module) {
  bootstrap().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
