import { AnalyticsService } from '../dist/analytics/analytics.service.js';
import { publicationAvailability } from '../dist/analytics/publication-availability.js';
import { AnalyticsOutcomes1791763200023 } from '../dist/database/migrations/202610120023-analytics-outcomes.js';

// Disposable schema in the named UI test DB. No public commercial/identity writes.

import assert from 'node:assert/strict';

import { randomUUID } from 'node:crypto';

import { Client } from 'pg';

import { writeFile } from 'node:fs/promises';

import { AnalyticsEvaluations1791763200021 } from '../dist/database/migrations/202610120021-analytics-evaluations.js';

import { EvaluationStore } from '../dist/analytics/evaluation-store.js';

import { AnalyticsEvaluationService } from '../dist/analytics/analytics-evaluation.service.js';

import { predictionWindow } from '../dist/analytics/prediction-readiness.js';

import { loadCurrentPredictionSnapshot } from '../dist/analytics/historical-price-snapshots.js';

import { preparePublicationCandidate } from '../dist/analytics/publication-candidate.js';

import { Test } from '@nestjs/testing';

import { UnauthorizedException, ValidationPipe } from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import request from 'supertest';

import { AnalyticsEvaluationController } from '../dist/analytics/analytics-evaluation.controller.js';

import { SessionAuthGuard } from '../dist/identity/http/session-auth.guard.js';

import { RolesGuard } from '../dist/identity/http/roles.guard.js';

import { AnalyticsPublications1791763200022 } from '../dist/database/migrations/202610120022-analytics-publications.js';

import { AnalyticsPublicationService } from '../dist/analytics/analytics-publication.service.js';

import { AnalyticsPublicationController } from '../dist/analytics/analytics-publication.controller.js';

assert.match(process.env.DATABASE_NAME ?? '',/^mercado_ui_test_[a-f0-9]{32}$/);

const options={host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD};

const admin=new Client(options);await admin.connect();

const schema=`qa_analytics_race_${randomUUID().replaceAll('-','')}`;

assert.match(schema,/^qa_analytics_race_[a-f0-9]{32}$/);

let created=false;let transactions=0;let arrivals=0;const collisions=[];let app;

const concurrentId=randomUUID();let release;

const barrier=new Promise(resolve=>{release=resolve;});

const publicationId=randomUUID();let publicationArrivals=0;let releasePublication;

const publicationBarrier=new Promise(resolve=>{releasePublication=resolve;});

const outcomeRequestId=randomUUID();let outcomeArrivals=0;let releaseOutcome;
const outcomeCollisions=[];
const outcomeBarrier=new Promise(resolve=>{releaseOutcome=resolve;});

const operations=[];

