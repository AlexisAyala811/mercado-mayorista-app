import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { FreightEntryEntity } from './entities/freight-entry.entity.js';
import { FreightSettlementEntity } from './entities/freight-settlement.entity.js';
import { FreightController } from './freight.controller.js';
import { FreightService } from './freight.service.js';

@Module({
  controllers: [FreightController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      FreightEntryEntity,
      FreightSettlementEntity,
      CashMovementEntity,
    ]),
  ],
  providers: [FreightService],
})
export class FreightModule {}
