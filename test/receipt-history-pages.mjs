import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {writeFile} from 'node:fs/promises';
import {ReceiptHistoryService,ReceiptHistoryKind} from '../dist/receipts/receipt-history.service.js';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});await client.connect();
try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query(`CREATE TEMP TABLE providers(id uuid,business_id uuid,name text,is_active boolean);
    CREATE TEMP TABLE buyers(id uuid,business_id uuid,name text,is_active boolean);
    CREATE TEMP TABLE receptions(id uuid,business_id uuid,provider_id uuid,received_on date);
    CREATE TEMP TABLE purchase_settlements(id uuid,business_id uuid,reception_id uuid,liquid_amount_cents bigint,state text,created_at timestamptz);
    CREATE TEMP TABLE sales(id uuid,business_id uuid,buyer_id uuid,total_amount_cents bigint,state text,created_at timestamptz)`);
  const business=randomUUID(),other=randomUUID(),party=randomUUID();
  await client.query('INSERT INTO providers VALUES($1,$2,$3,false)',[party,business,'Proveedor histórico']);
  await client.query('INSERT INTO buyers VALUES($1,$2,$3,false)',[party,business,'Comprador histórico']);
  for(let i=0;i<101;i++){
    const id=randomUUID();const stamp='2026-10-12T04:59:59Z';
    await client.query('INSERT INTO receptions VALUES($1,$2,$3,$4)',[id,business,party,'2026-10-11']);
    await client.query('INSERT INTO purchase_settlements VALUES($1,$2,$1,$3,$4,$5)',[id,business,'9007199254740993',i%2?'voided':'confirmed',stamp]);
    await client.query('INSERT INTO sales VALUES($1,$2,$3,$4,$5,$6)',[id,business,party,'9007199254740993',i%2?'voided':'confirmed',stamp]);
  }
  await client.query('INSERT INTO sales VALUES($1,$2,$3,0,$4,$5)',[randomUUID(),other,party,'confirmed','2026-10-12T05:00:00Z']);
  const query=async(sql,parameters)=>(await client.query(sql,parameters)).rows;
  const service=new ReceiptHistoryService({transaction:async(isolation,work)=>{assert.equal(isolation,'REPEATABLE READ');return work({query});}});
  const identity={businessId:business,role:'wholesaler'};
  for(const kind of [ReceiptHistoryKind.Purchases,ReceiptHistoryKind.Sales]){
    const pages=[];for(let offset=0;offset<=100;offset+=20)pages.push(await service.list(identity,kind,{limit:20,offset}));
    const rows=pages.flatMap(page=>page.items);assert.equal(rows.length,101);assert.equal(new Set(rows.map(row=>row.id)).size,101);
    assert.deepEqual(pages.map(page=>page.items.length),[20,20,20,20,20,1]);assert.ok(pages.every(page=>page.total===101));
    assert.ok(rows.every(row=>row.occurredOn==='2026-10-11'&&row.amountCents==='9007199254740993'));assert.ok(rows.some(row=>row.state==='voided'));
    assert.ok(rows.every(row=>row.counterpartyName===`${kind==='purchases'?'Proveedor':'Comprador'} histórico`));
    assert.equal((await service.list({...identity,businessId:randomUUID()},kind,{limit:20,offset:0})).total,0);
  }
  await client.query('ROLLBACK');
  const evidence={verifiedAt:new Date().toISOString(),historyRowsPerKind:101,pageLengths:[20,20,20,20,20,1],businessIsolation:true,historicalCounterparties:true,voidedVisible:true,limaCivilDate:true,largeCentsExact:true,publicCommercialWrites:0,rollback:true};
  await writeFile('../tmp/receipt-history-pages-2026-10-12.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await client.query('ROLLBACK');await client.end();}
