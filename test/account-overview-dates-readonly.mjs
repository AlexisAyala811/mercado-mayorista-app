import 'reflect-metadata';
import assert from 'node:assert/strict';
import {access,writeFile} from 'node:fs/promises';
import pg from 'pg';
import {AccountsService} from '../dist/accounts/accounts.service.js';

assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST,'127.0.0.1');
assert.equal(process.env.DATABASE_PORT,'55437');
const output=new URL('../../tmp/account-dates-readonly-pg-20261016.json',import.meta.url);
try{await access(output);throw new Error('Preserve existing evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const business='10000000-0000-4000-8000-000000000001';
const otherBusiness='10000000-0000-4000-8000-000000000002';
const id=n=>`30000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const provider=n=>`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const rows=[
  {id:id(1),businessId:business,version:2,state:'open',counterpartyType:'provider',counterpartyId:provider(1)},
  {id:id(2),businessId:business,version:0,state:'open',counterpartyType:'provider',counterpartyId:provider(2)},
  {id:id(3),businessId:business,version:1,state:'voided',counterpartyType:'buyer',counterpartyId:provider(3)},
].map(row=>({...row,kind:'payable',sourceType:'test-only-cte',sourceId:row.id,initialAmountCents:'10000',balanceCents:row.state==='open'?'1000':'0',createdAt:new Date('2026-10-01T00:00:00Z'),updatedAt:new Date('2026-10-16T02:30:00Z')}));
// CTEs shadow the production relations for this SELECT only. No schema/data writes.
const cte=`WITH accounts(id,business_id,version,state,counterparty_type,counterparty_id) AS (VALUES
 ('${id(1)}'::uuid,'${business}'::uuid,2,'open','provider','${provider(1)}'::uuid),
 ('${id(2)}'::uuid,'${business}'::uuid,0,'open','provider','${provider(2)}'::uuid),
 ('${id(3)}'::uuid,'${business}'::uuid,1,'voided','buyer','${provider(3)}'::uuid),
 ('${id(4)}'::uuid,'${otherBusiness}'::uuid,9,'open','provider','${provider(2)}'::uuid)
 ), providers(id,business_id,name) AS (VALUES
 ('${provider(1)}'::uuid,'${business}'::uuid,'Proveedor CTE'),
 ('${provider(2)}'::uuid,'${otherBusiness}'::uuid,'No revelar otro negocio')
 ), buyers(id,business_id,name) AS (VALUES ('${provider(3)}'::uuid,'${business}'::uuid,'Comprador CTE')),
 account_installments(account_id,due_on,state,balance_cents) AS (VALUES
 ('${id(1)}'::uuid,'2026-10-01'::date,'paid',0::bigint),
 ('${id(1)}'::uuid,'2026-10-05'::date,'open',0::bigint),
 ('${id(1)}'::uuid,'2026-11-20'::date,'open',5000::bigint),
 ('${id(1)}'::uuid,'2026-10-20'::date,'open',1000::bigint),
 ('${id(2)}'::uuid,'2026-12-01'::date,'open',3000::bigint),
 ('${id(3)}'::uuid,'2026-09-01'::date,'open',10000::bigint),
 ('${id(4)}'::uuid,'2026-01-01'::date,'open',99999::bigint)
 ) `;
const client=new pg.Client({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD,ssl:false});
try{
  await client.connect();await client.query('BEGIN READ ONLY');
  assert.equal((await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only,'on');
  let selectCalls=0;
  const service=new AccountsService({query:async(sql,args)=>{selectCalls++;return(await client.query(cte+sql,args)).rows;}},{},{findAndCount:async()=>[rows,rows.length]},{},{});
  const page=await service.list(business,{limit:20,offset:0});
  assert.equal(page.items.length,3);assert.equal(selectCalls,1);
  assert.equal(page.items[0].nextDueOn,'2026-10-20');assert.equal(page.items[0].counterpartyName,'Proveedor CTE');
  assert.equal(page.items[0].lastMovementAt.toISOString(),'2026-10-16T02:30:00.000Z');
  assert.equal(page.items[1].nextDueOn,'2026-12-01');assert.equal(page.items[1].lastMovementAt,null);assert.equal(page.items[1].counterpartyName,null);
  assert.equal(page.items[2].nextDueOn,null);assert.equal(page.items[2].counterpartyName,'Comprador CTE');
  rows[0].version=3;
  await assert.rejects(service.list(business,{limit:20,offset:0}),error=>error.getStatus()===409);
  await client.query('ROLLBACK');
  const evidence={checkedAt:new Date().toISOString(),readOnlyTransaction:true,cteFixturesOnly:true,commercialTableWrites:0,productionSelectUsed:true,earliestPositiveOpenInstallment:true,closedAccountHasNoDueDate:true,foreignCounterpartyNotDisclosed:true,versionZeroHasNoLaterMovement:true,staleVersionRejected:409};
  await writeFile(output,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await client.end();}
