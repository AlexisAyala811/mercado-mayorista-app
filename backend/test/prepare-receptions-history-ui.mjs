import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {Client} from 'pg';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_QA_TOKEN);
const request=async(path,body,method=body?'POST':'GET')=>{
  const response=await fetch(`http://127.0.0.1:3000/api/v1${path}`,{method,headers:{Authorization:`Bearer ${process.env.MERCADO_QA_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(response.ok,`Unexpected ${response.status} at ${path}`);
  return response.status===204?null:response.json();
};
const file='../tmp/receptions-history-ui-fixture-2026-10-07.json';
let fixture;
try{fixture=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!fixture){
  const provider=await request('/catalog/providers',{name:'QA Historial Compras 20261007'});
  const varieties=await request('/catalog/varieties?limit=100&offset=0');assert.ok(varieties.items.length);
  fixture={providerId:provider.id,providerName:provider.name,varietyIds:varieties.items.slice(0,2).map(item=>item.id),prepared:false,
    operations:Array.from({length:21},()=>({clientOperationId:randomUUID(),voidOperationId:randomUUID()}))};
  await writeFile(file,JSON.stringify(fixture,null,2));
}
if(!fixture.prepared){
  for(const operation of fixture.operations){
    const reception=await request('/receptions',{clientOperationId:operation.clientOperationId,providerId:fixture.providerId,driverName:'QA Historial Compras 20261007',receivedOn:'2026-10-07',expectedVarietyIds:fixture.varietyIds});
    operation.receptionId=reception.id;await writeFile(file,JSON.stringify(fixture,null,2));
    await request(`/receptions/${reception.id}/void`,{clientOperationId:operation.voidOperationId,expectedReceptionVersion:0,reason:'Recepción ficticia para verificar historial paginado'});
  }
  await request(`/catalog/providers/${fixture.providerId}`,undefined,'DELETE');
  fixture.prepared=true;await writeFile(file,JSON.stringify(fixture,null,2));
}
const query=new URLSearchParams({limit:'20',offset:'0',from:'2026-10-07',to:'2026-10-07',search:fixture.providerName,state:'voided'});
const first=await request(`/receptions?${query}`);assert.equal(first.total,21);assert.equal(first.items.length,20);
query.set('offset','20');const last=await request(`/receptions?${query}`);assert.equal(last.total,21);assert.equal(last.items.length,1);
assert.equal(last.items[0].providerName,fixture.providerName);assert.ok(!('provider' in last.items[0]));
const detail=await request(`/receptions/${last.items[0].id}`);assert.equal(detail.providerName,fixture.providerName);
const headers={Authorization:`Bearer ${process.env.MERCADO_QA_TOKEN}`};
const statuses={unauthenticated:(await fetch('http://127.0.0.1:3000/api/v1/receptions')).status,
  invalidDate:(await fetch('http://127.0.0.1:3000/api/v1/receptions?from=2026-02-30',{headers})).status,
  reversedRange:(await fetch('http://127.0.0.1:3000/api/v1/receptions?from=2026-10-08&to=2026-10-07',{headers})).status};
assert.deepEqual(statuses,{unauthenticated:401,invalidDate:400,reversedRange:422});
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});await client.connect();
try{
  await client.query('BEGIN READ ONLY');
  const ids=fixture.operations.map(item=>item.receptionId);
  const result=await client.query(`SELECT
    (SELECT count(*)::int FROM receptions WHERE id=ANY($1::uuid[]) AND state='voided') AS voided_receptions,
    (SELECT count(*)::int FROM cash_movements WHERE source_id=ANY($1::uuid[])) AS cash_movements,
    (SELECT count(*)::int FROM inventory_movements WHERE source_id=ANY($1::uuid[])) AS inventory_movements,
    (SELECT is_active FROM providers WHERE id=$2) AS provider_active`,[ids,fixture.providerId]);
  assert.deepEqual(result.rows[0],{voided_receptions:21,cash_movements:0,inventory_movements:0,provider_active:false});
  await client.query('ROLLBACK');
  const evidence={passed:true,environment:'isolated local UI test database',participant:fixture.providerName,pageOne:20,pageTwo:1,receivedOn:'2026-10-07',...statuses,...result.rows[0]};
  await writeFile('../tmp/receptions-history-api-2026-10-07.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await client.end();}
