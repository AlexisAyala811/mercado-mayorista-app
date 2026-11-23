import { SaleReturnEntity } from '../../modules/sales/entities/sale-return.entity.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountPaymentEntity } from '../../modules/accounts/entities/account-payment.entity.js';
import { FreightSettlementEntity } from '../../modules/logistics-costs/freight/entities/freight-settlement.entity.js';
import { IdentityModule } from '../../modules/identity/identity.module.js';
import { InventoryMovementEntity } from '../../retired/inventory/entities/inventory-movement.entity.js';
import { PurchaseSettlementEntity } from '../../modules/reception-and-purchases/purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../../modules/reception-and-purchases/reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../../modules/reception-and-purchases/reception/entities/reception.entity.js';
import { SaleEntity } from '../../modules/sales/entities/sale.entity.js';
import { StowageEntryEntity } from '../../modules/logistics-costs/stowage/entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from '../../modules/logistics-costs/stowage/entities/stowage-settlement.entity.js';
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
