import type {ExecutionContext} from '@nestjs/common';
import {Reflector} from '@nestjs/core';
import type {AuditService} from '../audit/audit.service.js';
import {RolesGuard} from '../identity/http/roles.guard.js';
import {ReceiptHistoryController} from './receipt-history.controller.js';
import type {DataSource,EntityManager} from 'typeorm';
import {ForbiddenException} from '@nestjs/common';
import type {SessionIdentity} from '../identity/application/ports/session-identity-reader.js';
import {UserRole} from '../identity/entities/user.entity.js';
import {ReceiptHistoryKind,ReceiptHistoryService} from './receipt-history.service.js';
const owner={businessId:'business',role:UserRole.Wholesaler} as SessionIdentity;
it.each([ReceiptHistoryKind.Purchases,ReceiptHistoryKind.Sales])('paginates %s within one business and coherent read',async kind=>{
  const query=vi.fn().mockResolvedValueOnce([{id:'id',state:'voided',amountCents:'9007199254740993'}]).mockResolvedValueOnce([{total:101}]);
  const transaction=vi.fn(async(isolation:string,work:(manager:EntityManager)=>unknown)=>{expect(isolation).toBe('REPEATABLE READ');return work({query} as unknown as EntityManager);});
  const result=await new ReceiptHistoryService({transaction} as unknown as DataSource).list(owner,kind,{limit:20,offset:100});
  expect(result).toMatchObject({total:101,offset:100,limit:20});expect(result.items[0]?.amountCents).toBe('9007199254740993');
  expect(query.mock.calls[0]?.[1]).toEqual(['business',20,100]);expect(query.mock.calls[1]?.[1]).toEqual(['business']);
  expect(query.mock.calls[0]?.[0]).toContain('ORDER BY o.created_at DESC,o.id DESC');expect(query.mock.calls[0]?.[0]).not.toContain('inventory');
});
it('refuses operational users before querying the complete document history',async()=>{
  const transaction=vi.fn();
  await expect(new ReceiptHistoryService({transaction} as unknown as DataSource).list({...owner,role:UserRole.Assistant},ReceiptHistoryKind.Purchases,{limit:20,offset:0})).rejects.toThrow(ForbiddenException);
  expect(transaction).not.toHaveBeenCalled();
});

it('enforces the controller role metadata and audits a denied operational identity',async()=>{
  const list=vi.fn();const controller=new ReceiptHistoryController({list} as unknown as ReceiptHistoryService);
  const recordDirect=vi.fn().mockResolvedValue(undefined);const guard=new RolesGuard(new Reflector(),{recordDirect} as unknown as AuditService);
  const context={getClass:()=>ReceiptHistoryController,getHandler:()=>controller.list.bind(controller),switchToHttp:()=>({getRequest:()=>({identity:{...owner,userId:'operator',role:UserRole.Assistant},method:'GET',path:'/receipts/history/sales'})})} as unknown as ExecutionContext;
  await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);expect(list).not.toHaveBeenCalled();expect(recordDirect).toHaveBeenCalledWith(expect.objectContaining({action:'authorization.denied',businessId:'business',actorUserId:'operator'}));
});
