import { SaleReturnEntity } from '../../modules/sales/entities/sale-return.entity.js';
import { NotFoundException } from '@nestjs/common';
import type { ObjectLiteral, Repository } from 'typeorm';

import type { AccountPaymentEntity } from '../../modules/accounts/entities/account-payment.entity.js';
import type { FreightSettlementEntity } from '../../modules/logistics-costs/freight/entities/freight-settlement.entity.js';
import type { InventoryMovementEntity } from '../../retired/inventory/entities/inventory-movement.entity.js';
import type { PurchaseSettlementEntity } from '../../modules/reception-and-purchases/purchase/entities/purchase-settlement.entity.js';
import type { ReceptionSackEntity } from '../../modules/reception-and-purchases/reception/entities/reception-sack.entity.js';
import type { ReceptionEntity } from '../../modules/reception-and-purchases/reception/entities/reception.entity.js';
import type { SaleEntity } from '../../modules/sales/entities/sale.entity.js';
import type { StowageEntryEntity } from '../../modules/logistics-costs/stowage/entities/stowage-entry.entity.js';
import type { StowageSettlementEntity } from '../../modules/logistics-costs/stowage/entities/stowage-settlement.entity.js';
import { OperationsService } from './operations.service.js';
import { OperationType } from './operation-query.dto.js';

function repository<T extends ObjectLiteral>(
  findOne: ReturnType<typeof jest.fn> = jest.fn().mockResolvedValue(null),
) {
  return { findOne } as unknown as Repository<T>;
}

function serviceWith(sales = repository<SaleEntity>(), returns = repository<SaleReturnEntity>()) {
  return new OperationsService(
    repository<ReceptionEntity>(),
    repository<ReceptionSackEntity>(),
    repository<PurchaseSettlementEntity>(),
    sales,
    repository<AccountPaymentEntity>(),
    repository<InventoryMovementEntity>(),
    repository<StowageEntryEntity>(),
    repository<StowageSettlementEntity>(),
    repository<FreightSettlementEntity>(),
    returns,
  );
}

describe('OperationsService', () => {
  it('recovers commercial returns only within the current business', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'return-1' });
    const service = serviceWith(repository<SaleEntity>(), repository<SaleReturnEntity>(findOne));
    await expect(service.get('business-1', 'operation-1', OperationType.SaleReturn)).resolves.toMatchObject({resourceId: 'return-1', resourceType: 'sale-return'});
    expect(findOne).toHaveBeenCalledWith({where: {businessId: 'business-1', clientOperationId: 'operation-1'}});
  });
  it('recovers a confirmed operation by client id within the current business', async () => {
    const findOne = jest.fn().mockResolvedValue({ id: 'sale-1' });
    const service = serviceWith(repository<SaleEntity>(findOne));

    await expect(
      service.get('business-1', 'operation-1', OperationType.Sale),
    ).resolves.toEqual({
      clientOperationId: 'operation-1',
      resourceId: 'sale-1',
      resourceType: 'sale',
      status: 'confirmed',
    });
    expect(findOne).toHaveBeenCalledWith({
      where: { businessId: 'business-1', clientOperationId: 'operation-1' },
    });
  });

  it('does not fabricate a result when the operation is unknown', async () => {
    await expect(
      serviceWith().get('business-1', 'operation-unknown', OperationType.Sale),
    ).rejects.toThrow(NotFoundException);
  });
});
