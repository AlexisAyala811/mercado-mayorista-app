// Isolated PostgreSQL verification. Temporary tables vanish on rollback;
// this script never writes public business data or creates predictions.
import 'reflect-metadata';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { ReportsService } from '../dist/reports/reports.service.js';
import { AnalyticsService } from '../dist/analytics/analytics.service.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
const client = new Client({ host: '127.0.0.1', port: 55437,
  user: 'mercado_test', database: process.env.DATABASE_NAME,
  password: process.env.DATABASE_PASSWORD });
await client.connect();
// ReportsService issues independent queries concurrently; serialize them on
// this single transaction connection (production uses its connection pool).
let pending = Promise.resolve();
const query = (sql, parameters) => {
  const result = pending.then(() => client.query(sql, parameters));
  pending = result.then(() => undefined);
  return result.then(response => response.rows);
};
const business = '11111111-1111-4111-8111-111111111111';
const variety = '22222222-2222-4222-8222-222222222222';
const provider = '33333333-3333-4333-8333-333333333333';
try {
  await client.query('BEGIN');
  await client.query(`
    CREATE TEMP TABLE purchase_settlements (id uuid, business_id uuid, reception_id uuid,
      state text, created_at timestamptz, price_basis text, unit_price_cents bigint,
      liquid_amount_cents bigint, freight_amount_cents bigint);
    CREATE TEMP TABLE receptions (id uuid, business_id uuid, provider_id uuid);
    CREATE TEMP TABLE reception_sacks (reception_id uuid, business_id uuid, variety_id uuid,
      net_weight_kg numeric(12,3), voided_at timestamptz);
    CREATE TEMP TABLE potato_varieties (id uuid, business_id uuid, name text);
    CREATE TEMP TABLE providers (id uuid, business_id uuid, name text);
    CREATE TEMP TABLE sales (id uuid, business_id uuid, buyer_id uuid, state text,
      created_at timestamptz, total_amount_cents bigint, freight_amount_cents bigint);
    CREATE TEMP TABLE sale_lines (id uuid, sale_id uuid, lot_id uuid, variety_id uuid, price_basis text,
      unit_price_cents bigint, sacks int, weight_kg numeric, subtotal_cents bigint);
    CREATE TEMP TABLE inventory_lots (id uuid, business_id uuid, variety_id uuid);
    CREATE TEMP TABLE buyers (id uuid, business_id uuid, name text);
    CREATE TEMP TABLE sale_return_lines (sale_return_id uuid, sale_line_id uuid,
      returned_sacks int, returned_weight_kg numeric, authorized_gross_cents bigint);
    CREATE TEMP TABLE sale_returns (id uuid, sale_id uuid, business_id uuid, created_at timestamptz);
    CREATE TEMP TABLE accounts (business_id uuid, kind text, state text, balance_cents bigint);
    CREATE TEMP TABLE cash_movements (business_id uuid, created_at timestamptz, direction text, amount_cents bigint);
    CREATE TEMP TABLE stowage_settlements (business_id uuid, created_at timestamptz, total_amount_cents bigint);
  `);
  await client.query('INSERT INTO potato_varieties VALUES ($1,$2,$3)', [variety,business,'Variedad QA']);
  await client.query('INSERT INTO providers VALUES ($1,$2,$3)', [provider,business,'Proveedor QA']);
  // Civil day October 7 in Lima is [05:00Z Oct 7, 05:00Z Oct 8).
  const instants = ['2026-10-07T04:59:59Z','2026-10-07T05:00:00Z',
    '2026-10-08T04:59:59Z','2026-10-08T05:00:00Z'];
  const includedIds = [];
  for (let index=0; index<instants.length; index++) {
    const id = `44444444-4444-4444-8444-${String(index+1).padStart(12,'0')}`;
    if(index===1 || index===2) includedIds.push(id);
    await client.query('INSERT INTO receptions VALUES ($1,$2,$3)', [id,business,provider]);
    await client.query(`INSERT INTO purchase_settlements VALUES ($1,$2,$1,'confirmed',$3,'kilogram',250,7000,100)`, [id,business,instants[index]]);
    await client.query(`INSERT INTO reception_sacks VALUES ($1,$2,$3,10,NULL),($1,$2,$3,20,NULL),($1,$2,$3,999,now())`, [id,business,variety]);
  }
  const reports = new ReportsService({query});
  const period = {from:'2026-10-07',to:'2026-10-07'};
  const summary = await reports.commercialSummary(business,period);
  assert.deepEqual(summary.purchases,{count:2,liquidAmountCents:'14000'});
  const history = await reports.priceHistory(business,{...period,varietyId:variety});
  assert.deepEqual(history.items.map(row=>row.operationId).sort(), includedIds.sort());
  assert.equal(history.items.length,2); // Two sacks do not duplicate a price observation.
  const series = await new AnalyticsService({query}).series(business,{...period,varietyId:variety});
  assert.equal(series.points.length,1);
  assert.equal(series.points[0].sacks,4);
  assert.equal(series.points[0].weightKg,'60.000');
  assert.equal(series.points[0].merchandiseCents,'15000');
  assert.equal(series.points[0].priceSolesPerKg,'2.5000');
  // Participant filters apply independently to purchases and sales. All rows
  // here are temporary and are removed by the existing rollback below.
  const otherProvider = '66666666-6666-4666-8666-666666666666';
  const buyer = '77777777-7777-4777-8777-777777777777';
  const otherBuyer = '88888888-8888-4888-8888-888888888888';
  const saleId = '99999999-9999-4999-8999-999999999999';
  await client.query(`INSERT INTO sales VALUES ($1,$2,$3,'confirmed','2026-10-07T12:00:00Z',10000,0)`, [saleId,business,buyer]);
  await client.query(`INSERT INTO sale_lines VALUES ($1,$1,NULL,$2,'kilogram',500,1,20,10000)`, [saleId,variety]);
  const analytics = new AnalyticsService({query});
  const selected = await analytics.series(business,{...period,providerId:provider,buyerId:buyer});
  assert.equal(selected.points.length,2);
  assert.deepEqual(selected.filters,{...period,varietyId:null,providerId:provider,buyerId:buyer});
  const purchasesOnly = await analytics.series(business,{...period,buyerId:otherBuyer});
  assert.deepEqual(purchasesOnly.points.map(point=>point.operationType),['purchase']);
  const salesOnly = await analytics.series(business,{...period,providerId:otherProvider});
  assert.deepEqual(salesOnly.points.map(point=>point.operationType),['sale']);
  const neither = await analytics.series(business,{...period,providerId:otherProvider,buyerId:otherBuyer});
  assert.equal(neither.points.length,0);
  const foreignBusiness = '55555555-5555-4555-8555-555555555555';
  assert.equal((await analytics.series(foreignBusiness,{...period,providerId:provider,buyerId:buyer})).points.length,0);
  assert.equal((await analytics.series(business,{...period,varietyId:otherProvider})).points.length,0);
  await client.query(`ALTER TABLE providers ADD is_active boolean DEFAULT true;
    ALTER TABLE buyers ADD is_active boolean DEFAULT true;
    ALTER TABLE potato_varieties ADD is_active boolean DEFAULT true;`);
  await client.query('UPDATE providers SET is_active=false WHERE id=$1',[provider]);
  await client.query('INSERT INTO buyers VALUES ($1,$2,$3,false)',[buyer,business,'Comprador histórico']);
  await client.query('UPDATE potato_varieties SET is_active=false WHERE id=$1',[variety]);
  assert.equal((await analytics.series(business,{...period,providerId:provider,buyerId:buyer,varietyId:variety})).points.length,2);
  for(const [kind,id] of [['providers',provider],['buyers',buyer],['varieties',variety]]) {
    const options=await analytics.filterOptions(business,kind,{limit:100,offset:0});
    assert.equal(options.total,1);
    assert.deepEqual(Object.keys(options.items[0]).sort(),['id','isActive','name']);
    assert.equal(options.items[0].id,id);
    assert.equal(options.items[0].isActive,false);
    assert.equal((await analytics.filterOptions(foreignBusiness,kind,{limit:100,offset:0})).total,0);
  }
  await client.query(`INSERT INTO providers SELECT ('aaaa0000-0000-4000-8000-' || lpad(i::text,12,'0'))::uuid,$1,'Mismo nombre',false FROM generate_series(1,101) i`,[business]);
  const first=await analytics.filterOptions(business,'providers',{limit:100,offset:0});
  const second=await analytics.filterOptions(business,'providers',{limit:100,offset:100});
  assert.equal(first.total,102);
  assert.equal(second.items.length,2);
  assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,102);
  assert.equal((await reports.priceHistory('55555555-5555-4555-8555-555555555555',period)).items.length,0);
  console.log(JSON.stringify({passed:true,dayBoundary:'America/Lima',purchaseCount:2,
    distinctPrices:2,sacks:4,weightKg:'60.000',merchandiseCents:'15000',
    inventoryLots:0,independentParticipantFilters:true,participantBusinessIsolation:true,historicalInactiveFilters:true,historicalPaginationTotal:102,persistentBusinessWrites:0}));
} finally {
  await client.query('ROLLBACK');
  await client.end();
}
