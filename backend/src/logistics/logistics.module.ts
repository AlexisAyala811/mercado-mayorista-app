import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityModule } from '../identity/identity.module.js';
import { CarrierEntity } from './entities/carrier.entity.js';
import { VehicleEntity } from './entities/vehicle.entity.js';
import { LogisticsController } from './logistics.controller.js';
import { LogisticsService } from './logistics.service.js';

@Module({
  controllers: [LogisticsController],
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([CarrierEntity, VehicleEntity]),
  ],
  providers: [LogisticsService],
})
export class LogisticsModule {}
