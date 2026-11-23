import { Module } from '@nestjs/common';

import { IdentityModule } from '../../modules/identity/identity.module.js';
import { InventoryController } from './inventory.controller.js';

// Inventory is not part of the system (CL-12). Only the retired routes remain,
// answering 410; the tables keep their historical rows (T1707).
@Module({
  controllers: [InventoryController],
  imports: [IdentityModule],
})
export class InventoryModule {}
