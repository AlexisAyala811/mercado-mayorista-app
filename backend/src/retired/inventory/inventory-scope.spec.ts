import { GoneException } from '@nestjs/common';
import { InventoryController } from './inventory.controller.js';
it.each(['lots', 'lot', 'movements', 'adjust'] as const)(
  'retires inventory route %s without invoking an inventory service',
  (method) => {
    expect(() => new InventoryController()[method]()).toThrow(GoneException);
  },
);
