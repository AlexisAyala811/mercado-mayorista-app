import { IsEnum } from 'class-validator';

export enum OperationType {
  AccountPayment = 'account-payment',
  FreightSettlement = 'freight-settlement',
  InventoryMovement = 'inventory-movement',
  PurchaseSettlement = 'purchase-settlement',
  PurchaseVoid = 'purchase-void',
  Reception = 'reception',
  ReceptionVoid = 'reception-void',
  ReceptionSack = 'reception-sack',
  ReceptionSackVoid = 'reception-sack-void',
  ReceptionWeighingClose = 'reception-weighing-close',
  Sale = 'sale',
  SaleVoid = 'sale-void',
  SaleReturn = 'sale-return',
  StowageEntry = 'stowage-entry',
  StowageSettlement = 'stowage-settlement',
}

export class OperationQueryDto {
  @IsEnum(OperationType)
  type!: OperationType;
}
