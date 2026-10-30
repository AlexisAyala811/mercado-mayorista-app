import assert from 'node:assert/strict';
import { Client } from 'pg';
import { writeFile } from 'node:fs/promises';
import { loadHistoricalEvaluationInputs, loadHistoricalPriceSnapshot } from '../dist/analytics/historical-price-snapshots.js';
import { evaluateHistoricalSnapshots } from '../dist/analytics/predictive-engine.js';
assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
const client = new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});
await client.connect();
const business='11111111-1111-4111-8111-111111111111';
const variety='22222222-2222-4222-8222-222222222222';
const foreign='33333333-3333-4333-8333-333333333333';
const id = number => `aaaaaaaa-aaaa-4aaa-8aaa-${String(number).padStart(12,'0')}`;
const query = async (sql, parameters) => (await client.query(sql,parameters)).rows;
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query(`CREATE TEMP TABLE potato_varieties(id uuid,business_id uuid,name text);
    CREATE TEMP TABLE sales(id uuid,business_id uuid,state text,created_at timestamptz,voided_at timestamptz);
    CREATE TEMP TABLE sale_lines(id uuid,sale_id uuid,variety_id uuid,sacks int,weight_kg numeric,subtotal_cents bigint);
    CREATE TEMP TABLE sale_returns(id uuid,sale_id uuid,business_id uuid,created_at timestamptz);
    CREATE TEMP TABLE sale_return_lines(sale_return_id uuid,sale_line_id uuid,returned_sacks int,returned_weight_kg numeric,authorized_gross_cents bigint);`);
  await client.query('INSERT INTO potato_varieties VALUES($1,$2,$3)',[variety,business,'Variedad sintética temporal']);
  for(let week=0;week<26;week++) {
    const stamp = new Date(Date.parse('2026-04-13T17:00:00Z')+week*7*86400000).toISOString();
    for(let sale=0;sale<6;sale++) {
      const operation=id(week*6+sale+1);
      await client.query(`INSERT INTO sales VALUES($1,$2,'confirmed',$3,NULL)`,[operation,business,stamp]);
      await client.query('INSERT INTO sale_lines VALUES($1,$1,$2,1,10,$3)',[operation,variety,week%2?4000:2000]);
    }
  }
  const voided=id(16*6+1), returned=id(17*6+1);
  // Equality belongs to the following period: training before Aug 17 00:00 Lima
  // still includes this sale; the next training cutoff does not.
  await client.query(`UPDATE sales SET state='voided',voided_at='2026-08-17T05:00:00Z' WHERE id=$1`,[voided]);
  for(const [number,stamp] of [[501,'2026-08-17T04:59:59Z'],[502,'2026-08-17T05:00:00Z'],[503,'2026-08-17T06:00:00Z']]) {
    await client.query('INSERT INTO sale_returns VALUES($1,$2,$3,$4)',[id(number),returned,business,stamp]);
    await client.query('INSERT INTO sale_return_lines VALUES($1,$2,0,1,400)',[id(number),returned]);
  }
  const inputs=await loadHistoricalEvaluationInputs(query,business,variety,'2026-10-12');
  const first=inputs.snapshots[0].training;
  const next=inputs.snapshots[1].training;
  assert.ok(first.points.find(point=>point.weekStart==='2026-08-03').operationIds.includes(voided));
  assert.ok(!next.points.find(point=>point.weekStart==='2026-08-03').operationIds.includes(voided));
  const before=first.points.find(point=>point.weekStart==='2026-08-10');
  const after=next.points.find(point=>point.weekStart==='2026-08-10');
  assert.equal(before.weightKg,'59.000');
  assert.deepEqual(before.compensationIds,[id(501)]);
  assert.equal(after.weightKg,'57.000');
  assert.deepEqual(after.compensationIds,[id(501),id(502),id(503)]);
  const evaluation=evaluateHistoricalSnapshots(inputs.folds);
  assert.equal(evaluation.comparisons.length,8);
  assert.equal(evaluation.coveredWeeks,8);
  assert.equal(evaluation.publicationAvailable,false);
  assert.equal((await loadHistoricalPriceSnapshot(query,foreign,variety,'2026-04-13','2026-08-16','2026-08-17')).points.length,0);
  assert.equal((await loadHistoricalPriceSnapshot(query,business,foreign,'2026-04-13','2026-08-16','2026-08-17')).points.length,0);
  // A later compensation cannot rewrite any of these reconstructed snapshots.
  await client.query('INSERT INTO sale_returns VALUES($1,$2,$3,$4)',[id(504),id(1),business,'2026-10-12T05:00:00Z']);
  await client.query('INSERT INTO sale_return_lines VALUES($1,$2,0,1,200)',[id(504),id(1)]);
  const reconstructed=await loadHistoricalEvaluationInputs(query,business,variety,'2026-10-12');
  assert.deepEqual(reconstructed,inputs);
  const evidence={verifiedAt:new Date().toISOString(),transaction:'repeatable-read temporary tables, rollback',snapshots:17,evaluatedWeeks:8,exclusiveLimaBoundary:true,laterVoidDoesNotLeak:true,laterReturnsDoNotLeak:true,businessAndVarietyIsolation:true,commercialPersistentWrites:0,publishedPredictions:0,realBusinessAccuracyTested:false};
  await writeFile('../tmp/historical-prediction-snapshots-2026-10-12.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally {await client.query('ROLLBACK');await client.end();}
