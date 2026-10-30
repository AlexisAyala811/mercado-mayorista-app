import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFile} from 'node:fs/promises';
import {DataSource} from 'typeorm';
import {CommercialCharacteristicEntity} from '../dist/catalog/entities/commercial-characteristic.entity.js';
import {CharacteristicsService} from '../dist/catalog/characteristics.service.js';
import {resolveCommercialSnapshot} from '../dist/catalog/commercial-snapshot.js';
import {AuditService} from '../dist/audit/audit.service.js';
import {AuditEventEntity} from '../dist/audit/audit-event.entity.js';
import {CommercialCharacteristics1791936000024} from '../dist/database/migrations/202610140024-commercial-characteristics.js';
import {OperationCharacteristics1791936000025} from '../dist/database/migrations/202610140025-operation-characteristics.js';
import {AuditEvents1790208000004} from '../dist/database/migrations/202609240004-audit-events.js';

const database=process.env.DATABASE_NAME;
if(!/^mercado_ui_test_[a-f0-9]{32}$/.test(database??''))throw new Error('Expected named isolated QA database.');
const schema=`qa_operation_characteristics_${randomUUID().replaceAll('-','').slice(0,24)}`;
const dataSource=new DataSource({type:'postgres',host:'127.0.0.1',port:55437,username:'mercado_test',password:process.env.DATABASE_PASSWORD,database,schema,entities:[CommercialCharacteristicEntity,AuditEventEntity],synchronize:false,logging:false});
await dataSource.initialize();const runner=dataSource.createQueryRunner();await runner.connect();await runner.startTransaction();
const checks=[];
try{
  await runner.query(`CREATE SCHEMA "${schema}"`);await runner.query(`SET LOCAL search_path TO "${schema}"`);
  await runner.query('CREATE TABLE businesses(id uuid PRIMARY KEY)');await runner.query('CREATE TABLE users(id uuid PRIMARY KEY)');
  await new AuditEvents1790208000004().up(runner);await new CommercialCharacteristics1791936000024().up(runner);
  // Minimal pre-025 operation tables isolate the migration/index contract;
  // full commercial effects are covered separately by service tests.
  await runner.query('CREATE TABLE reception_sacks(id uuid PRIMARY KEY)');
  await runner.query('CREATE TABLE sale_lines(id uuid PRIMARY KEY,sale_id uuid NOT NULL,variety_id uuid NOT NULL,lot_id uuid)');
  await runner.query('CREATE UNIQUE INDEX uq_sale_lines_sale_variety_new ON sale_lines(sale_id,variety_id) WHERE lot_id IS NULL');
  const [businessId,otherBusiness,userId,receptionSack,saleId,varietyId,oldLine]=Array.from({length:7},()=>randomUUID());
  await runner.query('INSERT INTO businesses(id) VALUES($1),($2)',[businessId,otherBusiness]);await runner.query('INSERT INTO users(id) VALUES($1)',[userId]);
  await runner.query('INSERT INTO reception_sacks(id) VALUES($1)',[receptionSack]);
  await runner.query('INSERT INTO sale_lines(id,sale_id,variety_id) VALUES($1,$2,$3)',[oldLine,saleId,varietyId]);
  const migration=new OperationCharacteristics1791936000025();await migration.up(runner);
  assert.deepEqual((await runner.query('SELECT quality_id,quality_name,origin_id,origin_name FROM sale_lines WHERE id=$1',[oldLine]))[0],{quality_id:null,quality_name:null,origin_id:null,origin_name:null});
  checks.push('migration preserves legacy rows as unclassified; no metadata backfill');
  const identity={businessId,businessName:'QA',userId,username:'QA',role:'wholesaler',sessionId:randomUUID(),expiresAt:new Date('2099-01-01')};
  const adapter={transaction:work=>runner.manager.transaction(work)};
  const catalog=new CharacteristicsService(adapter,new AuditService(runner.manager.getRepository(AuditEventEntity),{}),runner.manager.getRepository(CommercialCharacteristicEntity));
  const q1=await catalog.save(identity,'quality','Calidad original');const q2=await catalog.save(identity,'quality','Otra calidad');const origin=await catalog.save(identity,'origin','Origen original');
  const foreign=await catalog.save({...identity,businessId:otherBusiness},'quality','Calidad ajena');
  const captured=await resolveCommercialSnapshot(runner.manager,businessId,{qualityId:q1.id,originId:origin.id});
  await runner.query('INSERT INTO reception_sacks(id,quality_id,quality_name,origin_id,origin_name) VALUES($1,$2,$3,$4,$5)',[randomUUID(),captured.qualityId,captured.qualityName,captured.originId,captured.originName]);
  async function insertLine(snapshot){await runner.query('INSERT INTO sale_lines(id,sale_id,variety_id,quality_id,quality_name,origin_id,origin_name) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),saleId,varietyId,snapshot.qualityId,snapshot.qualityName,snapshot.originId,snapshot.originName]);}
  await insertLine(captured);await insertLine(await resolveCommercialSnapshot(runner.manager,businessId,{qualityId:q2.id,originId:origin.id}));
  assert.equal((await runner.query('SELECT count(*)::int AS n FROM sale_lines WHERE sale_id=$1',[saleId]))[0].n,3);
  async function expectSqlFailure(work,code){await assert.rejects(runner.manager.transaction(work),error=>error.driverError?.code===code);}
  await expectSqlFailure(async()=>insertLine(captured),'23505');
  await expectSqlFailure(async()=>insertLine({qualityId:null,qualityName:null,originId:null,originName:null}),'23505');
  await expectSqlFailure(async manager=>manager.query('INSERT INTO reception_sacks(id,quality_id) VALUES($1,$2)',[randomUUID(),q1.id]),'23514');
  checks.push('same variety accepts distinct characteristics; duplicates including unknown and incomplete snapshots rejected');
  await assert.rejects(resolveCommercialSnapshot(runner.manager,businessId,{qualityId:foreign.id}),error=>error.status===404);
  await assert.rejects(resolveCommercialSnapshot(runner.manager,businessId,{qualityId:origin.id}),error=>error.status===404);
  checks.push('capture resolver rejects foreign businesses and wrong dimensions');
  await catalog.save(identity,'quality','Calidad renombrada',q1.id);await catalog.deactivate(identity,'quality',q1.id);
  assert.deepEqual(await resolveCommercialSnapshot(runner.manager,businessId,{},captured),captured);
  assert.deepEqual(await resolveCommercialSnapshot(runner.manager,businessId,{qualityId:q1.id,originId:origin.id},captured),captured);
  await assert.rejects(resolveCommercialSnapshot(runner.manager,businessId,{qualityId:q1.id}),error=>error.status===404);
  const labels=await runner.query('SELECT quality_name FROM sale_lines WHERE quality_id=$1',[q1.id]);assert.equal(labels[0].quality_name,'Calidad original');
  checks.push('rename/deactivation does not rewrite facts; old correction preserves original labels; new capture requires active options');
  await assert.rejects(migration.down(runner),/características históricas/);
  await runner.rollbackTransaction();assert.equal((await dataSource.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).length,0);
  const evidence={checkedAt:new Date().toISOString(),scope:'migration 025 and real catalog/snapshot resolver; minimal operation schema; full root rollback',checks,commercialFinancialEffectsExecuted:false,uiDatabaseMigrated:false};
  await writeFile(new URL('../../tmp/operation-characteristics-pg-20261014.json',import.meta.url),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{if(runner.isTransactionActive)await runner.rollbackTransaction();await runner.release();await dataSource.destroy();}
