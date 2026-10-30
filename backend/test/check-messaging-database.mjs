import 'reflect-metadata';
import 'dotenv/config';
import pg from 'pg';
import { DataSource } from 'typeorm';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Messaging1792972800026 } from '../dist/database/migrations/202610260026-messaging.js';
import { AuditEvents1790208000004 } from '../dist/database/migrations/202609240004-audit-events.js';
import { ShareAttemptEntity } from '../dist/messaging/share-attempt.entity.js';
import { MessagingService } from '../dist/messaging/messaging.service.js';
import { AuditEventEntity } from '../dist/audit/audit-event.entity.js';
import { ProviderEntity } from '../dist/catalog/entities/provider.entity.js';
import { BuyerEntity } from '../dist/catalog/entities/buyer.entity.js';
const host=process.env.DATABASE_HOST??'localhost';
if(!['localhost','127.0.0.1','::1'].includes(host)||process.env.NODE_ENV==='production'){console.log('Prueba de base omitida: configuración no local o de producción.');process.exit(0);}
const options={host,port:Number(process.env.DATABASE_PORT??5432),user:process.env.DATABASE_USER??'mercado',password:process.env.DATABASE_PASSWORD??'',database:process.env.DATABASE_NAME??'mercado',connectionTimeoutMillis:2500};
const admin=new pg.Client(options);let created=false;let data;const name='mercado_messaging_test_'+Date.now();
try{
  await admin.connect();
  assert.match(name,/^mercado_messaging_test_[0-9]+$/);
  await admin.query(`CREATE DATABASE "${name}"`);created=true;
  data=new DataSource({type:'postgres',host:options.host,port:options.port,username:options.user,password:options.password,database:name,entities:[ShareAttemptEntity,AuditEventEntity,ProviderEntity,BuyerEntity],synchronize:false});await data.initialize();
  assert.equal((await data.query('SELECT current_database() AS name'))[0].name,name);
  await data.query('CREATE TABLE businesses(id uuid PRIMARY KEY); CREATE TABLE users(id uuid PRIMARY KEY)');
  const runner=data.createQueryRunner();await runner.connect();
  await new AuditEvents1790208000004().up(runner);await new Messaging1792972800026().up(runner);
  await data.query(`CREATE TABLE buyers(id uuid PRIMARY KEY,business_id uuid NOT NULL,name varchar(160),phone varchar(32),destination_department varchar(160),credit_limit_cents bigint,is_active boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now()); CREATE TABLE providers(id uuid PRIMARY KEY,business_id uuid NOT NULL,name varchar(160),phone varchar(32),is_active boolean DEFAULT true,created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now())`);
  const business='10000000-0000-4000-8000-000000000001',user='10000000-0000-4000-8000-000000000002',buyer='10000000-0000-4000-8000-000000000003';
  await data.query('INSERT INTO businesses VALUES($1)',[business]);await data.query('INSERT INTO users VALUES($1)',[user]);await data.query('INSERT INTO buyers(id,business_id,name) VALUES($1,$2,$3)',[buyer,business,'Cliente de prueba']);
  const audit={record:async(manager,event)=>{const repo=manager.getRepository(AuditEventEntity);await repo.save(repo.create({...event,details:event.details??{}}));}};
  const service=new MessagingService(data,audit,{alerts:async()=>({accountAlerts:[]})});
  const identity={businessId:business,userId:user,role:'wholesaler'};
  const input={clientOperationId:'10000000-0000-4000-8000-000000000004',recipientId:buyer,recipientKind:'buyer',filename:'prueba.pdf',mimeType:'application/pdf',sizeBytes:120,channel:'whatsapp',state:'prepared'};
  await Promise.all(Array.from({length:5},()=>service.record(identity,input)));
  assert.equal(await data.getRepository(ShareAttemptEntity).count(),1);assert.equal(await data.getRepository(AuditEventEntity).count(),1);
  await service.record(identity,{...input,state:'sharing_requested'});await service.record(identity,{...input,state:'sharing_requested'});
  assert.equal(await data.getRepository(AuditEventEntity).count(),2);
  assert.equal((await service.history(business))[0].state,'sharing_requested');
  await assert.rejects(()=>service.record({...identity,businessId:'20000000-0000-4000-8000-000000000001'},{...input,clientOperationId:'20000000-0000-4000-8000-000000000002'}));
  await assert.rejects(()=>new Messaging1792972800026().down(runner));
  const failing=new MessagingService(data,{record:async()=>{throw new Error('audit unavailable');}},{alerts:async()=>({accountAlerts:[]})});
  await assert.rejects(()=>failing.record(identity,{...input,clientOperationId:'30000000-0000-4000-8000-000000000001'}));
  assert.equal(await data.getRepository(ShareAttemptEntity).count(),1);
  await runner.release();
  console.log('Migración PostgreSQL aislada, 5 reintentos concurrentes, auditoría, transición, aislamiento y rollback: correctos.');
  await fs.writeFile('../tmp/messaging-database-verification.json',JSON.stringify({date:new Date().toISOString(),passed:true,checks:['migration','concurrent-idempotency','audit','states','tenant-isolation','audit-rollback','protected-reversal']},null,2));
}catch(error){console.error('Prueba PostgreSQL:',error.code??error.message);process.exitCode=1;}
finally{if(data?.isInitialized)await data.destroy();if(created){assert.match(name,/^mercado_messaging_test_[0-9]+$/);await admin.query(`DROP DATABASE "${name}"`);}await admin.end().catch(()=>{});}
