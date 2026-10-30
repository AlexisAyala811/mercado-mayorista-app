import assert from 'node:assert/strict';
import {Client} from 'pg';
import {writeFile} from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_QA_TOKEN);
const operationId='1567a276-83f9-4183-9f01-cbc916ca9d1f';
const get=async(path)=>{
  const response=await fetch(`http://127.0.0.1:3000/api/v1${path}`,{headers:{Authorization:`Bearer ${process.env.MERCADO_QA_TOKEN}`}});
  assert.equal(response.status,200);return response.json();
};
const recovery=await get(`/operations/${operationId}?type=sale`);
const {sale,lines}=await get(`/sales/${recovery.resourceId}`);
assert.equal(sale.clientOperationId,operationId);
assert.equal(sale.driverName,'QA venta offline 20261007');
assert.equal(sale.totalAmountCents,'23250');assert.equal(sale.state,'confirmed');
assert.equal(lines.length,1);assert.equal(lines[0].sacks,3);assert.equal(lines[0].weightKg,'150.000');assert.equal(lines[0].unitPriceCents,'155');assert.equal(lines[0].lotId,null);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});await client.connect();
try{
  const counts=await client.query(`SELECT
    (SELECT count(*)::int FROM sales WHERE business_id=$1 AND client_operation_id=$2) AS sale_count,
    (SELECT count(*)::int FROM cash_movements WHERE business_id=$1 AND source_id=$3) AS cash_count,
    (SELECT count(*)::int FROM audit_events WHERE business_id=$1 AND resource_id=$3 AND action='sale.confirmed') AS confirmations,
    (SELECT count(*)::int FROM inventory_movements WHERE business_id=$1 AND source_id=$3) AS stock_movements`,[sale.businessId,operationId,sale.id]);
  assert.deepEqual(counts.rows[0],{sale_count:1,cash_count:1,confirmations:1,stock_movements:0});
  const evidence={passed:true,operationId,saleId:sale.id,sacks:3,weightKg:'150.000',unitPriceCents:'155',totalAmountCents:'23250',lotId:null,...counts.rows[0]};
  await writeFile('../tmp/sale-offline-restart-api-2026-10-07.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{await client.end();}
