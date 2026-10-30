import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity.js';
import { AccountInstallmentEntity } from '../accounts/entities/account-installment.entity.js';
import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { InventoryLotEntity } from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { InventoryLotValuationEntity } from '../inventory/entities/inventory-lot-valuation.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { PurchaseSettlementEntity } from './entities/purchase-settlement.entity.js';
import { PurchaseController } from './purchase.controller.js';
import { PurchaseService } from './purchase.service.js';

@Module({
  controllers: [PurchaseController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      PurchaseSettlementEntity,
      ReceptionEntity,
      ReceptionSackEntity,
      InventoryLotEntity,
      InventoryMovementEntity,
      InventoryLotValuationEntity,
      AccountEntity,
      AccountInstallmentEntity,
      CashMovementEntity,
    ]),
  ],
  providers: [PurchaseService],
})
export class PurchaseModule {}
