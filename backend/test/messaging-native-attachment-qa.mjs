import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import pg from 'pg';
const mode=process.argv[2];assert.ok(['before','after','after-copy'].includes(mode));
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST,'127.0.0.1');assert.equal(process.env.DATABASE_PORT,'55437');
const filename='mercado-native-qa-20261026.png';
const artifact=new URL('../../tmp/messaging-native-attachment-qa-20261026.json',import.meta.url);
const client=new pg.Client({host:process.env.DATABASE_HOST,port:Number(process.env.DATABASE_PORT),database:process.env.DATABASE_NAME,user:process.env.DATABASE_USER,password:process.env.DATABASE_PASSWORD});
await client.connect();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const anchor=(await client.query('SELECT business_id FROM sales WHERE id=$1',['108b4b3c-4e51-4aef-9ab5-17bfc10f1678'])).rows[0];assert.ok(anchor);
  const tables=['purchase_settlements','receptions','reception_sacks','sales','sale_lines','sale_line_costs','sale_returns','sale_return_lines','accounts','account_installments','account_payments','account_payment_allocations','cash_movements','receipt_documents'];
  const fingerprints={};
  for(const table of tables) fingerprints[table]=(await client.query(`SELECT count(*)::int AS count,md5(COALESCE(string_agg(digest,'' ORDER BY digest),'')) AS hash FROM (SELECT md5(row_to_json(t)::text) AS digest FROM "${table}" t) rows`)).rows[0];
  const attempts=(await client.query('SELECT id,business_id,client_operation_id,recipient_kind,recipient_name,channel,filename,mime_type,size_bytes,state FROM message_share_attempts WHERE business_id=$1 AND filename=$2',[anchor.business_id,filename])).rows;
  const columns=(await client.query("SELECT column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='message_share_attempts' ORDER BY ordinal_position")).rows;
  const allowed=new Set(['id','business_id','actor_user_id','client_operation_id','recipient_id','recipient_kind','recipient_name','channel','filename','mime_type','size_bytes','state','created_at','updated_at']);
  assert.ok(columns.length&&columns.every(column=>allowed.has(column.column_name)&&column.data_type!=='bytea'));
  if(mode==='before'){
    assert.equal(attempts.length,0,'Preserve an existing fixture attempt; do not share again');
    await writeFile(artifact,JSON.stringify({phase:'before',at:new Date().toISOString(),businessId:anchor.business_id,filename,fingerprints,metadataOnlyColumns:columns},null,2),{flag:'wx'});
  }else if(mode==='after-copy'){
    const before=JSON.parse(await readFile(artifact,'utf8'));assert.equal(before.phase,'verified');
    assert.deepEqual(fingerprints,before.fingerprints);assert.equal(attempts.length,1);assert.deepEqual(attempts[0],before.attempt);
    await writeFile(artifact,JSON.stringify({...before,copyVerifiedAt:new Date().toISOString(),downloadOnlyPreservesAttempt:true},null,2));
    console.log(JSON.stringify({passed:true,attempts:1,state:attempts[0].state,commercialTablesUnchanged:tables.length,downloadOnlyPreservesAttempt:true}));
  }else{
    const before=JSON.parse(await readFile(artifact,'utf8'));assert.equal(before.phase,'before');assert.equal(before.businessId,anchor.business_id);
    assert.deepEqual(fingerprints,before.fingerprints);assert.equal(attempts.length,1);
    const attempt=attempts[0];assert.equal(attempt.mime_type,'image/png');assert.equal(attempt.size_bytes,799005);assert.equal(attempt.recipient_kind,'buyer');assert.equal(attempt.recipient_name,'Comprador QA');assert.equal(attempt.channel,'whatsapp');
    assert.ok(['prepared','sharing_requested','failed'].includes(attempt.state));
    const evidence={...before,phase:'verified',passed:true,verifiedAt:new Date().toISOString(),commercialTablesUnchanged:tables.length,attempt,deliveryVerified:false,afterFingerprints:fingerprints};
    await writeFile(artifact,JSON.stringify(evidence,null,2));
    console.log(JSON.stringify({passed:true,attempts:attempts.length,state:attempt.state,commercialTablesUnchanged:tables.length,metadataOnly:true,deliveryVerified:false}));
  }
  await client.query('COMMIT');
}finally{await client.end();}
