import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_QA_TOKEN);
const request=async(path,body,method=body?'POST':'GET')=>{
  const response=await fetch(`http://127.0.0.1:3000/api/v1${path}`,{method,headers:{Authorization:`Bearer ${process.env.MERCADO_QA_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  const value=response.status===204?null:await response.json();
  assert.ok(response.ok,`Unexpected ${response.status} at ${path}`);return value;
};
const file='../tmp/sales-history-ui-fixture-2026-10-07.json';
let fixture;
try{fixture=JSON.parse(await readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!fixture){
  const buyers=await request('/catalog/buyers?limit=100&offset=0');
  let buyer=buyers.items.find(item=>item.name==='QA Historial Paginación 20261007');
  if(!buyer)buyer=await request('/catalog/buyers',{name:'QA Historial Paginación 20261007',destinationDepartment:'Lima'});
  const varieties=await request('/catalog/varieties?limit=100&offset=0');assert.ok(varieties.items.length);
  fixture={buyerId:buyer.id,buyerName:buyer.name,varietyId:varieties.items[0].id,
    operations:Array.from({length:21},()=>({clientOperationId:randomUUID(),voidOperationId:randomUUID()}))};
  await writeFile(file,JSON.stringify(fixture,null,2));
}
for(const operation of fixture.operations){
  const sale=await request('/sales',{buyerId:fixture.buyerId,clientOperationId:operation.clientOperationId,
    destinationDepartment:'Lima',driverName:'QA Historial Paginación 20261007',discountsCents:0,
    freightIncludedInTotal:false,paymentMode:'cash',installments:[],
    lines:[{varietyId:fixture.varietyId,sacks:1,weightKg:'10.000',priceBasis:'kilogram',unitPriceCents:150}]});
  operation.saleId=sale.id;await writeFile(file,JSON.stringify(fixture,null,2));
  await request(`/sales/${sale.id}/void`,{clientOperationId:operation.voidOperationId,expectedSaleVersion:0,reason:'Caso ficticio de prueba del historial paginado'});
}
// Deactivate only this fixture's commercial participant, preserving its history.
await request(`/catalog/buyers/${fixture.buyerId}`,undefined,'DELETE');
const params=new URLSearchParams({limit:'20',offset:'0',search:fixture.buyerName,state:'voided'});
const first=await request(`/sales?${params}`);assert.equal(first.total,21);assert.equal(first.items.length,20);
params.set('offset','20');const last=await request(`/sales?${params}`);assert.equal(last.total,21);assert.equal(last.items.length,1);
assert.equal(last.items[0].buyerName,fixture.buyerName);
console.log(JSON.stringify({passed:true,participant:fixture.buyerName,voidedOperations:21,pageOne:20,pageTwo:1,participantDeactivated:true,merchandiseBalances:false}));
