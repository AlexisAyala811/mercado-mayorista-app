import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { seconds, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { environmentSchema } from './config/environment.schema.js';
import { AuditModule } from './audit/audit.module.js';
import { CatalogModule } from './catalog/catalog.module.js';
import { createPostgresOptions } from './database/postgres-options.js';
import { HealthModule } from './health/health.module.js';
import { IdentityModule } from './identity/identity.module.js';
import { LogisticsModule } from './logistics/logistics.module.js';
import { ReceptionModule } from './reception/reception.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PurchaseModule } from './purchase/purchase.module.js';
import { AccountsModule } from './accounts/accounts.module.js';
import { SalesModule } from './sales/sales.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { StowageModule } from './stowage/stowage.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { FreightModule } from './freight/freight.module.js';
import { MessagingModule } from './messaging/messaging.module.js';

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
          sslRejectUnauthorized: config.getOrThrow<boolean>(
            'DATABASE_SSL_REJECT_UNAUTHORIZED',
          ),
          username: config.getOrThrow<string>('DATABASE_USER'),
        }),
        autoLoadEntities: true,
      }),
    }),
    ThrottlerModule.forRoot([{ limit: 100, ttl: seconds(60) }]),
    HealthModule,
    IdentityModule,
    CatalogModule,
    LogisticsModule,
    ReceptionModule,
    PurchaseModule,
    InventoryModule,
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
