import {ForbiddenException,Injectable} from '@nestjs/common';
import {DataSource} from 'typeorm';
import type {SessionIdentity} from '../identity/application/ports/session-identity-reader.js';
import {UserRole} from '../identity/entities/user.entity.js';
import {toPage,type PageQueryDto} from '../common/http/page-query.dto.js';
export enum ReceiptHistoryKind {Purchases='purchases',Sales='sales'}
export type ReceiptHistoryRow={id:string;occurredOn:string;amountCents:string;state:'confirmed'|'voided';reference:string;counterpartyName:string|null};
@Injectable()
export class ReceiptHistoryService {
  constructor(private readonly dataSource:DataSource){}
  async list(identity:SessionIdentity,kind:ReceiptHistoryKind,page:PageQueryDto){
    if(identity.role!==UserRole.Wholesaler)throw new ForbiddenException('Solo el Mayorista puede consultar el historial de comprobantes.');
    const purchase=kind===ReceiptHistoryKind.Purchases;
    const from=purchase?'purchase_settlements o JOIN receptions r ON r.id=o.reception_id AND r.business_id=o.business_id LEFT JOIN providers c ON c.id=r.provider_id AND c.business_id=o.business_id':'sales o LEFT JOIN buyers c ON c.id=o.buyer_id AND c.business_id=o.business_id';
    const date=purchase?'r.received_on::text':"(o.created_at AT TIME ZONE 'America/Lima')::date::text";
    const amount=purchase?'o.liquid_amount_cents':'o.total_amount_cents';
    const reference=purchase?'o.reception_id':'o.id';
    return this.dataSource.transaction('REPEATABLE READ',async manager=>{
      const items=await manager.query<ReceiptHistoryRow[]>(`SELECT o.id,${date} AS "occurredOn",${amount}::text AS "amountCents",o.state,${reference}::text AS reference,c.name AS "counterpartyName" FROM ${from} WHERE o.business_id=$1 ORDER BY o.created_at DESC,o.id DESC LIMIT $2 OFFSET $3`,[identity.businessId,page.limit,page.offset]);
      const counts=await manager.query<{total:number}[]>(`SELECT COUNT(*)::int AS total FROM ${from} WHERE o.business_id=$1`,[identity.businessId]);
      return toPage(items,counts[0]!.total,page);
    });
  }
}
