import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import { FreightSettlementEntity } from '../freight/entities/freight-settlement.entity.js';
import { IdentityModule } from '../identity/identity.module.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { StowageEntryEntity } from '../stowage/entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from '../stowage/entities/stowage-settlement.entity.js';
import { OperationsController } from './operations.controller.js';
import { OperationsService } from './operations.service.js';

@Module({
  controllers: [OperationsController],
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([
      ReceptionEntity,
      ReceptionSackEntity,
      PurchaseSettlementEntity,
      SaleEntity,
      SaleReturnEntity,
      AccountPaymentEntity,
      InventoryMovementEntity,
      StowageEntryEntity,
      StowageSettlementEntity,
      FreightSettlementEntity,
    ]),
  ],
  providers: [OperationsService],
})
export class OperationsModule {}
