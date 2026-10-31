import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import type { AuditService } from '../src/audit/audit.service.js';
import { configureHttpApplication } from '../src/configure-http-application.js';
import type { SessionIdentity } from '../src/identity/application/ports/session-identity-reader.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';
import { RegisterSackWeight } from '../src/reception/application/register-sack-weight.js';
import { ReceptionEntity } from '../src/reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../src/reception/entities/reception-sack.entity.js';
import { PostgresWeighingUnitOfWork } from '../src/reception/infrastructure/postgres-weighing.js';

// Spec 002, T226: the weighing use case guarantees on PostgreSQL — concurrent
// resends of one order, operation-id conflicts and rollback when auditing fails.
describe('Sack weighing (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let token: string;
  let identity: SessionIdentity;
  let varietyId: string;
  const password = `Strong-${randomUUID()}`;
  const prefix = `pe-${randomUUID()}`;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body: object) =>
    http().post(path).set('Authorization', `Bearer ${token}`).send(body);

  async function newReception() {
    const providerId = (
      await post('/api/v1/catalog/providers', {
        name: `Proveedor ${randomUUID().slice(0, 8)}`,
      }).expect(201)
    ).body.id;
    return (
      await post('/api/v1/receptions', {
        clientOperationId: randomUUID(),
        driverName: 'Conductor E2E',
        expectedVarietyIds: [varietyId],
        providerId,
        receivedOn: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Lima',
        }).format(new Date()),
      }).expect(201)
    ).body as { id: string; version: number };
  }
  const sack = (version: number, overrides: object = {}) => ({
    clientOperationId: randomUUID(),
    expectedReceptionVersion: version,
    grossWeightKg: '52.5',
    tareKg: '0.5',
    varietyId,
    ...overrides,
  });

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });

    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const business = await businesses.save(
      businesses.create({ displayName: 'Pesaje E2E', isActive: true }),
    );
    const user = await users.save(
      users.create({
        businessId: business.id,
        isActive: true,
        passwordHash: await new PasswordHasher().hash(password),
        role: UserRole.Wholesaler,
        username: prefix,
      }),
    );
    identity = {
      businessId: business.id,
      businessName: business.displayName,
      expiresAt: new Date(Date.now() + 3_600_000),
      role: UserRole.Wholesaler,
      sessionId: randomUUID(),
      userId: user.id,
      username: prefix,
    };

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app);
    await app.init();
    token = (
      await http()
        .post('/api/v1/auth/sessions')
        .send({ password, username: prefix })
        .expect(201)
    ).body.accessToken;
    varietyId = (
      await post('/api/v1/catalog/varieties', {
        name: `Peruanita ${prefix}`,
      }).expect(201)
    ).body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('answers five simultaneous resends of one order with one sack and one audit event', async () => {
    const reception = await newReception();
    const order = sack(reception.version);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () =>
        post(`/api/v1/receptions/${reception.id}/sacks`, order).expect(201),
      ),
    );
    const ids = new Set(responses.map((response) => response.body.id));
    expect(ids.size).toBe(1);
    expect(responses[0]!.body).toMatchObject({
      grossWeightKg: '52.500',
      tareKg: '0.500',
      netWeightKg: '52.000',
      sequence: 1,
    });

    const sacks = await dataSource
      .getRepository(ReceptionSackEntity)
      .find({ where: { receptionId: reception.id } });
    expect(sacks).toHaveLength(1);
    const events = await dataSource.getRepository(AuditEventEntity).find({
      where: { action: 'reception.sack-added', resourceId: sacks[0]!.id },
    });
    expect(events).toHaveLength(1);
  });

  it('rejects the order id with another weight and an outdated reception version', async () => {
    const reception = await newReception();
    const order = sack(reception.version);
    await post(`/api/v1/receptions/${reception.id}/sacks`, order).expect(201);

    const reused = await post(`/api/v1/receptions/${reception.id}/sacks`, {
      ...order,
      grossWeightKg: '60',
    }).expect(409);
    expect(reused.body.code).toBe('operation-id-conflict');
    const outdated = await post(
      `/api/v1/receptions/${reception.id}/sacks`,
      sack(reception.version),
    ).expect(409);
    expect(outdated.body.code).toBe('reception-version-conflict');

    expect(
      await dataSource
        .getRepository(ReceptionSackEntity)
        .count({ where: { receptionId: reception.id } }),
    ).toBe(1);
  });

  it('rolls back the sack and the reception version when the audit event fails', async () => {
    const reception = await newReception();
    const failingAudit = {
      record: async () => {
        throw new Error('audit unavailable');
      },
    } as unknown as AuditService;
    const useCase = new RegisterSackWeight(
      new PostgresWeighingUnitOfWork(dataSource, failingAudit),
    );
    await expect(
      useCase.execute(identity, reception.id, sack(reception.version)),
    ).rejects.toThrow('audit unavailable');

    expect(
      await dataSource
        .getRepository(ReceptionSackEntity)
        .count({ where: { receptionId: reception.id } }),
    ).toBe(0);
    const stored = await dataSource
      .getRepository(ReceptionEntity)
      .findOneByOrFail({ id: reception.id });
    expect(stored.version).toBe(reception.version);
  });
});
