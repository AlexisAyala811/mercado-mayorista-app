import { SaleReturnEntity } from '../sales/entities/sale-return.entity.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import { FreightSettlementEntity } from '../freight/entities/freight-settlement.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { ReceptionEntity } from '../reception/entities/reception.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import { StowageEntryEntity } from '../stowage/entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from '../stowage/entities/stowage-settlement.entity.js';
import { OperationType } from './operation-query.dto.js';

export interface OperationResult {
  clientOperationId: string;
  resourceId: string;
  resourceType: string;
  status: 'confirmed';
}

type DirectOperation = {
  businessId: string;
  clientOperationId: string;
  id: string;
};

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(ReceptionEntity)
    private readonly receptions: Repository<ReceptionEntity>,
    @InjectRepository(ReceptionSackEntity)
    private readonly sacks: Repository<ReceptionSackEntity>,
    @InjectRepository(PurchaseSettlementEntity)
    private readonly purchases: Repository<PurchaseSettlementEntity>,
    @InjectRepository(SaleEntity)
    private readonly sales: Repository<SaleEntity>,
    @InjectRepository(AccountPaymentEntity)
    private readonly payments: Repository<AccountPaymentEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movements: Repository<InventoryMovementEntity>,
    @InjectRepository(StowageEntryEntity)
    private readonly stowageEntries: Repository<StowageEntryEntity>,
    @InjectRepository(StowageSettlementEntity)
    private readonly stowageSettlements: Repository<StowageSettlementEntity>,
    @InjectRepository(FreightSettlementEntity)
    private readonly freightSettlements: Repository<FreightSettlementEntity>,
    @InjectRepository(SaleReturnEntity)
    private readonly saleReturns: Repository<SaleReturnEntity>,
  ) {}

  async get(
    businessId: string,
    clientOperationId: string,
    type: OperationType,
  ): Promise<OperationResult> {
    let entity: { id: string } | null = null;
    if (type === OperationType.ReceptionWeighingClose) {
      entity = await this.receptions.findOne({
        where: { businessId, closeOperationId: clientOperationId },
      });
    } else if (type === OperationType.ReceptionSackVoid) {
      entity = await this.sacks.findOne({
        where: { businessId, voidOperationId: clientOperationId },
      });
    } else if (type === OperationType.ReceptionVoid) {
      entity = await this.receptions.findOne({
        where: { businessId, voidOperationId: clientOperationId },
      });
    } else if (type === OperationType.PurchaseVoid) {
      entity = await this.purchases.findOne({
        where: { businessId, voidOperationId: clientOperationId },
      });
    } else if (type === OperationType.SaleVoid) {
      entity = await this.sales.findOne({
        where: { businessId, voidOperationId: clientOperationId },
      });
    } else {
      const repository = this.directRepository(type);
      entity = await repository.findOne({
        where: { businessId, clientOperationId },
      });
    }
    if (!entity) throw new NotFoundException('Operación no encontrada.');
    return result(clientOperationId, type, entity.id);
  }

  private directRepository(type: OperationType): Repository<DirectOperation> {
    const repositories: Partial<
      Record<OperationType, Repository<DirectOperation>>
    > = {
      [OperationType.AccountPayment]: this
        .payments as unknown as Repository<DirectOperation>,
      [OperationType.InventoryMovement]: this
        .movements as unknown as Repository<DirectOperation>,
      [OperationType.PurchaseSettlement]: this
        .purchases as unknown as Repository<DirectOperation>,
      [OperationType.Reception]: this
        .receptions as unknown as Repository<DirectOperation>,
      [OperationType.ReceptionSack]: this
        .sacks as unknown as Repository<DirectOperation>,
      [OperationType.SaleReturn]: this.saleReturns as unknown as Repository<DirectOperation>,
      [OperationType.Sale]: this
        .sales as unknown as Repository<DirectOperation>,
      [OperationType.StowageEntry]: this
        .stowageEntries as unknown as Repository<DirectOperation>,
      [OperationType.StowageSettlement]: this
        .stowageSettlements as unknown as Repository<DirectOperation>,
      [OperationType.FreightSettlement]: this
        .freightSettlements as unknown as Repository<DirectOperation>,
    };
    return repositories[type]!;
  }
}

function result(
  clientOperationId: string,
  resourceType: string,
  resourceId: string,
): OperationResult {
  return { clientOperationId, resourceId, resourceType, status: 'confirmed' };
}
