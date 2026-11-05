import type {ReceiptHistoryKind,ReceiptHistoryRow} from '@/domain/receipts/receipt';
import type {Page} from '@/domain/reception/reception';
import {apiRequest} from './api-client';
export function listReceiptHistory(token:string,kind:ReceiptHistoryKind,offset:number){
  return apiRequest<Page<ReceiptHistoryRow>>(`/receipts/history/${kind}?limit=20&offset=${offset}`,{token});
}
