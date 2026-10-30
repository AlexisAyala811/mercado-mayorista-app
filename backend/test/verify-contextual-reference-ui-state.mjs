import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import dataSource from '../dist/database/data-source.js';

assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST,'127.0.0.1');
assert.equal(process.env.DATABASE_PORT,'55437');
const prior=JSON.parse(await readFile(new URL('../../tmp/characteristics-qa-activation-20261014.json',import.meta.url),'utf8'));
const tables=['purchase_settlements','receptions','reception_sacks','sales','sale_lines','sale_line_costs','sale_returns','sale_return_lines','accounts','account_installments','account_payments','account_payment_allocations','cash_movements','receipt_documents'];
await dataSource.initialize();
const runner=dataSource.createQueryRunner();
try{
  await runner.connect();await runner.startTransaction('REPEATABLE READ');
  await runner.query('SET TRANSACTION READ ONLY');
  const providers=await runner.query('SELECT id,business_id,phone,is_active FROM providers WHERE name=$1',['Proveedor contextual QA 1410']);
  assert.equal(providers.length,1);const provider=providers[0];assert.equal(provider.phone,'999000141');assert.equal(provider.is_active,true);
  const qualities=await runner.query('SELECT id,is_active FROM commercial_characteristics WHERE business_id=$1 AND kind=$2 AND name=$3',[provider.business_id,'quality','Primera QA contextual']);
  assert.equal(qualities.length,1);assert.equal(qualities[0].is_active,true);
  const receptions=await runner.query('SELECT id,state,version,provider_id FROM receptions WHERE business_id=$1 AND driver_name=$2',[provider.business_id,'QA conservar conductor']);
  assert.equal(receptions.length,1);const reception=receptions[0];assert.equal(reception.provider_id,provider.id);assert.equal(reception.state,'draft');assert.equal(reception.version,0);
  const preservation={};
  for(const table of tables){
    const rows=await runner.query(`SELECT (to_jsonb(t)-'quality_id'-'quality_name'-'origin_id'-'origin_name')::text AS row FROM public.${table} t ${table==='receptions'?'WHERE id<>$1':''} ORDER BY id`,table==='receptions'?[reception.id]:[]);
    const actual={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
    assert.deepEqual(actual,prior.before.tables[table],`Pre-existing ${table} changed; inspect rather than replacing baseline`);preservation[table]=true;
  }
  const sacks=await runner.query('SELECT count(*)::int AS count FROM reception_sacks WHERE reception_id=$1',[reception.id]);assert.equal(sacks[0].count,0);
  await runner.rollbackTransaction();
  const evidence={checkedAt:new Date().toISOString(),readOnlyTransaction:true,providerPersisted:true,qualityPersisted:true,receptionId:reception.id,receptionState:reception.state,receptionVersion:reception.version,driverAndProviderPreserved:true,sacks:0,allowedAddition:'One draft reception created by Continue to weighing in the UI',preExistingTablesUnchanged:preservation,newFinancialWrites:false,returnResubmitted:false};
  await writeFile(new URL('../../tmp/contextual-reference-ui-state-20261015.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{
  if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();await dataSource.destroy();
}
