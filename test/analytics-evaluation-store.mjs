import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { writeFile } from 'node:fs/promises';
import { AnalyticsEvaluations1791763200021 } from '../dist/database/migrations/202610120021-analytics-evaluations.js';
import { EvaluationStore, evaluationInputsHash } from '../dist/analytics/evaluation-store.js';
import { loadHistoricalEvaluationInputs } from '../dist/analytics/historical-price-snapshots.js';
import { evaluateHistoricalSnapshots } from '../dist/analytics/predictive-engine.js';
assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
const client = new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});
await client.connect();
const business=randomUUID(), foreign=randomUUID(), variety=randomUUID(), user=randomUUID();
const schema=`qa_analytics_${randomUUID().replaceAll('-','')}`;
assert.match(schema,/^qa_analytics_[a-f0-9]{32}$/);
const query=async(sql,parameters)=>(await client.query(sql,parameters)).rows;
const runner={query:async(sql,parameters,structured)=>{const rows=await query(sql,parameters);return structured?{records:rows}:rows;}};
const migration=new AnalyticsEvaluations1791763200021();
try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET LOCAL search_path TO "${schema}",public`);
  // Minimal foreign-key fixtures in a rollback-only schema. No login, role,
  // credential, delegation or persistent actor is created.
  await client.query(`CREATE TABLE businesses(id uuid PRIMARY KEY);
    CREATE TABLE users(id uuid PRIMARY KEY);
    CREATE TABLE potato_varieties(id uuid PRIMARY KEY);
    CREATE TABLE audit_events(id uuid DEFAULT gen_random_uuid(),resource_id uuid,action text);`);
  await client.query('INSERT INTO businesses VALUES($1),($2)',[business,foreign]);
  await client.query('INSERT INTO users VALUES($1)',[user]);
  await client.query('INSERT INTO potato_varieties VALUES($1)',[variety]);
  await migration.up(runner);
  await migration.down(runner);
  await migration.up(runner);
  const audit={record:async(_manager,event)=>{await client.query('INSERT INTO audit_events(resource_id,action) VALUES($1,$2)',[event.resourceId,event.action]);}};
  const store=new EvaluationStore({query},audit);
  // Source reconstruction was tested separately against real PostgreSQL.
  // Here fixed synthetic inputs exercise only storage and migration behavior.
  const inputs=await loadHistoricalEvaluationInputs(async(_sql,parameters)=>{
    const rows=[];
    for(let time=Date.parse(parameters[2]);time<=Date.parse(parameters[3]);time+=7*86400000) {
      const weekStart=new Date(time).toISOString().slice(0,10);
      const index=(time-Date.parse('2026-04-13'))/(7*86400000);
      for(let sale=0;sale<5;sale++) rows.push({operationType:'sale',operationId:`${weekStart}-${sale}`,varietyId:variety,varietyName:'Sintética',weekStart,sacks:1,weightKg:'10.000',merchandiseCents:index%2?'4000':'2000',compensationIds:[]});
    }
    return rows;
  },business,variety,'2026-10-12');
  const evidence={inputs,evaluation:evaluateHistoricalSnapshots(inputs.folds)};
  const identity={businessId:business,userId:user};
  const request=randomUUID();
  const first=await store.persist({query},identity,request,evidence);
  assert.equal(first.asOf,'2026-10-12');
  assert.match(first.inputsHash,/^[a-f0-9]{64}$/);
  assert.ok(first.retainUntil>=new Date(Date.UTC(first.createdAt.getUTCFullYear()+5,first.createdAt.getUTCMonth(),first.createdAt.getUTCDate())));
  assert.equal((await store.persist({query},identity,request,evidence)).id,first.id);
  assert.equal((await query('SELECT COUNT(*)::int AS count FROM audit_events',[]))[0].count,1);
  const second=await store.persist({query},identity,randomUUID(),evidence);
  assert.notEqual(first.id,second.id);
  assert.deepEqual((await store.get(business,first.id)).evidence,evidence);
  assert.equal(evaluationInputsHash((await store.get(business,first.id)).evidence.inputs),first.inputsHash);
  await assert.rejects(store.get(foreign,first.id),/Evaluación no disponible/);
  await assert.rejects(store.persist({query},identity,request,{...evidence,inputs:{...inputs,asOf:'2026-10-11'}}),/otra evaluación/);
  await assert.rejects(store.persist({query},{businessId:foreign,userId:user},randomUUID(),evidence),/negocio actual/);
  for(const statement of [
    ['UPDATE analytics_evaluations SET algorithm_version=$1 WHERE id=$2',['changed',first.id]],
    ['DELETE FROM analytics_evaluations WHERE id=$1',[first.id]],
    ['TRUNCATE analytics_evaluations',[]],
  ]) {
    await client.query('SAVEPOINT immutable_check');
    await assert.rejects(client.query(...statement),/append-only/);
    await client.query('ROLLBACK TO SAVEPOINT immutable_check');
  }
  await assert.rejects(migration.down(runner),/evaluaciones conservadas/);
  await client.query('SAVEPOINT retention_check');
  await assert.rejects(client.query(`INSERT INTO analytics_evaluations
    (id,business_id,variety_id,client_operation_id,as_of,algorithm_version,inputs_hash,evidence,created_by_user_id,retain_until)
    SELECT $1,business_id,variety_id,$2,as_of,algorithm_version,inputs_hash,evidence,created_by_user_id,now()+interval '4 years'
    FROM analytics_evaluations WHERE id=$3`,[randomUUID(),randomUUID(),first.id]),/retention/);
  await client.query('ROLLBACK TO SAVEPOINT retention_check');
  const failingRequest=randomUUID();
  await client.query('SAVEPOINT atomic_audit_check');
  const failing=new EvaluationStore({query},{record:async()=>{throw new Error('audit unavailable');}});
  await assert.rejects(failing.persist({query},identity,failingRequest,evidence),/audit unavailable/);
  await client.query('ROLLBACK TO SAVEPOINT atomic_audit_check');
  assert.equal(await store.findRequest({query},business,failingRequest),null);
  for(let index=0;index<19;index++)await store.persist({query},identity,randomUUID(),evidence);
  const listings=new EvaluationStore({query,transaction:async(_isolation,work)=>work({query})},audit);
  const firstPage=await listings.list(business,{varietyId:variety,limit:20,offset:0});
  const lastPage=await listings.list(business,{varietyId:variety,limit:20,offset:20});
  assert.equal(firstPage.total,21);assert.equal(firstPage.items.length,20);assert.equal(lastPage.items.length,1);
  assert.equal(new Set([...firstPage.items,...lastPage.items].map(row=>row.id)).size,21);
  assert.ok(!('evidence' in firstPage.items[0]));
  assert.equal((await listings.list(foreign,{varietyId:variety,limit:20,offset:0})).total,0);
  assert.equal((await listings.list(business,{varietyId:foreign,limit:20,offset:0})).total,0);
  const result={verifiedAt:new Date().toISOString(),migrationAppliedInsideRollbackSchema:true,emptyMigrationReversible:true,populatedMigrationReversalRejected:true,immutableUpdateDeleteAndTruncate:true,requestReplaySameVersion:true,newRequestNewVersion:true,canonicalHashAfterJsonbRoundTrip:true,auditPerVersion:true,auditFailureRolledBack:true,businessIsolation:true,retentionMinimumYears:5,shorterRetentionRejected:true,listTotal:21,listPageOne:20,listPageTwo:1,summaryOmitsEvidence:true,listBusinessAndVarietyIsolation:true,commercialPersistentWrites:0,publishedPredictions:0};
  await writeFile('../tmp/analytics-evaluation-store-2026-10-12.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result));
} finally {await client.query('ROLLBACK');await client.end();}
