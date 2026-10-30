import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AccountEntity } from '../accounts/entities/account.entity.js';
import { AccountInstallmentEntity } from '../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { IdentityModule } from '../identity/identity.module.js';
import { InventoryLotEntity } from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { InventoryLotValuationEntity } from '../inventory/entities/inventory-lot-valuation.entity.js';
import { VehicleEntity } from '../logistics/entities/vehicle.entity.js';
import { SaleEntity } from './entities/sale.entity.js';
import { SaleLineEntity } from './entities/sale-line.entity.js';
import { SaleLineCostEntity } from './entities/sale-line-cost.entity.js';
import { SaleReturnEntity } from './entities/sale-return.entity.js';
import { SaleReturnLineEntity } from './entities/sale-return-line.entity.js';
import { ReceiptDocumentEntity } from '../receipts/receipt-document.entity.js';
import { ReceiptsModule } from '../receipts/receipts.module.js';
import { SaleReturnsService } from './sale-returns.service.js';
import { SalesController } from './sales.controller.js';
import { SalesService } from './sales.service.js';

@Module({
  controllers: [SalesController],
  imports: [
    AuditModule,
    IdentityModule,
    ReceiptsModule,
    TypeOrmModule.forFeature([
      SaleEntity,
      SaleLineEntity,
      BuyerEntity,
      VehicleEntity,
      InventoryLotEntity,
      InventoryMovementEntity,
      InventoryLotValuationEntity,
      AccountEntity,
      AccountInstallmentEntity,
      AccountPaymentEntity,
      CashMovementEntity,
      SaleLineCostEntity,
      SaleReturnEntity,
      SaleReturnLineEntity,
      ReceiptDocumentEntity,
    ]),
  ],
  providers: [SalesService, SaleReturnsService],
})
export class SalesModule {}
