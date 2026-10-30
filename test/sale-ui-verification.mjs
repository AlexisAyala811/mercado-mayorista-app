import assert from 'node:assert/strict';
import {Client} from 'pg';
import {writeFile} from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME??'',/^mercado_ui_test_[a-f0-9]{32}$/);
const token=process.env.MERCADO_QA_TOKEN;
assert.ok(token);
const request=async(path,body)=>{
  const response=await fetch(`http://127.0.0.1:3000/api/v1${path}`,{
    headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},
    ...(body?{method:'POST',body:JSON.stringify(body)}:{})});
  return {status:response.status,body:await response.json()};
};
const list=await request('/sales?limit=100&offset=0');assert.equal(list.status,200);
const sale=list.body.items.find(item=>item.totalAmountCents==='225000' && item.state==='confirmed');
assert.ok(sale,'Expected the fictitious sale confirmed through the UI.');
const detail=await request(`/sales/${sale.id}`);assert.equal(detail.status,200);
assert.equal(detail.body.lines.length,1);const line=detail.body.lines[0];
assert.equal(line.sacks,30);assert.equal(line.weightKg,'1500.000');assert.equal(line.lotId,null);
const payload={clientOperationId:sale.clientOperationId,buyerId:sale.buyerId,
  destinationDepartment:sale.destinationDepartment,discountsCents:0,freightIncludedInTotal:false,
  paymentMode:'cash',installments:[],lines:[{varietyId:line.varietyId,sacks:30,weightKg:'1500',priceBasis:'kilogram',unitPriceCents:150}]};
const replay=await request('/sales',payload);assert.equal(replay.status,201);assert.equal(replay.body.id,sale.id);
const obsolete=await request('/sales',{...payload,lines:[{...payload.lines[0],lotId:sale.id,expectedLotVersion:0}]});assert.equal(obsolete.status,400);
assert.equal((await request('/inventory/lots')).status,410);
const client=new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});
await client.connect();
try {
  const rows=await client.query(`SELECT
    (SELECT count(*)::int FROM cash_movements WHERE business_id=$1 AND source_id=$2) AS cash_count,
    (SELECT count(*)::int FROM inventory_movements WHERE business_id=$1 AND source_id=$2) AS stock_movements,
    (SELECT count(*)::int FROM sale_line_costs WHERE business_id=$1 AND sale_id=$2) AS lot_costs,
    (SELECT count(*)::int FROM audit_events WHERE business_id=$1 AND resource_id=$2 AND action='sale.confirmed') AS confirmations`,[sale.businessId,sale.id]);
  assert.deepEqual(rows.rows[0],{cash_count:1,stock_movements:0,lot_costs:0,confirmations:1});
  const evidence={passed:true,saleId:sale.id,sacks:30,weightKg:'1500.000',totalAmountCents:'225000',
    varietyId:line.varietyId,lotId:null,replayReturnedSameSale:true,obsoleteContractStatus:400,
    inventoryEndpointStatus:410,...rows.rows[0]};
  await writeFile('../tmp/sale-without-inventory-api-2026-10-07.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
}finally{await client.end();}
