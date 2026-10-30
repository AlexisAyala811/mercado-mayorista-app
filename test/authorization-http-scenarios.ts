import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import { configureHttpApplication } from '../src/configure-http-application.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { DelegationEntity } from '../src/identity/entities/delegation.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';

type LoginResult = {
  accessToken: string;
  user: { businessId: string; role: UserRole; userId: string };
};

export function registerAuthorizationHttpScenarios(
  getDataSource: () => DataSource,
) {
  describe('HTTP authentication and authorization', () => {
    let app: NestExpressApplication<Server>;
    let wholesalerToken: string;
    let assistantToken: string;
    let otherBusinessToken: string;
    let businessId: string;
    let assistantUserId: string;
    let delegationId: string;
    const password = `Strong-${randomUUID()}`;
    const usernamePrefix = `e2e-${randomUUID()}`;

    beforeAll(async () => {
      const dataSource = getDataSource();
      const businesses = dataSource.getRepository(BusinessEntity);
      const users = dataSource.getRepository(UserEntity);
      const delegations = dataSource.getRepository(DelegationEntity);
      const hasher = new PasswordHasher();
      const passwordHash = await hasher.hash(password);

      const business = await businesses.save(
        businesses.create({ displayName: 'Mercado E2E', isActive: true }),
      );
      const otherBusiness = await businesses.save(
        businesses.create({
          displayName: 'Mercado aislado E2E',
          isActive: true,
        }),
      );
      businessId = business.id;

      const wholesaler = await users.save(
        users.create({
          businessId,
          isActive: true,
          passwordHash,
          role: UserRole.Wholesaler,
          username: `${usernamePrefix}-owner`,
        }),
      );
      const assistant = await users.save(
        users.create({
          businessId,
          isActive: true,
          passwordHash,
          role: UserRole.Assistant,
          username: `${usernamePrefix}-assistant`,
        }),
      );
      assistantUserId = assistant.id;
      await users.save(
        users.create({
          businessId: otherBusiness.id,
          isActive: true,
          passwordHash,
          role: UserRole.Wholesaler,
          username: `${usernamePrefix}-other`,
        }),
      );
      const delegation = await delegations.save(
        delegations.create({
          assistantUserId: assistant.id,
          authorizedByUserId: wholesaler.id,
          businessId,
          expiresAt: new Date(Date.now() + 60 * 60_000),
          reason: 'Prueba E2E de autorización',
          revokedAt: null,
          startsAt: new Date(Date.now() - 60_000),
        }),
      );
      delegationId = delegation.id;

      app = await createTestApplication();

      wholesalerToken = await login(`${usernamePrefix}-owner`);
      assistantToken = await login(`${usernamePrefix}-assistant`);
      otherBusinessToken = await login(`${usernamePrefix}-other`);
    });

    async function login(username: string) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/sessions')
        .send({ password, username })
        .expect(201);
      const body = response.body as LoginResult;
      expect(body.accessToken).toEqual(expect.any(String));
      return body.accessToken;
    }

    it('authenticates and isolates catalog data between businesses', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/providers')
        .set('Authorization', `Bearer ${wholesalerToken}`)
        .send({ name: 'Proveedor exclusivo E2E' })
        .expect(201);

      const sameBusiness = await request(app.getHttpServer())
        .get('/api/v1/catalog/providers')
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(200);
      expect(JSON.stringify(sameBusiness.body)).toContain(
        'Proveedor exclusivo E2E',
      );

      const otherBusiness = await request(app.getHttpServer())
        .get('/api/v1/catalog/providers')
        .set('Authorization', `Bearer ${otherBusinessToken}`)
        .expect(200);
      expect(JSON.stringify(otherBusiness.body)).not.toContain(
        'Proveedor exclusivo E2E',
      );
    });

    it('denies assistant mutations and records the denied authorization', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/catalog/providers')
        .set('Authorization', `Bearer ${assistantToken}`)
        .send({ name: 'No debe crearse' })
        .expect(403);

      const denied = await getDataSource()
        .getRepository(AuditEventEntity)
        .findOneBy({
          action: 'authorization.denied',
          actorUserId: assistantUserId,
          businessId,
        });
      expect(denied?.details).toMatchObject({ role: UserRole.Assistant });
    });

    it('restricts commercial reports to the wholesaler role', async () => {
      const today = new Date().toISOString().slice(0, 10);
      await request(app.getHttpServer())
        .get(`/api/v1/reports/commercial-summary?from=${today}&to=${today}`)
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/v1/reports/commercial-summary?from=${today}&to=${today}`)
        .set('Authorization', `Bearer ${wholesalerToken}`)
        .expect(200);
    });

    it('enforces append-only audit events inside PostgreSQL', async () => {
      const repository = getDataSource().getRepository(AuditEventEntity);
      const event = await repository.findOneByOrFail({ businessId });
      await expect(
        getDataSource().query(
          `UPDATE audit_events SET action = 'tampered' WHERE id = $1`,
          [event.id],
        ),
      ).rejects.toThrow('audit_events are append-only');
      await expect(
        getDataSource().query(`DELETE FROM audit_events WHERE id = $1`, [
          event.id,
        ]),
      ).rejects.toThrow('audit_events are append-only');
      expect(await repository.findOneByOrFail({ id: event.id })).toMatchObject({
        action: event.action,
        details: event.details,
      });
    });

    it('publishes the versioned OpenAPI contract and uniform HTTP errors', async () => {
      const openApi = await request(app.getHttpServer())
        .get('/api/v1/openapi.json')
        .expect(200);
      expect(openApi.body).toMatchObject({
        info: { title: 'Mercado API', version: '1.0.0' },
        openapi: expect.stringMatching(/^3\./),
      });
      const paths = Object.keys(
        (openApi.body as { paths: Record<string, unknown> }).paths,
      );
      expect(paths).toEqual(
        expect.arrayContaining([
          '/api/v1/auth/sessions',
          '/api/v1/receptions',
          '/api/v1/sales',
          '/api/v1/sales/{id}/commercial-returns',
          '/api/v1/accounts',
          '/api/v1/reports/commercial-summary',
          '/api/v1/reports/commercial-margin',
          '/api/v1/receipts/purchases/{id}.pdf',
          '/api/v1/receipts/sale-returns/{id}.pdf',
        ]),
      );

      const requestId = `contract-${randomUUID()}`;
      const invalid = await request(app.getHttpServer())
        .post('/api/v1/auth/sessions')
        .set('X-Request-Id', requestId)
        .send({
          password,
          unexpected: true,
          username: `${usernamePrefix}-owner`,
        })
        .expect(400);
      expect(invalid.headers['x-request-id']).toBe(requestId);
      expect(invalid.body).toMatchObject({
        path: '/api/v1/auth/sessions',
        requestId,
        statusCode: 400,
      });
      expect(invalid.body.timestamp).toEqual(expect.any(String));

      const unauthorized = await request(app.getHttpServer())
        .get('/api/v1/catalog/providers')
        .expect(401);
      expect(unauthorized.body).toMatchObject({
        message: 'Sesión no válida.',
        path: '/api/v1/catalog/providers',
        statusCode: 401,
      });
      expect(unauthorized.body.requestId).toEqual(expect.any(String));
    });

    it('revokes the session on logout', async () => {
      const token = await login(`${usernamePrefix}-owner`);
      await request(app.getHttpServer())
        .delete('/api/v1/auth/session')
        .set('Authorization', `Bearer ${token}`)
        .expect(204);
      await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('revalidates an assistant session after its delegation is revoked', async () => {
      await getDataSource()
        .getRepository(DelegationEntity)
        .update({ id: delegationId }, { revokedAt: new Date() });
      await request(app.getHttpServer())
        .get('/api/v1/auth/session')
        .set('Authorization', `Bearer ${assistantToken}`)
        .expect(401);
      expect(
        await getDataSource().getRepository(AuditEventEntity).countBy({
          action: 'authorization.delegation-denied',
          actorUserId: assistantUserId,
          businessId,
        }),
      ).toBe(1);
    });

    it('rate limits repeated login attempts in the real HTTP pipeline', async () => {
      const isolatedApp = await createTestApplication();
      try {
        for (let attempt = 0; attempt < 5; attempt += 1) {
          await request(isolatedApp.getHttpServer())
            .post('/api/v1/auth/sessions')
            .send({ password: `wrong-${attempt}`, username: 'missing-user' })
            .expect(401);
        }
        await request(isolatedApp.getHttpServer())
          .post('/api/v1/auth/sessions')
          .send({ password: 'wrong-final', username: 'missing-user' })
          .expect(429);
      } finally {
        await isolatedApp.close();
      }
    });

    afterAll(async () => {
      if (app) await app.close();
    });
  });
}

async function createTestApplication() {
  const { AppModule } = await import('../src/app.module.js');
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleFixture.createNestApplication<NestExpressApplication>();
  configureHttpApplication(app);
  await app.init();
  return app;
}
