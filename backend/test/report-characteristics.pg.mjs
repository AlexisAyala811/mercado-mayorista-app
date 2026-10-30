import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { ReportsService } from '../dist/reports/reports.service.js';
assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55437, username: 'mercado_test', password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME, synchronize: false, logging: false });
await ds.initialize(); const runner=ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
const schema=`qa_report_characteristics_${randomUUID().replaceAll('-','').slice(0,20)}`;
try {
  await runner.query(`CREATE SCHEMA "${schema}"`);await runner.query(`SET LOCAL search_path TO "${schema}"`);
  for(const sql of [
    'CREATE TABLE providers(id uuid,business_id uuid,name text)',
    'CREATE TABLE buyers(id uuid,business_id uuid,name text)',
    'CREATE TABLE potato_varieties(id uuid,business_id uuid,name text)',
    'CREATE TABLE receptions(id uuid,business_id uuid,provider_id uuid)',
    'CREATE TABLE purchase_settlements(id uuid,business_id uuid,reception_id uuid,created_at timestamptz,state text,price_basis text,unit_price_cents bigint)',
    'CREATE TABLE reception_sacks(id uuid,reception_id uuid,business_id uuid,variety_id uuid,voided_at timestamptz,quality_id uuid,quality_name text,origin_id uuid,origin_name text)',
    'CREATE TABLE sales(id uuid,business_id uuid,buyer_id uuid,created_at timestamptz,state text)',
    'CREATE TABLE sale_lines(id uuid,sale_id uuid,variety_id uuid,price_basis text,unit_price_cents bigint,quality_id uuid,quality_name text,origin_id uuid,origin_name text)',
  ])await runner.query(sql);
  const [business,foreignBusiness,provider,buyer,variety,reception,purchase,sale,quality,otherQuality,origin,otherOrigin,line1,line2]=Array.from({length:14},()=>randomUUID());
  await runner.query('INSERT INTO providers VALUES($1,$2,$3)',[provider,business,'Proveedor QA']);
  await runner.query('INSERT INTO buyers VALUES($1,$2,$3)',[buyer,business,'Comprador QA']);
  await runner.query('INSERT INTO potato_varieties VALUES($1,$2,$3)',[variety,business,'Canchán']);
  await runner.query('INSERT INTO receptions VALUES($1,$2,$3)',[reception,business,provider]);
  await runner.query("INSERT INTO purchase_settlements VALUES($1,$2,$3,'2026-10-07T15:00:00Z','confirmed','kilogram',250)",[purchase,business,reception]);
  const snapshots=[
    [quality,'Primera original',origin,'Junín original'],
    [quality,'Primera original',origin,'Junín original'],
    [quality,'Primera renombrada',origin,'Junín original'],
    [otherQuality,'Segunda',otherOrigin,'Huánuco'],
    [null,null,null,null],
  ];
  for(const snapshot of snapshots)await runner.query('INSERT INTO reception_sacks VALUES($1,$2,$3,$4,NULL,$5,$6,$7,$8)',[randomUUID(),reception,business,variety,...snapshot]);
  await runner.query("INSERT INTO reception_sacks VALUES($1,$2,$3,$4,now(),$5,'Anulada',$6,'No mostrar')",[randomUUID(),reception,business,variety,quality,origin]);
  await runner.query("INSERT INTO sales VALUES($1,$2,$3,'2026-10-07T16:00:00Z','confirmed')",[sale,business,buyer]);
  await runner.query("INSERT INTO sale_lines VALUES($1,$2,$3,'kilogram',300,$4,'Primera original',$5,'Junín original'),($6,$2,$3,'sack',900,$7,'Segunda',$8,'Huánuco')",[line1,sale,variety,quality,origin,line2,otherQuality,otherOrigin]);
  const service=new ReportsService({query:(sql,parameters)=>runner.query(sql,parameters)});
  const period={from:'2026-10-07',to:'2026-10-07'};
  const all=await service.priceHistory(business,period);
  assert.equal(all.items.length,6); // Four distinct purchase snapshots and two identifiable sale lines.
  assert.equal(all.items.filter(item=>item.operationType==='purchase').length,4);
  assert.deepEqual(new Set(all.items.filter(item=>item.operationType==='sale').map(item=>item.sourceLineId)),new Set([line1,line2]));
  const known=await service.priceHistory(business,{...period,qualityId:quality.toUpperCase(),originId:origin});
  assert.equal(known.items.length,3);assert.deepEqual(new Set(known.items.map(item=>item.qualityName)),new Set(['Primera original','Primera renombrada']));
  assert.ok(known.items.every(item=>item.unitPriceCents=== (item.operationType==='purchase'?'250':'300')));
  const unknown=await service.priceHistory(business,{...period,qualityId:'unreported',originId:'unreported'});
  assert.equal(unknown.items.length,1);assert.equal(unknown.items[0].qualityName,null);
  assert.equal((await service.priceHistory(business,{...period,qualityId:quality,originId:'unreported'})).items.length,0);
  assert.equal((await service.priceHistory(foreignBusiness,period)).items.length,0);
  // Preserve commercial midnight boundaries in Lima without a catalog lookup or metadata inference.
  for(const [instant,expectedCount] of [['2026-10-07T04:59:59Z',0],['2026-10-07T05:00:00Z',1],['2026-10-08T04:59:59Z',1],['2026-10-08T05:00:00Z',0]]){
    await runner.query('UPDATE sales SET created_at=$1 WHERE id=$2',[instant,sale]);
    assert.equal((await service.priceHistory(business,{...period,qualityId:quality})).items.filter(item=>item.operationType==='sale').length,expectedCount);
  }
  await assert.rejects(service.priceHistory(business,{from:'2026-10-08',to:'2026-10-07'}),error=>error.status===422);
  await runner.rollbackTransaction();assert.equal((await ds.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).length,0);
  const evidence={checkedAt:new Date().toISOString(),scope:'real ReportsService SQL on isolated minimal read model; full rollback',checks:['four purchase snapshot groups without duplicate sacks or voided records','two same-variety sale lines keep IDs, characteristics, price basis and agreed tariff','known/unknown/combined filters and original labels preserved','business isolation and four Lima midnight boundaries','inverted range rejected'],commercialServiceMutationsExecuted:false};
  await writeFile(new URL('../../tmp/report-characteristics-pg-20261014.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();await ds.destroy();}