try {

  const owner=(await admin.query(`SELECT id,business_id FROM public.users WHERE username=$1 AND role='wholesaler' AND is_active`,['mayorista_visual'])).rows;

  assert.equal(owner.length,1);

  const business=owner[0].business_id;

  const variety=(await admin.query('SELECT id,name FROM public.potato_varieties WHERE business_id=$1 ORDER BY id LIMIT 1',[business])).rows[0];assert.ok(variety);

  const identity={businessId:business,userId:owner[0].id,role:'wholesaler'};

  await admin.query(`CREATE SCHEMA "${schema}"`);created=true;

  await admin.query(`SET search_path TO "${schema}",public`);

  // FK references reuse existing public owner/business. No new user or role.

  await admin.query(`CREATE TABLE potato_varieties(id uuid PRIMARY KEY,business_id uuid,name text);

    CREATE TABLE sales(id uuid PRIMARY KEY,business_id uuid,state text,created_at timestamptz,voided_at timestamptz);

    CREATE TABLE sale_lines(id uuid PRIMARY KEY,sale_id uuid,variety_id uuid,sacks int,weight_kg numeric,subtotal_cents bigint);

    CREATE TABLE sale_returns(id uuid,sale_id uuid,business_id uuid,created_at timestamptz);

    CREATE TABLE sale_return_lines(sale_return_id uuid,sale_line_id uuid,returned_sacks int,returned_weight_kg numeric,authorized_gross_cents bigint);

    CREATE TABLE audit_events(resource_id uuid,action text);`);

  await admin.query('INSERT INTO potato_varieties VALUES($1,$2,$3)',[variety.id,business,variety.name]);

  await new AnalyticsEvaluations1791763200021().up({query:async(sql,parameters)=>(await admin.query(sql,parameters)).rows});

  const publicationRunner={query:async(sql,parameters,structured)=>{const rows=(await admin.query(sql,parameters)).rows;return structured?{records:rows}:rows;}};

  const publicationMigration=new AnalyticsPublications1791763200022();await publicationMigration.up(publicationRunner);await publicationMigration.down(publicationRunner);await publicationMigration.up(publicationRunner);

  const outcomeMigration=new AnalyticsOutcomes1791763200023();await outcomeMigration.up(publicationRunner);await outcomeMigration.down(publicationRunner);await outcomeMigration.up(publicationRunner);

  const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date());

  const window=predictionWindow(asOf);

  for(let week=0;week<26;week++)for(let sale=0;sale<5;sale++) {

    const id=randomUUID();operations.push(id);

    const stamp=new Date(Date.parse(`${window.from}T17:00:00Z`)+week*7*86400000).toISOString();

    await admin.query(`INSERT INTO sales VALUES($1,$2,'confirmed',$3,NULL)`,[id,business,stamp]);

    await admin.query('INSERT INTO sale_lines VALUES($1,$1,$2,1,10,$3)',[id,variety.id,week%2?4000:2000]);

  }

  const adapter={

    query:async(sql,parameters)=>(await admin.query(sql,parameters)).rows,

    transaction:async(isolation,work)=>{

      assert.equal(isolation,'REPEATABLE READ');transactions++;

      const client=new Client(options);await client.connect();
      let outcomeRaceAttempt=false;

      try {

        await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');

        await client.query(`SET LOCAL search_path TO "${schema}",public`);

        const manager={query:async(sql,parameters)=>{

          const rows=(await client.query(sql,parameters)).rows;

          // Both actual DB snapshots observe absence before either inserts.

          if(sql.includes('client_operation_id=$2') && parameters[1]===concurrentId && arrivals<2) {

            arrivals++;if(arrivals===2)release();await barrier;

          }

          if(sql.includes('FROM analytics_publications')&&sql.includes('client_operation_id=$2')&&parameters[1]===publicationId&&publicationArrivals<2){publicationArrivals++;if(publicationArrivals===2)releasePublication();await publicationBarrier;}

          if(sql.includes('FROM analytics_outcomes')&&sql.includes('client_operation_id=$2')&&parameters[1]===outcomeRequestId){
            outcomeRaceAttempt=true;
            if(outcomeArrivals<2){
              assert.equal(rows.length,0);outcomeArrivals++;if(outcomeArrivals===2)releaseOutcome();
              let timeout;
              try{await Promise.race([outcomeBarrier,new Promise((_resolve,reject)=>{timeout=setTimeout(()=>reject(new Error('Outcome race did not reach both database snapshots')),15000);})]);}
              finally{clearTimeout(timeout);}
            }
          }

          return rows;

        }};

        const value=await work(manager);await client.query('COMMIT');return value;

      } catch(error) {if(error.code){collisions.push(error.code);if(outcomeRaceAttempt)outcomeCollisions.push(error.code);}await client.query('ROLLBACK');throw error;}

      finally {await client.end();}

    },

  };

  const audit={record:async(manager,event)=>{await manager.query('INSERT INTO audit_events(resource_id,action) VALUES($1,$2)',[event.resourceId,event.action]);}};

  const store=new EvaluationStore(adapter,audit);

  const service=new AnalyticsEvaluationService(adapter,store);

  const input={clientOperationId:concurrentId,varietyId:variety.id,asOf};

  const [first,other]=await Promise.all([service.create(identity,input),service.create(identity,input)]);

  assert.equal(first.id,other.id);assert.equal(first.inputsHash,other.inputsHash);

  assert.ok(collisions.some(code=>code==='23505'||code==='40001'));assert.ok(transactions>=3);

  assert.equal(first.comparisons.length,8);assert.equal(first.maeSolesPerKg,'1.0000');assert.equal(first.baselineMaeSolesPerKg,'2.0000');

  assert.equal(first.publicationAvailable,false);

  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM analytics_evaluations')).rows[0].count,1);

  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM audit_events')).rows[0].count,1);

  assert.deepEqual(await service.get(identity,first.id),first);

  assert.equal((await service.create(identity,input)).id,first.id);

  await assert.rejects(service.create(identity,{...input,varietyId:randomUUID()}),/otra evaluación/);

  const publications=new AnalyticsPublicationService(adapter,audit);
  const analytics=new AnalyticsService(adapter);
  assert.equal((await analytics.readiness(business,{asOf,varietyId:variety.id})).availability.state,'not_published');

  const preview=await publications.preview(identity,first.id);

  assert.ok(!('priceSolesPerKg' in preview));assert.ok(!('lowerSolesPerKg' in preview));

  const publicationInput={evaluationId:first.id,clientOperationId:publicationId,reviewed:true};

  await assert.rejects(publications.publish(identity,{...publicationInput,reviewed:false}),/revisión/);

  const [published,duplicatePublication]=await Promise.all([publications.publish(identity,publicationInput),publications.publish(identity,publicationInput)]);

  assert.equal(duplicatePublication.id,published.id);

  assert.equal((await admin.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE action='analytics.prediction.published'")).rows[0].count,1);

  assert.equal(published.forecast.publicationAvailable,true);assert.equal(published.forecast.reviewRequired,false);

  assert.equal(published.forecast.priceSolesPerKg,'3.0000');

  assert.equal((await publications.publish(identity,publicationInput)).id,published.id);

  assert.deepEqual(await publications.get(identity,published.id),published);

  assert.equal((await publications.outcome(identity,published.id)).state,'week_in_progress');
  const ready=await analytics.readiness(business,{asOf,varietyId:variety.id});assert.equal(ready.predictionAvailable,true);assert.equal(ready.availability.publicationId,published.id);assert.ok(ready.criteria.filter(row=>['evaluation','coverage','review'].includes(row.id)).every(row=>row.status==='met'));
  const pastCut=new Date(Date.parse(asOf)-86400000).toISOString().slice(0,10);assert.equal((await analytics.readiness(business,{asOf:pastCut,varietyId:variety.id})).availability.state,'not_checked_historical');

  const closedAt=new Date(Date.parse(`${published.forecast.weekEnd}T17:00:00Z`)+86400000).toISOString();

  assert.equal((await adapter.transaction('REPEATABLE READ',manager=>publicationAvailability(manager,business,variety.id,closedAt))).state,'requires_reevaluation');
  class ClosedWeekPublications extends AnalyticsPublicationService{now(){return new Date(closedAt);}}

  const closedWeekPublications=new ClosedWeekPublications(adapter,audit);

  assert.equal((await closedWeekPublications.outcome(identity,published.id)).state,'no_valid_operations');

  const emptyOutcomeId=randomUUID();const emptyOutcome=await closedWeekPublications.saveOutcome(identity,published.id,emptyOutcomeId);

  await assert.rejects(publications.saveOutcome(identity,published.id,randomUUID()),/cierre/);

  const observedSale=randomUUID();operations.push(observedSale);

  await admin.query(`INSERT INTO sales VALUES($1,$2,'confirmed',$3,NULL)`,[observedSale,business,`${published.forecast.weekStart}T17:00:00Z`]);

  await admin.query('INSERT INTO sale_lines VALUES($1,$1,$2,1,10,0)',[observedSale,variety.id]);

  const measured=await closedWeekPublications.outcome(identity,published.id);

  assert.equal(measured.state,'compared');assert.equal(measured.actualSolesPerKg,'0.0000');assert.equal(measured.absoluteErrorSolesPerKg,'3.0000');assert.equal(measured.operationCount,1);

  assert.deepEqual(await closedWeekPublications.saveOutcome(identity,published.id,emptyOutcomeId),emptyOutcome);

  assert.equal(emptyOutcome.result.state,'no_valid_operations');

  const [savedOutcome,duplicateOutcome]=await Promise.all([
    closedWeekPublications.saveOutcome(identity,published.id,outcomeRequestId),
    closedWeekPublications.saveOutcome(identity,published.id,outcomeRequestId),
  ]);
  assert.equal(outcomeArrivals,2);assert.deepEqual(duplicateOutcome,savedOutcome);
  assert.ok(outcomeCollisions.some(code=>code==='23505'||code==='40001'));
  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM analytics_outcomes WHERE business_id=$1 AND client_operation_id=$2',[business,outcomeRequestId])).rows[0].count,1);
  assert.equal((await admin.query("SELECT COUNT(*)::int AS count FROM audit_events WHERE resource_id=$1 AND action='analytics.outcome.saved'",[savedOutcome.id])).rows[0].count,1);

  assert.equal(savedOutcome.result.actualSolesPerKg,'0.0000');

  assert.deepEqual(await publications.getOutcome(identity,published.id,savedOutcome.id),savedOutcome);

  await assert.rejects(publications.getOutcome({...identity,businessId:randomUUID()},published.id,savedOutcome.id),/no disponible/);

  await assert.rejects(publications.getOutcome({...identity,role:'assistant'},published.id,savedOutcome.id),/Mayorista/);

  await assert.rejects(closedWeekPublications.saveOutcome(identity,randomUUID(),emptyOutcomeId),/otra publicación/);

  class FailingOutcome extends ClosedWeekPublications{}

  await assert.rejects(new FailingOutcome(adapter,{record:async()=>{throw new Error('audit unavailable');}}).saveOutcome(identity,published.id,randomUUID()),/audit unavailable/);

  assert.equal((await publications.listOutcomes(identity,published.id,{limit:20,offset:0})).total,2);

  for(let i=0;i<19;i++)await closedWeekPublications.saveOutcome(identity,published.id,randomUUID());

  const outcomePage=await publications.listOutcomes(identity,published.id,{limit:20,offset:0});

  const outcomeLast=await publications.listOutcomes(identity,published.id,{limit:20,offset:20});

  assert.equal(outcomePage.total,21);assert.equal(outcomePage.items.length,20);assert.equal(outcomeLast.items.length,1);

  assert.equal(new Set([...outcomePage.items,...outcomeLast.items].map(row=>row.id)).size,21);

  assert.ok(outcomePage.items.every(row=>!('result' in row)));

  const rawOutcome=(await admin.query('SELECT evidence FROM analytics_outcomes WHERE id=$1',[savedOutcome.id])).rows[0].evidence;

  assert.ok(rawOutcome.snapshot);assert.deepEqual(rawOutcome.result.operationIds,[observedSale]);

  for(const statement of ['UPDATE analytics_outcomes SET evidence=evidence','DELETE FROM analytics_outcomes','TRUNCATE analytics_outcomes'])await assert.rejects(admin.query(statement),/append-only/);

  await assert.rejects(outcomeMigration.down(publicationRunner),/comparaciones conservadas/);

  assert.deepEqual(await publications.get(identity,published.id),published);

  await assert.rejects(publications.get({...identity,businessId:randomUUID()},published.id),/no disponible/);

  await assert.rejects(publications.publish({...identity,role:'assistant'},publicationInput),/Mayorista/);

  const failingPublication=new AnalyticsPublicationService(adapter,{record:async()=>{throw new Error('audit unavailable');}});

  await assert.rejects(failingPublication.publish(identity,{...publicationInput,clientOperationId:randomUUID()}),/audit unavailable/);

  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM analytics_publications')).rows[0].count,1);

  await assert.rejects(publicationMigration.down(publicationRunner),/publicaciones conservadas/);

  for(const statement of ['UPDATE analytics_publications SET forecast=forecast','DELETE FROM analytics_publications','TRUNCATE analytics_publications,analytics_outcomes'])await assert.rejects(admin.query(statement),/append-only/);

  for(let index=0;index<20;index++)await publications.publish(identity,{...publicationInput,clientOperationId:randomUUID()});

  const publicationPage=await publications.list(identity,{varietyId:variety.id,limit:20,offset:0});

  const publicationLast=await publications.list(identity,{varietyId:variety.id,limit:20,offset:20});

  assert.equal(publicationPage.total,21);assert.equal(publicationPage.items.length,20);assert.equal(publicationLast.items.length,1);

  assert.equal(new Set([...publicationPage.items,...publicationLast.items].map(row=>row.id)).size,21);

  assert.ok(publicationPage.items.every(row=>!('forecast' in row)));

  assert.equal((await publications.list({...identity,businessId:randomUUID()},{varietyId:variety.id,limit:20,offset:0})).total,0);

  assert.equal((await publications.list(identity,{varietyId:randomUUID(),limit:20,offset:0})).total,0);

  const reviewTime=new Date().toISOString();

  const sealed=await store.get(business,first.id);

  const current=await loadCurrentPredictionSnapshot(adapter.query,business,variety.id,reviewTime);

  assert.equal(preparePublicationCandidate(sealed,current,reviewTime).reviewRequired,true);

  const returnId=randomUUID();

  await admin.query('INSERT INTO sale_returns VALUES($1,$2,$3,$4)',[returnId,operations[0],business,reviewTime]);

  await admin.query('INSERT INTO sale_return_lines VALUES($1,$2,0,1,200)',[returnId,operations[0]]);

  const atBoundary=await loadCurrentPredictionSnapshot(adapter.query,business,variety.id,reviewTime);

  assert.equal(preparePublicationCandidate(sealed,atBoundary,reviewTime).priceSolesPerKg,'3.0000');

  const afterTime=new Date(Date.parse(reviewTime)+1).toISOString();

  const afterReturn=await loadCurrentPredictionSnapshot(adapter.query,business,variety.id,afterTime);

  assert.throws(()=>preparePublicationCandidate(sealed,afterReturn,afterTime),/entradas comerciales cambiaron/);

  await admin.query('DELETE FROM sale_return_lines WHERE sale_return_id=$1',[returnId]);

  await admin.query('DELETE FROM sale_returns WHERE id=$1',[returnId]);

  await admin.query('UPDATE sale_lines SET subtotal_cents=subtotal_cents+500 WHERE id=$1',[operations[0]]);

  const changedTime=new Date().toISOString();

  const changedSnapshot=await loadCurrentPredictionSnapshot(adapter.query,business,variety.id,changedTime);

  assert.throws(()=>preparePublicationCandidate(sealed,changedSnapshot,changedTime),/entradas comerciales cambiaron/);

  await assert.rejects(publications.publish(identity,{...publicationInput,clientOperationId:randomUUID()}),/entradas comerciales cambiaron/);

  assert.deepEqual(await publications.get(identity,published.id),published);

  const nextId=randomUUID();const next=await service.create(identity,{...input,clientOperationId:nextId});

  assert.notEqual(next.id,first.id);assert.notEqual(next.inputsHash,first.inputsHash);

  assert.deepEqual(await service.get(identity,first.id),first);

  assert.equal((await service.list(identity,{varietyId:variety.id,limit:20,offset:0})).total,2);

  // Real compiled controller, DTO validation and role guard; isolated auth seam

  // only. The production app, sessions, permissions and port 3000 are unchanged.

  const testToken=randomUUID();

  const testAuth={canActivate:context=>{

    const req=context.switchToHttp().getRequest();

    if(req.headers.authorization!==`Bearer ${testToken}`)throw new UnauthorizedException();

    req.identity={...identity,role:req.headers['x-test-role']==='assistant'?'assistant':'wholesaler'};

    return true;

  }};

  const testAudit={recordDirect:async event=>{await admin.query('INSERT INTO audit_events(resource_id,action) VALUES($1,$2)',[event.resourceId,event.action]);}};

  const module=await Test.createTestingModule({controllers:[AnalyticsEvaluationController,AnalyticsPublicationController],providers:[{provide:AnalyticsEvaluationService,useValue:service},{provide:AnalyticsPublicationService,useValue:publications}]})

    .overrideGuard(SessionAuthGuard).useValue(testAuth)

    .overrideGuard(RolesGuard).useValue(new RolesGuard(new Reflector(),testAudit)).compile();

  app=module.createNestApplication();app.useLogger(false);app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ValidationPipe({forbidNonWhitelisted:true,transform:true,whitelist:true}));

  await app.listen(0,'127.0.0.1');

  const http=request(app.getHttpServer());const authorization=`Bearer ${testToken}`;

  const savedResponse=await http.post('/api/v1/analytics/evaluations').set('Authorization',authorization).send(input).expect(201);

  assert.equal(savedResponse.body.id,first.id);

  assert.deepEqual(savedResponse.body,JSON.parse(JSON.stringify(first)));

  const detailResponse=await http.get(`/api/v1/analytics/evaluations/${first.id}`).set('Authorization',authorization).expect(200);

  assert.deepEqual(detailResponse.body,savedResponse.body);

  const listResponse=await http.get(`/api/v1/analytics/evaluations?varietyId=${variety.id}&limit=20&offset=0`).set('Authorization',authorization).expect(200);

  assert.equal(listResponse.body.total,2);assert.ok(listResponse.body.items.every(row=>!('evidence' in row)));

  await http.post('/api/v1/analytics/evaluations').send(input).expect(401);

  await http.post('/api/v1/analytics/evaluations').set('Authorization',authorization).set('x-test-role','assistant').send(input).expect(403);

  await http.post('/api/v1/analytics/evaluations').set('Authorization',authorization).send({...input,clientOperationId:'invalid'}).expect(400);

  await http.post('/api/v1/analytics/publications').set('Authorization',authorization).send({...publicationInput,reviewed:false}).expect(400);

  await http.post('/api/v1/analytics/publications').set('Authorization',authorization).send({...publicationInput,priceSolesPerKg:'99.0000'}).expect(400);

  const publishedResponse=await http.post('/api/v1/analytics/publications').set('Authorization',authorization).send(publicationInput).expect(201);

  assert.equal(publishedResponse.body.id,published.id);

  const readPublication=await http.get(`/api/v1/analytics/publications/${published.id}`).set('Authorization',authorization).expect(200);assert.deepEqual(readPublication.body,publishedResponse.body);

  await http.get(`/api/v1/analytics/publications/${published.id}/outcomes`).set('Authorization',authorization).expect(200).expect(response=>assert.equal(response.body.total,21));
  await http.get(`/api/v1/analytics/publications/${published.id}/outcomes/${savedOutcome.id}`).set('Authorization',authorization).expect(200).expect(response=>assert.equal(response.body.result.actualSolesPerKg,'0.0000'));
  await http.post(`/api/v1/analytics/publications/${published.id}/outcomes`).set('Authorization',authorization).send({clientOperationId:emptyOutcomeId}).expect(201).expect(response=>assert.equal(response.body.id,emptyOutcome.id));
  await http.post(`/api/v1/analytics/publications/${published.id}/outcomes`).set('Authorization',authorization).send({clientOperationId:randomUUID()}).expect(409);
  await http.post(`/api/v1/analytics/publications/${published.id}/outcomes`).set('Authorization',authorization).send({clientOperationId:'invalid'}).expect(400);
  const currentOutcome=await http.get(`/api/v1/analytics/publications/${published.id}/outcome`).set('Authorization',authorization).expect(200);assert.equal(currentOutcome.body.state,'week_in_progress');assert.equal(currentOutcome.body.actualSolesPerKg,null);

  const publicationList=await http.get(`/api/v1/analytics/publications?varietyId=${variety.id}&limit=20&offset=20`).set('Authorization',authorization).expect(200);assert.equal(publicationList.body.total,21);assert.equal(publicationList.body.items.length,1);

  await http.post('/api/v1/analytics/publications').set('Authorization',authorization).send({...publicationInput,clientOperationId:randomUUID()}).expect(409);

  await app.close();app=null;

  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM public.sales WHERE id=ANY($1::uuid[])',[operations])).rows[0].count,0);

  assert.equal((await admin.query('SELECT COUNT(*)::int AS count FROM public.analytics_evaluations WHERE client_operation_id=ANY($1::uuid[])',[[concurrentId,nextId]])).rows[0].count,0);

  const statusAfterChanges=await analytics.readiness(business,{asOf,varietyId:variety.id});assert.equal(statusAfterChanges.predictionAvailable,false);assert.equal(statusAfterChanges.availability.state,'requires_reevaluation');
  const evidence={readinessPublicationReconciled:true,outcomeHttpRecovery:true,outcomeVersionsImmutable:true,outcomeHistoryPages:[20,1],outcomeReplayKeepsOriginal:true,outcomeAuditRollback:true,outcomeSnapshotRetained:true,verifiedAt:new Date().toISOString(),disposableSchema:schema,sourceWeeks:26,sourceSales:130,outcomeTargetSales:1,outcomeOpenWeek:true,outcomeClosedWithoutData:true,outcomeActualZeroCompared:true,outcomePreservesOriginal:true,realConcurrentCollision:collisions,transactions,sameVersionForConcurrentRequest:true,singleAuditForConcurrentRequest:true,savedEvidenceRecoveredUnchanged:true,newRequestNewInputsVersion:true,currentPublicationGuard:true,currentTimestampBoundaryExclusive:true,changedReturnsAndAmountsBlockCandidate:true,publicCommercialWrites:0,publicEvaluationWrites:0,newActorsOrPermissions:0,publicPublishedPredictions:0,isolatedSyntheticPublicationVersions:21,publicationHistoryPages:[20,1],publicationHistoryIsolation:true,publicationSummaryOmitsForecast:true,publicationRaceSameVersion:true,publicationAuditFailureRolledBack:true,publicationMutationBlocked:true,reviewRequiredBeforePublication:true,stalePublicationRejected:true,transport:'compiled service and controller with transaction-scoped pg connections',httpSuccessTested:true,httpSessionGuard:'isolated test seam with ephemeral bearer; production role guard',httpCreateStatus:201,httpDetailStatus:200,httpListStatus:200,httpAnonymousStatus:401,httpAssistantStatus:403,httpInvalidStatus:400,realBusinessAccuracyTested:false};

  await admin.query(`DROP SCHEMA "${schema}" CASCADE`);created=false;

  evidence.disposableSchemaRemoved=true;

  Object.assign(evidence,{outcomeConcurrentArrivals:outcomeArrivals,outcomeConcurrentCollisions:outcomeCollisions,outcomeRaceSameVersionAndEvidence:true,outcomeRaceSingleAudit:true});
  await writeFile('../tmp/analytics-outcome-race-20261015.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));

} finally {

  if(app)await app.close();

  if(created){assert.match(schema,/^qa_analytics_race_[a-f0-9]{32}$/);await admin.query(`DROP SCHEMA "${schema}" CASCADE`);}

  await admin.end();

}

