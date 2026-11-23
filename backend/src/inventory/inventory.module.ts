import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { IdentityModule } from '../identity/identity.module.js';
import { InventoryLotValuationEntity } from './entities/inventory-lot-valuation.entity.js';
import { InventoryLotEntity } from './entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from './entities/inventory-movement.entity.js';
import { InventoryController } from './inventory.controller.js';

// Inventory is not part of the system (CL-12). Only the retired routes remain,
// answering 410; the tables keep their historical rows (T1707). The entities
// are registered here, and only here, so TypeORM still knows them (spec 021).
@Module({
  controllers: [InventoryController],
  imports: [
    IdentityModule,
    TypeOrmModule.forFeature([
      InventoryLotEntity,
      InventoryMovementEntity,
      InventoryLotValuationEntity,
    ]),
  ],
})
export class InventoryModule {}
