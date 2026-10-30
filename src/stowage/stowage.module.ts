import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { StowageEntryEntity } from './entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from './entities/stowage-settlement.entity.js';
import { WorkGroupEntity } from './entities/work-group.entity.js';
import { StowageController } from './stowage.controller.js';
import { StowageService } from './stowage.service.js';

@Module({
  controllers: [StowageController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      WorkGroupEntity,
      StowageEntryEntity,
      StowageSettlementEntity,
      CashMovementEntity,
      PurchaseSettlementEntity,
      SaleEntity,
    ]),
  ],
  providers: [StowageService],
})
export class StowageModule {}
