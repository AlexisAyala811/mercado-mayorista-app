import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditModule } from '../audit/audit.module.js';
import { IdentityModule } from '../identity/identity.module.js';
import { InventoryLotEntity } from './entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from './entities/inventory-movement.entity.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';

@Module({
  controllers: [InventoryController],
  imports: [
    AuditModule,
    IdentityModule,
    TypeOrmModule.forFeature([
      InventoryLotEntity,
      InventoryMovementEntity,
      SaleEntity,
      SaleLineEntity,
    ]),
  ],
  providers: [InventoryService],
})
export class InventoryModule {}
