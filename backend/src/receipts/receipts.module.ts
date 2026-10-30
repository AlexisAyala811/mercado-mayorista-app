import {ReceiptHistoryService} from './receipt-history.service.js';
import {ReceiptHistoryController} from './receipt-history.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../catalog/entities/provider.entity.js';
import { BusinessEntity } from '../identity/entities/business.entity.js';
import { IdentityModule } from '../identity/identity.module.js';
import { InventoryLotEntity } from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { SaleReturnLineEntity } from '../sales/entities/sale-return-line.entity.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';
import { ReceiptDocumentEntity } from './receipt-document.entity.js';

@Module({
  controllers: [ReceiptsController,ReceiptHistoryController],
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([
      BusinessEntity,
      PurchaseSettlementEntity,
      ReceptionEntity,
      ReceptionSackEntity,
      ProviderEntity,
      PotatoVarietyEntity,
      SaleEntity,
      SaleLineEntity,
      SaleReturnEntity,
      SaleReturnLineEntity,
      InventoryLotEntity,
      InventoryMovementEntity,
      BuyerEntity,
      ReceiptDocumentEntity,
    ]),
  ],
  providers: [ReceiptsService,ReceiptHistoryService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
