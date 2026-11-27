import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { configureHttpApplication } from '../src/configure-http-application.js';
import { BusinessEntity, BusinessKind } from '../src/modules/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/modules/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/modules/identity/security/password-hasher.js';
import { AuditEventEntity } from '../src/shared/audit/audit-event.entity.js';

// Spec 023 on PostgreSQL: the Administrator manages merchant accounts and
// gives support (suspend, reactivate, temporary password, close sessions)
// without reaching any merchant operation.
describe('Merchant administration (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let platformId: string;
  let adminToken: string;
  const prefix = `adm-${randomUUID().slice(0, 8)}`;
  const adminPassword = `Admin-${randomUUID()}`;
  const temporaryPassword = `Temporal-${randomUUID()}`;
  const finalPassword = `Propia-${randomUUID()}`;
  const wholesalerName = `${prefix}-mayorista`;

  const http = () => request(app.getHttpServer());
  const as = (token: string) => ({
    get: (path: string) => http().get(`/api/v1${path}`).set('Authorization', `Bearer ${token}`),
    patch: (path: string, body: object) => http().patch(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
    post: (path: string, body: object) => http().post(`/api/v1${path}`).set('Authorization', `Bearer ${token}`).send(body),
  });
  const login = (username: string, password: string) => http().post('/api/v1/auth/sessions').send({ password, username });

  beforeAll(async () => {
    dataSource = (await import('../src/platform/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
    const { AppModule } = await import('../src/app.module.js');
    // Loaded after Nest itself: a static import forms a require(esm) cycle.
    const { getStorageToken } = await import('@nestjs/throttler');
    // This suite signs in many times; the login limit has its own tests.
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(getStorageToken())
      .useValue({ increment: () => Promise.resolve({ isBlocked: false, timeToBlockExpire: 0, timeToExpire: 60_000, totalHits: 1 }) })
      .compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app);
    await app.init();

    const businesses = dataSource.getRepository(BusinessEntity);
    const platform =
      (await businesses.findOne({ where: { kind: BusinessKind.Platform } })) ??
      (await businesses.save({ displayName: 'Soporte MAÑAY', isActive: true, kind: BusinessKind.Platform }));
    platformId = platform.id;
    await dataSource.getRepository(UserEntity).save({
      businessId: platform.id, isActive: true, passwordHash: await new PasswordHasher().hash(adminPassword), role: UserRole.Admin, username: `${prefix}-admin`,
    });
    adminToken = (await login(`${prefix}-admin`, adminPassword).expect(201)).body.accessToken as string;
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  let merchantId: string;
  let wholesalerToken: string;

  it('creates a merchant once per clientOperationId and rejects a reused id with other data', async () => {
    const clientOperationId = randomUUID();
    const body = { businessName: `Comercial ${prefix}`, clientOperationId, temporaryPassword, username: wholesalerName };
    const created = (await as(adminToken).post('/admin/merchants', body).expect(201)).body;
    expect(created).toMatchObject({ displayName: `Comercial ${prefix}`, isActive: true, wholesaler: { mustChangePassword: true, username: wholesalerName } });
    expect(JSON.stringify(created)).not.toContain(temporaryPassword);
    merchantId = created.id as string;

    const replay = (await as(adminToken).post('/admin/merchants', body).expect(201)).body;
    expect(replay.id).toBe(merchantId);
    expect(await dataSource.getRepository(BusinessEntity).countBy({ displayName: `Comercial ${prefix}` })).toBe(1);

    const conflict = await as(adminToken).post('/admin/merchants', { ...body, businessName: 'Otro' }).expect(409);
    expect(conflict.body.code).toBe('operation-id-conflict');

    const taken = await as(adminToken).post('/admin/merchants', { ...body, businessName: 'Otro', clientOperationId: randomUUID() }).expect(409);
    expect(taken.body.code).toBe('username-taken');
  });

  it('forces the wholesaler to create a password before anything else', async () => {
    const session = (await login(wholesalerName, temporaryPassword).expect(201)).body;
    expect(session.user.mustChangePassword).toBe(true);
    wholesalerToken = session.accessToken as string;

    await as(wholesalerToken).get('/auth/session').expect(200);
    const blocked = await as(wholesalerToken).get('/accounts?limit=1').expect(403);
    expect(blocked.body.code).toBe('password-change-required');

    await as(wholesalerToken).patch('/auth/password', { currentPassword: 'equivocada-123', newPassword: finalPassword }).expect(422);
    await as(wholesalerToken).patch('/auth/password', { currentPassword: temporaryPassword, newPassword: finalPassword }).expect(204);
    await as(wholesalerToken).get('/accounts?limit=1').expect(200);
    await login(wholesalerName, temporaryPassword).expect(401);
  });

  it('lists and searches merchants, only for the Administrator', async () => {
    const page = (await as(adminToken).get(`/admin/merchants?search=${encodeURIComponent(wholesalerName.toUpperCase())}`).expect(200)).body;
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: merchantId, wholesaler: { mustChangePassword: false, username: wholesalerName } });
    expect(page.items[0].wholesaler.lastLoginAt).not.toBeNull();
    // The platform business is never listed as a merchant.
    const all = (await as(adminToken).get('/admin/merchants?limit=100').expect(200)).body.items as { id: string }[];
    expect(all.map((item) => item.id)).not.toContain(platformId);

    await as(wholesalerToken).get('/admin/merchants').expect(403);
  });

  it('shows support status: failed attempts, last login and open sessions', async () => {
    // Third failure: the previous test already tried the old temporary password.
    await login(wholesalerName, 'equivocada-1234').expect(401);
    await login(wholesalerName, 'equivocada-5678').expect(401);
    const status = (await as(adminToken).get(`/admin/merchants/${merchantId}/status`).expect(200)).body;
    expect(status).toMatchObject({ activeAssistants: 0, failedLoginAttempts: 3, merchant: { id: merchantId } });
    expect(status.openSessions).toBeGreaterThanOrEqual(1);
    expect(status.lastFailedLoginAt).not.toBeNull();

    // A successful login clears the counter.
    wholesalerToken = (await login(wholesalerName, finalPassword).expect(201)).body.accessToken as string;
    expect((await as(adminToken).get(`/admin/merchants/${merchantId}/status`).expect(200)).body.failedLoginAttempts).toBe(0);
  });

  it('suspends a merchant at once and reactivates it, with the reason audited in both businesses', async () => {
    const suspend = { clientOperationId: randomUUID(), reason: 'Falta de pago del servicio' };
    const suspended = (await as(adminToken).post(`/admin/merchants/${merchantId}/suspend`, suspend).expect(200)).body;
    expect(suspended.isActive).toBe(false);
    await as(wholesalerToken).get('/auth/session').expect(401);
    await login(wholesalerName, finalPassword).expect(401);

    await as(adminToken).post(`/admin/merchants/${merchantId}/suspend`, suspend).expect(200);
    const again = await as(adminToken).post(`/admin/merchants/${merchantId}/suspend`, { ...suspend, clientOperationId: randomUUID() }).expect(422);
    expect(again.body.code).toBe('merchant-already-suspended');

    const audit = dataSource.getRepository(AuditEventEntity);
    for (const businessId of [merchantId, platformId]) {
      const event = await audit.findOneByOrFail({ action: 'merchant.suspended', businessId, resourceId: merchantId });
      expect(event.details).toMatchObject({ clientOperationId: suspend.clientOperationId, reason: suspend.reason });
    }

    await as(adminToken).post(`/admin/merchants/${merchantId}/reactivate`, { clientOperationId: randomUUID(), reason: 'Pago regularizado' }).expect(200);
    wholesalerToken = (await login(wholesalerName, finalPassword).expect(201)).body.accessToken as string;
  });

  it('resets a forgotten password with a temporary one and closes the old sessions', async () => {
    const otherTemporary = `Temporal-${randomUUID()}`;
    const reset = await as(adminToken)
      .post(`/admin/merchants/${merchantId}/password-reset`, { clientOperationId: randomUUID(), reason: 'Olvidó su contraseña', temporaryPassword: otherTemporary })
      .expect(200);
    expect(reset.body.wholesaler.mustChangePassword).toBe(true);
    expect(JSON.stringify(reset.body)).not.toContain(otherTemporary);
    await as(wholesalerToken).get('/auth/session').expect(401);
    await login(wholesalerName, finalPassword).expect(401);

    const session = (await login(wholesalerName, otherTemporary).expect(201)).body;
    expect(session.user.mustChangePassword).toBe(true);
    const revoked = (await as(adminToken).post(`/admin/merchants/${merchantId}/sessions/revoke`, { clientOperationId: randomUUID(), reason: 'Tablet perdida' }).expect(200)).body;
    expect(revoked.revokedSessions).toBeGreaterThanOrEqual(1);
    await as(session.accessToken as string).get('/auth/session').expect(401);
  });

  it('never treats the platform business as a merchant', async () => {
    await as(adminToken).post(`/admin/merchants/${platformId}/suspend`, { clientOperationId: randomUUID(), reason: 'Prueba de bloqueo' }).expect(404);
    await as(adminToken).get(`/admin/merchants/${platformId}/status`).expect(404);
  });

  it('denies the Administrator every business route of the API', async () => {
    const contract = (await http().get('/api/v1/openapi.json').expect(200)).body as {
      paths: Record<string, Record<string, { security?: unknown[] }>>;
    };
    const checked: string[] = [];
    const open: string[] = [];
    for (const [path, operations] of Object.entries(contract.paths)) {
      if (/^\/api\/v1\/(auth|admin|health)(\/|$)/.test(path)) continue;
      for (const [method, operation] of Object.entries(operations)) {
        if (!operation.security?.length) continue;
        const url = path.replace(/\{[^}]+\}/g, randomUUID());
        const response = await http()[method as 'get'](url).set('Authorization', `Bearer ${adminToken}`).send({});
        if (response.status !== 403) open.push(`${method.toUpperCase()} ${path} → ${response.status}`);
        checked.push(`${method} ${path}`);
      }
    }
    expect(open).toEqual([]);
    expect(checked.length).toBeGreaterThan(40);
  }, 120_000);
});
