import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { configureHttpApplication } from '../src/configure-http-application.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { DelegationEntity } from '../src/identity/entities/delegation.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';

// Spec 007 on PostgreSQL: T711 (descriptive series from confirmed operations
// only, filters, traceable references, isolation by business) and T712
// (no estimate or evaluation while the history is insufficient).
describe('Analytics (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let owner: string;
  let assistant: string;
  let outsider: string;
  let varietyId: string;
  let regularBuyerId: string;
  let otherBuyerId: string;
  let firstSaleId: string;
  let returnedSaleId: string;
  let voidedSaleId: string;
  let returnId: string;
  const password = `Strong-${randomUUID()}`;
  const prefix = `an-${randomUUID()}`;

  const limaDate = (offsetDays: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(
      new Date(Date.now() + offsetDays * 86_400_000),
    );
  const today = limaDate(0);
  const period = `from=${limaDate(-7)}&to=${today}`;

  const http = () => request(app.getHttpServer());
  const get = (token: string, path: string) =>
    http().get(path).set('Authorization', `Bearer ${token}`);
  const post = (token: string, path: string, body: object) =>
    http().post(path).set('Authorization', `Bearer ${token}`).send(body);

  type Point = {
    operationType: string;
    varietyId: string;
    operationCount: number;
    sacks: number;
    weightKg: string;
    merchandiseCents: string;
    priceSolesPerKg: string;
    operationIds: string[];
    compensationIds: string[];
  };
  const salePoints = async (token: string, query = '') =>
    (
      (
        await get(token, `/api/v1/analytics/series?${period}${query}`).expect(
          200,
        )
      ).body.points as Point[]
    ).filter((point) => point.operationType === 'sale');

  async function cashSale(buyerId: string, sacks: number, unitPrice: number) {
    return (
      await post(owner, '/api/v1/sales', {
        clientOperationId: randomUUID(),
        buyerId,
        destinationDepartment: 'Lima',
        discountsCents: 0,
        freightIncludedInTotal: false,
        paymentMode: 'cash',
        installments: [],
        lines: [
          {
            varietyId,
            sacks,
            weightKg: String(sacks * 50),
            priceBasis: 'sack',
            unitPriceCents: unitPrice,
          },
        ],
      }).expect(201)
    ).body as { id: string; version: number };
  }

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });

    const hash = await new PasswordHasher().hash(password);
    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const business = await businesses.save(
      businesses.create({ displayName: 'Analítica A E2E', isActive: true }),
    );
    const other = await businesses.save(
      businesses.create({ displayName: 'Analítica B E2E', isActive: true }),
    );
    const user = (businessId: string, role: UserRole, suffix: string) =>
      users.save(
        users.create({
          businessId,
          isActive: true,
          passwordHash: hash,
          role,
          username: `${prefix}-${suffix}`,
        }),
      );
    const wholesaler = await user(business.id, UserRole.Wholesaler, 'owner');
    const helper = await user(business.id, UserRole.Assistant, 'assistant');
    await user(other.id, UserRole.Wholesaler, 'other');
    await dataSource.getRepository(DelegationEntity).save({
      assistantUserId: helper.id,
      authorizedByUserId: wholesaler.id,
      businessId: business.id,
      expiresAt: new Date(Date.now() + 3_600_000),
      reason: 'Prueba E2E de analítica',
      revokedAt: null,
      startsAt: new Date(Date.now() - 60_000),
    });

    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app);
    await app.init();

    const login = async (suffix: string) =>
      (
        (
          await http()
            .post('/api/v1/auth/sessions')
            .send({ password, username: `${prefix}-${suffix}` })
            .expect(201)
        ).body as { accessToken: string }
      ).accessToken;
    owner = await login('owner');
    assistant = await login('assistant');
    outsider = await login('other');

    regularBuyerId = (
      await post(owner, '/api/v1/catalog/buyers', {
        name: 'Comprador frecuente E2E',
      }).expect(201)
    ).body.id;
    otherBuyerId = (
      await post(owner, '/api/v1/catalog/buyers', {
        name: 'Comprador ocasional E2E',
      }).expect(201)
    ).body.id;
    varietyId = (
      await post(owner, '/api/v1/catalog/varieties', {
        name: `Única ${prefix}`,
      }).expect(201)
    ).body.id;

    // 4 sacks · 200 kg · S/ 400.00 to the regular buyer.
    firstSaleId = (await cashSale(regularBuyerId, 4, 10000)).id;
    // 2 sacks · 100 kg · S/ 240.00 to the other buyer, then 1 sack returned.
    const returned = await cashSale(otherBuyerId, 2, 12000);
    returnedSaleId = returned.id;
    const detail = (
      await get(owner, `/api/v1/sales/${returned.id}`).expect(200)
    ).body as { lines: Array<{ id: string }> };
    returnId = (
      await post(owner, `/api/v1/sales/${returned.id}/commercial-returns`, {
        clientOperationId: randomUUID(),
        expectedSaleVersion: returned.version,
        reason: 'Sacos dañados',
        freightAdjustmentCents: 0,
        lines: [
          {
            saleLineId: detail.lines[0]!.id,
            sacks: 1,
            weightKg: '50',
            authorizedGrossCents: 12000,
          },
        ],
      }).expect(201)
    ).body.saleReturn.id;
    // A voided sale never reaches the series.
    const voided = await cashSale(regularBuyerId, 10, 9000);
    voidedSaleId = voided.id;
    await post(owner, `/api/v1/sales/${voided.id}/void`, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: voided.version,
      reason: 'Venta registrada por error',
    }).expect(201);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('aggregates confirmed sales net of returns, without voided sales, with their references', async () => {
    const points = await salePoints(owner, `&varietyId=${varietyId}`);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      varietyId,
      operationCount: 2,
      sacks: 5,
      weightKg: '250.000',
      merchandiseCents: '52000',
      priceSolesPerKg: '2.0800',
      operationIds: [firstSaleId, returnedSaleId].sort(),
      compensationIds: [returnId],
    });
    expect(points[0]!.operationIds).not.toContain(voidedSaleId);
  });

  it('filters the series by buyer', async () => {
    const points = await salePoints(owner, `&buyerId=${regularBuyerId}`);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({
      operationCount: 1,
      sacks: 4,
      merchandiseCents: '40000',
      operationIds: [firstSaleId],
      compensationIds: [],
    });
  });

  it('shows nothing of this business to another business', async () => {
    expect(await salePoints(outsider)).toEqual([]);
    const buyers = (
      await get(outsider, '/api/v1/analytics/filters/buyers?limit=100').expect(
        200,
      )
    ).body.items as Array<{ id: string }>;
    expect(buyers.map((item) => item.id)).not.toContain(regularBuyerId);
    await get(
      outsider,
      `/api/v1/analytics/readiness?asOf=${today}&varietyId=${varietyId}`,
    ).expect(404);
    await post(outsider, '/api/v1/analytics/evaluations', {
      clientOperationId: randomUUID(),
      asOf: today,
      varietyId,
    }).expect(404);
  });

  it('denies the Assistant', async () => {
    await get(assistant, `/api/v1/analytics/series?${period}`).expect(403);
    await get(
      assistant,
      `/api/v1/analytics/readiness?asOf=${today}&varietyId=${varietyId}`,
    ).expect(403);
  });

  it('publishes no estimate and keeps no evaluation while the history is insufficient', async () => {
    const readiness = (
      await get(
        owner,
        `/api/v1/analytics/readiness?asOf=${today}&varietyId=${varietyId}`,
      ).expect(200)
    ).body as {
      weeks: unknown[];
      dataSufficient: boolean;
      predictionAvailable: boolean;
      criteria: Array<{ id: string; status: string }>;
    };
    expect(readiness.weeks).toHaveLength(26);
    expect(readiness.dataSufficient).toBe(false);
    expect(readiness.predictionAvailable).toBe(false);
    const status = (id: string) =>
      readiness.criteria.find((criterion) => criterion.id === id)?.status;
    expect(status('evaluation')).toBe('pending');
    expect(status('review')).toBe('pending');

    await get(
      owner,
      `/api/v1/analytics/readiness?asOf=${limaDate(1)}&varietyId=${varietyId}`,
    ).expect(422);
    await post(owner, '/api/v1/analytics/evaluations', {
      clientOperationId: randomUUID(),
      asOf: today,
      varietyId,
    }).expect(422);
    const evaluations = (
      await get(
        owner,
        `/api/v1/analytics/evaluations?varietyId=${varietyId}`,
      ).expect(200)
    ).body as { total: number };
    expect(evaluations.total).toBe(0);
    const publications = (
      await get(
        owner,
        `/api/v1/analytics/publications?varietyId=${varietyId}`,
      ).expect(200)
    ).body as { total: number };
    expect(publications.total).toBe(0);
  });
});
