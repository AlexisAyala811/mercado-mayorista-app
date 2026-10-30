// Real projection queries over synthetic isolated facts; no commercial service mutations.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import { AnalyticsService } from '../dist/analytics/analytics.service.js';
import { AnalyticsController } from '../dist/analytics/analytics.controller.js';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SessionAuthGuard } from '../dist/identity/http/session-auth.guard.js';
import { RolesGuard } from '../dist/identity/http/roles.guard.js';
import { SessionIdentityReader } from '../dist/identity/application/ports/session-identity-reader.js';
import { SessionTokenService } from '../dist/identity/security/session-token.service.js';
import { AuditService } from '../dist/audit/audit.service.js';
import { configureHttpApplication } from '../dist/configure-http-application.js';
import request from 'supertest';

const database = process.env.DATABASE_NAME;
if (!/^mercado_ui_test_[a-f0-9]{32}$/.test(database ?? '')) throw new Error('Expected named isolated QA database.');
const schema = `qa_analytics_characteristics_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
const ds = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55437, username: 'mercado_test', password: process.env.DATABASE_PASSWORD, database, synchronize: false, logging: false });
await ds.initialize();
const runner = ds.createQueryRunner(); await runner.connect(); await runner.startTransaction();
const checks = [];
let app;
try {
  await runner.query(`CREATE SCHEMA "${schema}"`);
  await runner.query(`SET LOCAL search_path TO "${schema}"`);
  // Minimal read model matching the columns of the production projection, not full financial schema.
  for (const sql of [
    'CREATE TABLE commercial_characteristics(id uuid PRIMARY KEY,business_id uuid,kind text,name text,is_active boolean)',
    'CREATE TABLE potato_varieties(id uuid PRIMARY KEY,business_id uuid,name text)',
    'CREATE TABLE receptions(id uuid PRIMARY KEY,business_id uuid,provider_id uuid)',
    'CREATE TABLE purchase_settlements(id uuid PRIMARY KEY,business_id uuid,reception_id uuid,created_at timestamptz,state text,price_basis text,unit_price_cents bigint)',
    'CREATE TABLE reception_sacks(id uuid PRIMARY KEY,business_id uuid,reception_id uuid,variety_id uuid,net_weight_kg numeric(16,3),voided_at timestamptz,quality_id uuid,origin_id uuid)',
    'CREATE TABLE sales(id uuid PRIMARY KEY,business_id uuid,buyer_id uuid,created_at timestamptz,state text)',
    'CREATE TABLE sale_lines(id uuid PRIMARY KEY,sale_id uuid,variety_id uuid,sacks int,weight_kg numeric(16,3),subtotal_cents bigint,quality_id uuid,origin_id uuid)',
    'CREATE TABLE sale_returns(id uuid PRIMARY KEY,business_id uuid,sale_id uuid,created_at timestamptz)',
    'CREATE TABLE sale_return_lines(id uuid PRIMARY KEY,sale_return_id uuid,sale_line_id uuid,returned_sacks int,returned_weight_kg numeric(16,3),authorized_gross_cents bigint)',
  ]) await runner.query(sql);
  const [business, foreignBusiness, variety, foreignVariety, qualityA, qualityB, originA, originB, foreignQuality, reception, purchase, sale, secondSale, lineA, lineB, lineUnknown, secondLine, provider, buyer, priorReturn, futureReturn, foreignSale] = Array.from({ length: 22 }, () => randomUUID());
  for (const [id, owner, kind, name, active] of [
    [qualityA, business, 'quality', 'Calidad renombrada', false], [qualityB, business, 'quality', 'Segunda', true],
    [originA, business, 'origin', 'Junín', true], [originB, business, 'origin', 'Huánuco', false],
    [foreignQuality, foreignBusiness, 'quality', 'Calidad ajena', true],
  ]) await runner.query('INSERT INTO commercial_characteristics VALUES($1,$2,$3,$4,$5)', [id, owner, kind, name, active]);
  await runner.query('INSERT INTO potato_varieties VALUES($1,$2,$3),($4,$5,$3)', [variety, business, 'Canchán', foreignVariety, foreignBusiness]);
  await runner.query('INSERT INTO receptions VALUES($1,$2,$3)', [reception, business, provider]);
  await runner.query("INSERT INTO purchase_settlements VALUES($1,$2,$3,'2026-10-07T15:00:00Z','confirmed','kilogram',100)", [purchase, business, reception]);
  for (const [weight, q, o] of [['10.001', qualityA, originA], ['20.002', qualityA, originA], ['40.000', qualityB, originB], ['30.000', null, null]]) {
    await runner.query('INSERT INTO reception_sacks VALUES($1,$2,$3,$4,$5,NULL,$6,$7)', [randomUUID(), business, reception, variety, weight, q, o]);
  }
  // Voided sack must not reappear when filtering.
  await runner.query("INSERT INTO reception_sacks VALUES($1,$2,$3,$4,999,'2026-10-08T15:00:00Z',$5,$6)", [randomUUID(), business, reception, variety, qualityA, originA]);
  for (const [id, owner] of [[sale, business], [secondSale, business], [foreignSale, foreignBusiness]]) {
    await runner.query("INSERT INTO sales VALUES($1,$2,$3,'2026-10-07T16:00:00Z','confirmed')", [id, owner, buyer]);
  }
  for (const [id, sourceSale, v, sacks, weight, amount, q, o] of [
    [lineA, sale, variety, 2, '20.000', 4000, qualityA, originA],
    [lineB, sale, variety, 1, '10.000', 4000, qualityB, originB],
    [lineUnknown, sale, variety, 1, '5.000', 1500, null, null],
    [secondLine, secondSale, variety, 1, '8.000', 1600, qualityA, originB],
    [randomUUID(), foreignSale, foreignVariety, 9, '999.000', 99900, foreignQuality, null],
  ]) await runner.query('INSERT INTO sale_lines VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [id, sourceSale, v, sacks, weight, amount, q, o]);
  for (const [id, date, weight, amount] of [[priorReturn, '2026-10-10T16:00:00Z', '5.000', 1000], [futureReturn, '2026-10-15T16:00:00Z', '1.000', 200]]) {
    await runner.query('INSERT INTO sale_returns VALUES($1,$2,$3,$4)', [id, business, sale, date]);
    await runner.query('INSERT INTO sale_return_lines VALUES($1,$2,$3,0,$4,$5)', [randomUUID(), id, lineA, weight, amount]);
  }
  const service = new AnalyticsService({ query: (sql, parameters) => runner.query(sql, parameters) });
  const period = { from: '2026-10-01', to: '2026-10-14' };
  const series = (extra = {}) => service.series(business, { ...period, ...extra });
  const point = (result, kind) => result.points.find(item => item.operationType === kind);
  const all = await series();
  assert.equal(point(all, 'purchase').weightKg, '100.003'); assert.equal(point(all, 'purchase').merchandiseCents, '10000');
  assert.equal(point(all, 'sale').weightKg, '38.000'); assert.equal(point(all, 'sale').merchandiseCents, '10100');
  assert.equal(point(all, 'sale').operationCount, 2); assert.deepEqual(point(all, 'sale').compensationIds, [priorReturn]);
  checks.push('unfiltered totals preserved, distinct sales counted across multiple lines, only compensation before cutoff included');
  const known = await series({ qualityId: qualityA.toUpperCase(), originId: originA });
  assert.equal(point(known, 'purchase').weightKg, '30.003'); assert.equal(point(known, 'purchase').sacks, 2); assert.equal(point(known, 'purchase').merchandiseCents, '3000');
  assert.equal(point(known, 'sale').weightKg, '15.000'); assert.equal(point(known, 'sale').merchandiseCents, '3000'); assert.equal(point(known, 'sale').operationCount, 1);
  assert.equal(known.filters.qualityId, qualityA.toUpperCase());
  checks.push('AND filters run before purchase aggregation and preserve original sale characteristics through returns; UUID case accepted');
  const unknown = await series({ qualityId: 'unreported', originId: 'unreported' });
  assert.equal(point(unknown, 'purchase').weightKg, '30.000'); assert.equal(point(unknown, 'sale').weightKg, '5.000');
  assert.deepEqual(point(unknown, 'sale').compensationIds, []);
  assert.equal((await series({ qualityId: qualityA, originId: 'unreported' })).points.length, 0);
  assert.equal((await series({ qualityId: foreignQuality })).points.length, 0);
  assert.equal((await series({ qualityId: originA })).points.length, 0);
  checks.push('unknown is not all; mixed filters, foreign business and wrong-dimension IDs do not leak facts');
  const before = await series({ qualityId: qualityA });
  await runner.query("UPDATE commercial_characteristics SET name='Otro nombre',is_active=false WHERE id=$1", [qualityA]);
  assert.deepEqual((await series({ qualityId: qualityA })).points, before.points);
  const options = await service.characteristicOptions(business, 'quality', { limit: 1, offset: 0 });
  const next = await service.characteristicOptions(business, 'quality', { limit: 1, offset: 1 });
  assert.equal(options.total, 2); assert.equal(next.total, 2); assert.equal(options.items.length, 1); assert.equal(next.items.length, 1);
  assert.equal([...options.items, ...next.items].find(item => item.id === qualityA).isActive, false);
  const origins = await service.characteristicOptions(business, 'origin', { limit: 100, offset: 0 });
  assert.equal(origins.total, 2); assert.ok(origins.items.every(item => [originA, originB].includes(item.id)));
  checks.push('renamed and inactive catalog options preserve historical projections; pages scoped by business and dimension');
  const later = await series({ to: '2026-10-15', qualityId: qualityA, originId: originA });
  assert.equal(point(later, 'sale').weightKg, '14.000'); assert.equal(point(later, 'sale').merchandiseCents, '2800');
  assert.deepEqual(new Set(point(later, 'sale').compensationIds), new Set([priorReturn, futureReturn]));
  checks.push('later cutoff incorporates only the original line segment compensation');
  // Real HTTP controller, validation, session token hashing and roles guards.
  // Only the session identity port and audit sink are explicit in-memory adapters.
  const tokens = new SessionTokenService();
  const ownerToken = `qa-owner-${randomUUID()}`;
  const assistantToken = `qa-assistant-${randomUUID()}`;
  const identities = new Map([
    [tokens.hash(ownerToken), { businessId: business, userId: randomUUID(), role: 'wholesaler' }],
    [tokens.hash(assistantToken), { businessId: business, userId: randomUUID(), role: 'assistant' }],
  ]);
  const denied = [];
  const module = await Test.createTestingModule({
    controllers: [AnalyticsController],
    providers: [
      { provide: AnalyticsService, useValue: service },
      { provide: SessionIdentityReader, useValue: { findActiveByTokenHash: async hash => identities.get(hash) } },
      { provide: SessionTokenService, useValue: tokens },
      { provide: AuditService, useValue: { recordDirect: async event => { denied.push(event); } } },
      { provide: ConfigService, useValue: { getOrThrow: key => key === 'CORS_ORIGINS' ? 'http://localhost:8087' : false } },
      SessionAuthGuard, RolesGuard,
    ],
  }).compile();
  app = module.createNestApplication(); app.useLogger(false); configureHttpApplication(app); await app.init();
  for (const route of ['/analytics/filters/qualities', '/analytics/filters/origins', '/analytics/series?from=2026-10-01&to=2026-10-14']) {
    await request(app.getHttpServer()).get(`/api/v1${route}`).expect(401);
    await request(app.getHttpServer()).get(`/api/v1${route}`).set('Authorization', `Bearer ${assistantToken}`).expect(403);
    await request(app.getHttpServer()).get(`/api/v1${route}`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  }
  assert.equal(denied.length, 3); assert.ok(denied.every(event => event.action === 'authorization.denied' && event.businessId === business));
  for (const kind of ['qualities', 'origins']) {
    const page = await request(app.getHttpServer()).get(`/api/v1/analytics/filters/${kind}?limit=1&offset=1`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
    assert.equal(page.body.total, 2); assert.equal(page.body.offset, 1); assert.equal(page.body.items.length, 1);
    for (const invalid of ['limit=0', 'limit=101', 'offset=-1']) {
      await request(app.getHttpServer()).get(`/api/v1/analytics/filters/${kind}?${invalid}`).set('Authorization', `Bearer ${ownerToken}`).expect(400);
    }
  }
  const httpSeries = await request(app.getHttpServer()).get(`/api/v1/analytics/series?from=2026-10-01&to=2026-10-14&qualityId=unreported&originId=unreported`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  assert.deepEqual(httpSeries.body.points, unknown.points);
  for (const invalid of ['qualityId=all', 'originId=not-a-uuid', 'qualityId=unreported&qualityId=unreported', 'qualityName=Inventada']) {
    await request(app.getHttpServer()).get(`/api/v1/analytics/series?from=2026-10-01&to=2026-10-14&${invalid}`).set('Authorization', `Bearer ${ownerToken}`).expect(400);
  }
  await request(app.getHttpServer()).get(`/api/v1/analytics/readiness?asOf=2026-10-14&varietyId=${variety}&qualityId=unreported`).set('Authorization', `Bearer ${ownerToken}`).expect(400);
  checks.push('HTTP real controller/session-token/role guards and global validation: 401 anonymous, 403 assistant with audit, 200 owner; pagination and malformed/repeated/unknown filters rejected; readiness rejects descriptive filters');
  await app.close(); app = undefined;
  await runner.rollbackTransaction();
  assert.equal((await ds.query('SELECT 1 FROM pg_namespace WHERE nspname=$1', [schema])).length, 0);
  const evidence = { checkedAt: new Date().toISOString(), scope: 'real AnalyticsService queries and HTTP controller/guards/validation; in-memory session port/audit sink; isolated minimal read model; full rollback', checks, uiDatabaseMigrated: false, commercialServiceMutationsExecuted: false };
  await writeFile(new URL('../../tmp/analytics-characteristics-pg-20261014.json', import.meta.url), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally { if (app) await app.close(); if (runner.isTransactionActive) await runner.rollbackTransaction(); await runner.release(); await ds.destroy(); }
