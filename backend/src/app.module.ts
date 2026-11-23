import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { environmentSchema } from './platform/config/environment.schema.js';
import { AuditModule } from './shared/audit/audit.module.js';
import { CatalogModule } from './shared/catalog/catalog.module.js';
import { createPostgresOptions } from './platform/database/postgres-options.js';
import { HealthModule } from './platform/health/health.module.js';
import { IdentityModule } from './modules/identity/identity.module.js';
import { LogisticsModule } from './modules/logistics-costs/logistics/logistics.module.js';
import { ReceptionModule } from './modules/reception-and-purchases/reception/reception.module.js';
import { PurchaseModule } from './modules/reception-and-purchases/purchase/purchase.module.js';
import { AccountsModule } from './modules/accounts/accounts.module.js';
import { SalesModule } from './modules/sales/sales.module.js';
import { ReportsModule } from './modules/reports-and-analytics/reports/reports.module.js';
import { AnalyticsModule } from './modules/reports-and-analytics/analytics/analytics.module.js';
import { StowageModule } from './modules/logistics-costs/stowage/stowage.module.js';
import { ReceiptsModule } from './modules/documents/receipts.module.js';
import { OperationsModule } from './shared/operations/operations.module.js';
import { FreightModule } from './modules/logistics-costs/freight/freight.module.js';
import { MessagingModule } from './modules/messaging/messaging.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: environmentSchema,
    }),
    AuditModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ...createPostgresOptions({
          connectTimeoutMs: config.getOrThrow<number>(
            'DATABASE_CONNECT_TIMEOUT_MS',
          ),
          database: config.getOrThrow<string>('DATABASE_NAME'),
          host: config.getOrThrow<string>('DATABASE_HOST'),
          logging: config.get<string>('NODE_ENV') === 'development',
          password: config.getOrThrow<string>('DATABASE_PASSWORD'),
          poolSize: config.getOrThrow<number>('DATABASE_POOL_SIZE'),
          port: config.getOrThrow<number>('DATABASE_PORT'),
          ssl: config.getOrThrow<boolean>('DATABASE_SSL'),
          sslCa: config.get<string>('DATABASE_SSL_CA'),
          sslRejectUnauthorized: config.getOrThrow<boolean>(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          ),
          username: config.getOrThrow<string>('DATABASE_USER'),
        }),
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          limit: config.getOrThrow<number>('THROTTLE_LIMIT'),
          ttl: seconds(60),
        },
      ],
    }),
    HealthModule,
    IdentityModule,
    CatalogModule,
    LogisticsModule,
    ReceptionModule,
    PurchaseModule,
    AccountsModule,
    SalesModule,
    ReportsModule,
    AnalyticsModule,
    StowageModule,
    ReceiptsModule,
    OperationsModule,
    FreightModule,
    MessagingModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
