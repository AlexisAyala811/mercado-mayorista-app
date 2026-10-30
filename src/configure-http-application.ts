import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { ApiExceptionFilter } from './common/http/api-exception.filter.js';
import { requestContextMiddleware } from './common/http/request-context.middleware.js';

export function configureHttpApplication(app: NestExpressApplication) {
  const config = app.get(ConfigService);
  const origins = config
    .getOrThrow<string>('CORS_ORIGINS')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api/v1');
  app.useSecurityHeaders();
  app.use(requestContextMiddleware);
  app.useBodyParser('json', { limit: '100kb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '100kb' });
  app.enableShutdownHooks();
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter(app.get(HttpAdapterHost)));

  if (config.getOrThrow<boolean>('OPENAPI_ENABLED')) {
    const openApiConfig = new DocumentBuilder()
      .setTitle('Mercado API')
      .setDescription(
        'Contrato central para la gestión comercial mayorista de papa.',
      )
      .setVersion('1.0.0')
      .addBearerAuth(
        { bearerFormat: 'opaque', scheme: 'bearer', type: 'http' },
        'session',
      )
      .build();
    const documentFactory = () =>
      SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api/v1/docs', app, documentFactory, {
      jsonDocumentUrl: 'api/v1/openapi.json',
      raw: ['json'],
    });
  }
}
