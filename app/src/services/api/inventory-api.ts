import type { Page } from '@/domain/reception/reception';
import type { InventoryLot } from '@/domain/sales/sale';
import { apiRequest } from './api-client';
export type InventoryMovement={id:string;type:'purchase_in'|'sale_out'|'return_in'|'loss_out'|'adjustment'|'reversal';sackDelta:number;weightDeltaKg:string;sourceType:string;sourceId:string;reason:string|null;createdAt:string};
export type AdjustmentInput={clientOperationId:string;kind:'correction'|'loss'|'return';sourceSaleId?:string;sackDelta:number;weightDeltaKg:string;expectedVersion:number;reason:string};
export const getInventoryLot=(token:string,id:string)=>apiRequest<InventoryLot>(`/inventory/lots/${id}`,{token});
export const listInventoryMovements=(token:string,id:string)=>apiRequest<Page<InventoryMovement>>(`/inventory/lots/${id}/movements?limit=100&offset=0`,{token});
export const adjustInventory=(token:string,id:string,body:AdjustmentInput)=>apiRequest<InventoryMovement>(`/inventory/lots/${id}/adjustments`,{body,method:'POST',token});
