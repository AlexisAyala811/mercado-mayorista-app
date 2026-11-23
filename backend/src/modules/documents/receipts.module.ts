import {ReceiptHistoryService} from './receipt-history.service.js';
import {ReceiptHistoryController} from './receipt-history.controller.js';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BuyerEntity } from '../../shared/catalog/entities/buyer.entity.js';
import { PotatoVarietyEntity } from '../../shared/catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../../shared/catalog/entities/provider.entity.js';
import { BusinessEntity } from '../identity/entities/business.entity.js';
import { IdentityModule } from '../identity/identity.module.js';
import { PurchaseSettlementEntity } from '../reception-and-purchases/purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../reception-and-purchases/reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../reception-and-purchases/reception/entities/reception.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { SaleReturnLineEntity } from '../sales/entities/sale-return-line.entity.js';
import { BuyerStatementController } from './buyer-statement/buyer-statement.controller.js';
import { BuyerStatementService } from './buyer-statement/buyer-statement.service.js';
import { ReceiptsController } from './receipts.controller.js';
import { ReceiptsService } from './receipts.service.js';
import { ReceiptDocumentEntity } from './receipt-document.entity.js';

@Module({
  controllers: [ReceiptsController, ReceiptHistoryController, BuyerStatementController],
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
      BuyerEntity,
      ReceiptDocumentEntity,
    ]),
  ],
  providers: [ReceiptsService, ReceiptHistoryService, BuyerStatementService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
