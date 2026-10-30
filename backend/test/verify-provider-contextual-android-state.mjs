import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {access,readFile,writeFile} from 'node:fs/promises';
import dataSource from '../dist/database/data-source.js';

assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST,'127.0.0.1');
assert.equal(process.env.DATABASE_PORT,'55437');
const output=new URL('../../tmp/provider-contextual-android-pg-20261016.json',import.meta.url);
try{await access(output);throw new Error('Preserve previous PostgreSQL evidence');}catch(error){if(error.code!=='ENOENT')throw error;}
const prior=JSON.parse(await readFile(new URL('../../tmp/characteristics-qa-activation-20261014.json',import.meta.url),'utf8'));
const tables=['purchase_settlements','receptions','reception_sacks','sales','sale_lines','sale_line_costs','sale_returns','sale_return_lines','accounts','account_installments','account_payments','account_payment_allocations','cash_movements','receipt_documents'];
await dataSource.initialize();
const runner=dataSource.createQueryRunner();
try{
  await runner.connect();await runner.startTransaction('REPEATABLE READ');await runner.query('SET TRANSACTION READ ONLY');
  const providers=await runner.query('SELECT id,business_id,name,phone,is_active FROM providers WHERE name=$1',['Proveedor Android QA 1610 entrada']);
  assert.equal(providers.length,1);const provider=providers[0];
  assert.equal(provider.id,'b7745b91-4a6c-410b-a020-d260b6d69154');assert.equal(provider.phone,null);assert.equal(provider.is_active,true);
  const allowedDraftId='0261c947-7813-4745-bf93-9d080be48b14';
  const drafts=await runner.query('SELECT state,version FROM receptions WHERE id=$1',[allowedDraftId]);
  assert.equal(drafts.length,1);assert.equal(drafts[0].state,'draft');assert.equal(drafts[0].version,0);
  const preservation={};
  for(const table of tables){
    const rows=await runner.query(`SELECT (to_jsonb(t)-'quality_id'-'quality_name'-'origin_id'-'origin_name')::text AS row FROM public.${table} t ${table==='receptions'?'WHERE id<>$1':''} ORDER BY id`,table==='receptions'?[allowedDraftId]:[]);
    const actual={count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
    assert.deepEqual(actual,prior.before.tables[table],`Pre-existing ${table} changed; inspect rather than replacing baseline`);preservation[table]=actual;
  }
  await runner.rollbackTransaction();
  const evidence={checkedAt:new Date().toISOString(),readOnlyTransaction:true,providerId:provider.id,providerName:provider.name,phone:null,active:true,exactlyOneMatchingProvider:true,preExistingTables:preservation,allowedPriorDraftId:allowedDraftId,newReceptionCreated:false,newFinancialWrites:false,returnResubmitted:false};
  await writeFile(output,JSON.stringify(evidence,null,2));console.log(JSON.stringify({checkedAt:evidence.checkedAt,providerId:provider.id,phone:null,exactlyOneMatchingProvider:true,commercialTablesPreserved:tables.length,readOnlyTransaction:true}));
}finally{
  if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();await dataSource.destroy();
}
