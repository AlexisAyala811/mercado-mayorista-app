import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import { In, type DataSource } from 'typeorm';

import { CashMovementEntity } from '../src/accounts/entities/cash-movement.entity.js';
import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import { configureHttpApplication } from '../src/configure-http-application.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';

// Decisions D2 and D3 of 29 Oct 2026 on PostgreSQL:
// spec 004 — a voided credit sale leaves its installments voided, not paid;
// spec 001 — detail queries on another business answer 404 and are audited.
describe('Voided credit sales and cross-business isolation (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let owner: string;
  let outsider: string;
  let ownerBusinessId: string;
  let outsiderBusinessId: string;
  let buyerId: string;
  let varietyId: string;
  const password = `Strong-${randomUUID()}`;
  const prefix = `iso-${randomUUID()}`;

  const http = () => request(app.getHttpServer());
  const get = (token: string, path: string) =>
    http().get(path).set('Authorization', `Bearer ${token}`);
  const post = (token: string, path: string, body: object) =>
    http().post(path).set('Authorization', `Bearer ${token}`).send(body);

  async function creditSale() {
    const sale = (
      await post(owner, '/api/v1/sales', {
        clientOperationId: randomUUID(),
        buyerId,
        destinationDepartment: 'Lima',
        discountsCents: 0,
        freightIncludedInTotal: false,
        paymentMode: 'credit',
        installments: [
          { dueOn: '2026-11-15', amountCents: 30000 },
          { dueOn: '2026-12-15', amountCents: 20000 },
        ],
        lines: [
          {
            varietyId,
            sacks: 5,
            weightKg: '250',
            priceBasis: 'sack',
            unitPriceCents: 10000,
          },
        ],
      }).expect(201)
    ).body as { id: string; version: number };
    const accounts = (
      await get(owner, '/api/v1/accounts?limit=100').expect(200)
    ).body.items as Array<{ id: string; sourceId: string }>;
    return {
      sale,
      accountId: accounts.find((a) => a.sourceId === sale.id)!.id,
    };
  }

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });

    const hash = await new PasswordHasher().hash(password);
    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const a = await businesses.save(
      businesses.create({ displayName: 'Negocio A E2E', isActive: true }),
    );
    const b = await businesses.save(
      businesses.create({ displayName: 'Negocio B E2E', isActive: true }),
    );
    ownerBusinessId = a.id;
    outsiderBusinessId = b.id;
    for (const [businessId, suffix] of [
      [a.id, 'a'],
      [b.id, 'b'],
    ] as const)
      await users.save(
        users.create({
          businessId,
          isActive: true,
          passwordHash: hash,
          role: UserRole.Wholesaler,
          username: `${prefix}-${suffix}`,
        }),
      );

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
    owner = await login('a');
    outsider = await login('b');
    buyerId = (
      await post(owner, '/api/v1/catalog/buyers', {
        name: 'Comprador A E2E',
      }).expect(201)
    ).body.id;
    varietyId = (
      await post(owner, '/api/v1/catalog/varieties', {
        name: `Huayro ${prefix}`,
      }).expect(201)
    ).body.id;
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('voids a credit sale leaving its account and installments voided without cash', async () => {
    const { sale, accountId } = await creditSale();
    await post(owner, `/api/v1/sales/${sale.id}/void`, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: sale.version,
      reason: 'Venta registrada por error',
    }).expect(201);

    const detail = (
      await get(owner, `/api/v1/accounts/${accountId}`).expect(200)
    ).body as {
      account: { state: string; balanceCents: string };
      installments: Array<{ state: string; balanceCents: string }>;
    };
    expect(detail.account).toMatchObject({
      state: 'voided',
      balanceCents: '0',
    });
    expect(detail.installments).toHaveLength(2);
    expect(detail.installments.every((item) => item.state === 'voided')).toBe(
      true,
    );
    expect(detail.installments.every((item) => item.balanceCents === '0')).toBe(
      true,
    );
    const cash = await dataSource
      .getRepository(CashMovementEntity)
      .count({ where: { businessId: ownerBusinessId, sourceId: sale.id } });
    expect(cash).toBe(0);
  });

  it('answers 404 to another business for sale, account and receipt, and audits each attempt there', async () => {
    const { sale, accountId } = await creditSale();
    await get(outsider, `/api/v1/sales/${sale.id}`).expect(404);
    await get(outsider, `/api/v1/accounts/${accountId}`).expect(404);
    await get(outsider, `/api/v1/receipts/sales/${sale.id}.pdf`).expect(404);

    const outsiderAccounts = (
      await get(outsider, '/api/v1/accounts?limit=100').expect(200)
    ).body.items as Array<{ id: string }>;
    expect(outsiderAccounts.map((item) => item.id)).not.toContain(accountId);

    const events = await dataSource.getRepository(AuditEventEntity).find({
      where: {
        action: 'authorization.cross-business-denied',
        resourceId: In([sale.id, accountId]),
      },
    });
    expect(events.map((event) => event.businessId)).toEqual([
      outsiderBusinessId,
      outsiderBusinessId,
      outsiderBusinessId,
    ]);
    expect(
      events
        .map((event) => event.resourceType)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['account', 'sale', 'sale']);
    expect(events.some((event) => event.businessId === ownerBusinessId)).toBe(
      false,
    );
  });
});
