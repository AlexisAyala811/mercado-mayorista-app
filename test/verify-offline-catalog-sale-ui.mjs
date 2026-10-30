import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {Client} from 'pg';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_QA_TOKEN);assert.ok(process.env.MERCADO_QA_BUSINESS_ID);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});await client.connect();
const api=async(path,body)=>{
  const response=await fetch(`http://127.0.0.1:3000/api/v1${path}`,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${process.env.MERCADO_QA_TOKEN}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  assert.ok(response.ok,`Unexpected ${response.status} at ${path}`);return response.json();
};
const evidenceFile='../tmp/offline-catalog-sale-api-2026-10-08.json';
try{
  await client.query('BEGIN READ ONLY');
  const rows=await client.query('SELECT id,client_operation_id FROM sales WHERE business_id=$1 AND driver_name=$2',[process.env.MERCADO_QA_BUSINESS_ID,'QA catálogos offline 20261008']);
  assert.equal(rows.rows.length,1,'Expected exactly one UI-created fictitious sale');
  await client.query('ROLLBACK');
  const id=rows.rows[0].id;
  const operationId=rows.rows[0].client_operation_id;
  const recovery=await api(`/operations/${operationId}?type=sale`);assert.equal(recovery.resourceId,id);
  const {sale,lines}=await api(`/sales/${id}`);assert.equal(sale.totalAmountCents,'2500');assert.equal(lines.length,1);assert.equal(lines[0].lotId,null);assert.equal(lines[0].sacks,1);assert.equal(lines[0].weightKg,'10.000');assert.equal(lines[0].unitPriceCents,'250');
  const replay=await api('/sales',{clientOperationId:operationId,buyerId:sale.buyerId,destinationDepartment:'Lima',driverName:sale.driverName,discountsCents:0,freightIncludedInTotal:false,paymentMode:'cash',installments:[],lines:[{varietyId:lines[0].varietyId,sacks:1,weightKg:'10.000',priceBasis:'kilogram',unitPriceCents:250}]});assert.equal(replay.id,id);
  let evidence;
  try{evidence=JSON.parse(await readFile(evidenceFile,'utf8'));assert.equal(evidence.saleId,id);}catch(error){if(error.code!=='ENOENT')throw error;}
  if(!evidence){
    assert.equal(sale.state,'confirmed');
    await client.query('BEGIN READ ONLY');
    const before=await client.query(`SELECT
      (SELECT count(*)::int FROM sales WHERE business_id=$1 AND client_operation_id=$2) AS sale_count,
      (SELECT count(*)::int FROM cash_movements WHERE business_id=$1 AND source_id=$3) AS cash_count,
      (SELECT count(*)::int FROM audit_events WHERE business_id=$1 AND resource_id=$3 AND action='sale.confirmed') AS confirmations,
      (SELECT count(*)::int FROM inventory_movements WHERE business_id=$1 AND source_id=$3) AS inventory_movements`,[sale.businessId,operationId,id]);
    assert.deepEqual(before.rows[0],{sale_count:1,cash_count:1,confirmations:1,inventory_movements:0});
    await client.query('ROLLBACK');
    evidence={environment:'isolated local UI test database',saleId:id,operationId,voidOperationId:randomUUID(),totalAmountCents:'2500',sacks:1,weightKg:'10.000',beforeVoid:before.rows[0]};
    await writeFile(evidenceFile,JSON.stringify(evidence,null,2));
  }
  const reversal=await api(`/sales/${id}/void`,{clientOperationId:evidence.voidOperationId,expectedSaleVersion:0,reason:'Cierre del caso ficticio de catálogos offline 20261008'});assert.equal(reversal.state,'voided');
  await client.query('BEGIN READ ONLY');
  const after=await client.query(`SELECT
    (SELECT count(*)::int FROM sales WHERE business_id=$1 AND client_operation_id=$2) AS sale_count,
    (SELECT count(*)::int FROM cash_movements WHERE business_id=$1 AND source_id=$3) AS cash_count,
    (SELECT sum(CASE WHEN direction='in' THEN amount_cents ELSE -amount_cents END)::text FROM cash_movements WHERE business_id=$1 AND source_id=$3) AS cash_net_cents,
    (SELECT count(*)::int FROM audit_events WHERE business_id=$1 AND resource_id=$3 AND action='sale.confirmed') AS confirmations,
    (SELECT count(*)::int FROM audit_events WHERE business_id=$1 AND resource_id=$3 AND action='sale.voided') AS reversals,
    (SELECT count(*)::int FROM inventory_movements WHERE business_id=$1 AND source_id=$3) AS inventory_movements`,[sale.businessId,operationId,id]);
  assert.deepEqual(after.rows[0],{sale_count:1,cash_count:2,cash_net_cents:'0',confirmations:1,reversals:1,inventory_movements:0});
  await client.query('ROLLBACK');
  Object.assign(evidence,{passed:true,afterVoid:after.rows[0]});await writeFile(evidenceFile,JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await client.end();}
