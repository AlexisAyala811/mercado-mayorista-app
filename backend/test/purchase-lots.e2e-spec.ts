import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { CashMovementEntity } from '../src/accounts/entities/cash-movement.entity.js';
import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import { configureHttpApplication } from '../src/configure-http-application.js';
import { PurchaseSettlementLots1793750400029 } from '../src/database/migrations/202611040029-purchase-settlement-lots.js';
import { FreightEntryEntity } from '../src/freight/entities/freight-entry.entity.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';
import { PurchaseSettlementEntity } from '../src/purchase/entities/purchase-settlement.entity.js';
import type { SessionIdentity } from '../src/identity/application/ports/session-identity-reader.js';
import { ReceptionEntity } from '../src/reception/entities/reception.entity.js';
import { WeighingService } from '../src/reception/weighing.service.js';

// Spec 010 on PostgreSQL: lots priced by variety and quality, freight borne by
// the provider or the wholesaler, and the earlier single-price body.
describe('Purchase lots and freight choice (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let token: string;
  let identity: SessionIdentity;
  let canchan: string;
  let peruanita: string;
  let primera: string;
  const password = `Strong-${randomUUID()}`;
  const prefix = `lt-${randomUUID()}`;

  const http = () => request(app.getHttpServer());
  const post = (path: string, body: object) =>
    http().post(path).set('Authorization', `Bearer ${token}`).send(body);
  const get = (path: string) =>
    http().get(path).set('Authorization', `Bearer ${token}`);

  // The spec example: 32 sacks of Canchán 1ra (1 612 kg) and 20 of Peruanita (1 000 kg).
  async function weighedReception() {
    const providerId = (
      await post('/api/v1/catalog/providers', {
        name: `Proveedor ${randomUUID().slice(0, 8)}`,
      }).expect(201)
    ).body.id;
    const reception = (
      await post('/api/v1/receptions', {
        clientOperationId: randomUUID(),
        driverName: 'Conductor E2E',
        expectedVarietyIds: [canchan, peruanita],
        providerId,
        receivedOn: new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Lima',
        }).format(new Date()),
      }).expect(201)
    ).body as { id: string; version: number };
    let version = reception.version;
    const sacks = [
      ...Array.from({ length: 32 }, (_, index) => ({
        grossWeightKg: index < 12 ? '51' : '50',
        qualityId: primera,
        varietyId: canchan,
      })),
      ...Array.from({ length: 20 }, () => ({
        grossWeightKg: '50',
        varietyId: peruanita,
      })),
    ];
    // The 52 sacks go through the weighing service the HTTP route uses, so the
    // suite stays under the 100 requests per minute limit of the API.
    const weighing = app.get(WeighingService);
    for (const sack of sacks) {
      await weighing.add(identity, reception.id, {
        ...sack,
        clientOperationId: randomUUID(),
        expectedReceptionVersion: version,
        tareKg: '0',
      });
      version += 1;
    }
    const closed = await weighing.close(identity, reception.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: version,
    });
    return { id: reception.id, version: closed.version };
  }

  const lots = (canchanPrice = 145) => [
    {
      name: 'Canchán #1',
      priceBasis: 'kilogram',
      qualityId: primera,
      unitPriceCents: canchanPrice,
      varietyId: canchan,
    },
    {
      priceBasis: 'sack',
      qualityId: null,
      unitPriceCents: 9000,
      varietyId: peruanita,
    },
  ];
  const settlement = (version: number, overrides: object = {}) => ({
    advancesCents: 0,
    clientOperationId: randomUUID(),
    discountsCents: 0,
    expectedReceptionVersion: version,
    installments: [],
    lots: lots(),
    paymentMode: 'cash',
    ...overrides,
  });
  const settle = (receptionId: string, body: object) =>
    post(`/api/v1/purchases/receptions/${receptionId}/settlement`, body);

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });

    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const business = await businesses.save(
      businesses.create({ displayName: 'Lotes E2E', isActive: true }),
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
    canchan = (
      await post('/api/v1/catalog/varieties', {
        name: `Canchán ${prefix}`,
      }).expect(201)
    ).body.id;
    peruanita = (
      await post('/api/v1/catalog/varieties', {
        name: `Peruanita ${prefix}`,
      }).expect(201)
    ).body.id;
    primera = (
      await post('/api/v1/catalog/qualities', {
        name: `1ra ${prefix}`,
      }).expect(201)
    ).body.id;
  }, 60_000);

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('offers the lots of the active sacks with the letters of the settlement', async () => {
    const reception = await weighedReception();
    const groups = (
      await get(
        `/api/v1/purchases/receptions/${reception.id}/settlement-groups`,
      ).expect(200)
    ).body;
    expect(groups).toEqual([
      expect.objectContaining({
        letter: 'A',
        netWeightKg: '1612.000',
        qualityId: primera,
        sacks: 32,
        varietyId: canchan,
      }),
      expect.objectContaining({
        letter: 'B',
        netWeightKg: '1000.000',
        qualityId: null,
        sacks: 20,
        varietyId: peruanita,
      }),
    ]);
  });

  it('prices two lots with different bases and pays the gross in cash', async () => {
    const reception = await weighedReception();
    const body = (
      await settle(reception.id, settlement(reception.version)).expect(201)
    ).body;
    expect(body).toMatchObject({
      freightChargedTo: 'provider',
      grossAmountCents: '413740',
      liquidAmountCents: '413740',
      priceBasis: null,
      unitPriceCents: null,
    });
    expect(body.lots).toEqual([
      expect.objectContaining({
        amountCents: '233740',
        letter: 'A',
        name: 'Canchán #1',
        priceBasis: 'kilogram',
        sacks: 32,
      }),
      expect.objectContaining({
        amountCents: '180000',
        letter: 'B',
        name: null,
        priceBasis: 'sack',
        sacks: 20,
      }),
    ]);
    const cash = await dataSource
      .getRepository(CashMovementEntity)
      .findOneByOrFail({ sourceId: body.id });
    expect(cash.amountCents).toBe('413740');
    const read = (
      await get(
        `/api/v1/purchases/receptions/${reception.id}/settlement`,
      ).expect(200)
    ).body;
    expect(
      read.lots.map((lot: { amountCents: string }) => lot.amountCents),
    ).toEqual(['233740', '180000']);
  });

  it.each([
    ['wholesaler', '403740'],
    ['provider', '390740'],
  ])(
    'leaves S/ 130.00 of freight to the carrier when the %s bears it',
    async (party, liquid) => {
      const reception = await weighedReception();
      const body = (
        await settle(
          reception.id,
          settlement(reception.version, {
            advancesCents: 10_000,
            freightBasis: 'sack',
            freightChargedTo: party,
            freightRateCents: 250,
          }),
        ).expect(201)
      ).body;
      expect(body).toMatchObject({
        freightAmountCents: '13000',
        freightChargedTo: party,
        liquidAmountCents: liquid,
      });
      const freight = await dataSource
        .getRepository(FreightEntryEntity)
        .findOneByOrFail({ operationId: body.id });
      expect(freight).toMatchObject({ amountCents: '13000', state: 'pending' });
    },
  );

  it('rejects lots that leave sacks out without saving anything', async () => {
    const reception = await weighedReception();
    const response = await settle(
      reception.id,
      settlement(reception.version, { lots: [lots()[0]] }),
    ).expect(422);
    expect(response.body.code).toBe('purchase-lots-mismatch');
    expect(
      await dataSource
        .getRepository(PurchaseSettlementEntity)
        .countBy({ receptionId: reception.id }),
    ).toBe(0);
  });

  it('answers five simultaneous resends with one purchase and rejects the id with another price', async () => {
    const reception = await weighedReception();
    const order = settlement(reception.version);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => settle(reception.id, order).expect(201)),
    );
    expect(new Set(responses.map((response) => response.body.id)).size).toBe(1);
    const events = await dataSource.getRepository(AuditEventEntity).findBy({
      action: 'purchase.settled',
      resourceId: responses[0]!.body.id,
    });
    expect(events).toHaveLength(1);
    expect(events[0]!.details).toMatchObject({
      freightChargedTo: 'provider',
      lots: [
        expect.objectContaining({ amountCents: '233740', letter: 'A' }),
        expect.objectContaining({ amountCents: '180000', letter: 'B' }),
      ],
    });
    const reused = await settle(reception.id, {
      ...order,
      lots: lots(150),
    }).expect(409);
    expect(reused.body.code).toBe('operation-id-conflict');
  });

  it('keeps the single-price body of earlier app versions as one lot', async () => {
    const reception = await weighedReception();
    const { lots: _lots, ...single } = settlement(reception.version);
    const body = (
      await settle(reception.id, {
        ...single,
        priceBasis: 'kilogram',
        unitPriceCents: 145,
      }).expect(201)
    ).body;
    // 2 612 kg × S/ 1.45 = S/ 3 787.40 on the whole purchase, as before spec 010.
    expect(body).toMatchObject({
      freightChargedTo: 'provider',
      grossAmountCents: '378740',
      priceBasis: 'kilogram',
      unitPriceCents: '145',
    });
    expect(body.lots).toEqual([
      expect.objectContaining({
        amountCents: '378740',
        letter: 'A',
        netWeightKg: '2612.000',
        sacks: 52,
        varietyId: null,
      }),
    ]);
  });

  it('feeds the receipt and the analytics with the price of each lot', async () => {
    const reception = await weighedReception();
    const purchase = (
      await settle(
        reception.id,
        settlement(reception.version, {
          freightBasis: 'sack',
          freightChargedTo: 'wholesaler',
          freightRateCents: 250,
        }),
      ).expect(201)
    ).body;
    const pdf = await get(`/api/v1/receipts/purchases/${purchase.id}.pdf`)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
    }).format(new Date());
    const { providerId } = await dataSource
      .getRepository(ReceptionEntity)
      .findOneByOrFail({ id: reception.id });
    const points = (
      await get(
        `/api/v1/analytics/series?from=${today}&to=${today}&varietyId=${peruanita}&providerId=${providerId}`,
      ).expect(200)
    ).body.points as Array<{
      operationType: string;
      operationIds: string[];
      merchandiseCents: string;
      priceSolesPerKg: string;
    }>;
    // Lot B of this purchase only: 20 sacks × S/ 90.00 = S/ 1 800.00 for 1 000 kg.
    expect(
      points.filter((point) => point.operationType === 'purchase'),
    ).toEqual([
      expect.objectContaining({
        merchandiseCents: '180000',
        operationIds: [purchase.id],
        priceSolesPerKg: '1.8000',
      }),
    ]);
  });

  it('refuses to roll back migration 029 once purchases have lots', async () => {
    const reception = await weighedReception();
    await settle(reception.id, settlement(reception.version)).expect(201);
    const runner = dataSource.createQueryRunner();
    try {
      await expect(
        new PurchaseSettlementLots1793750400029().down(runner),
      ).rejects.toThrow('No se puede revertir');
    } finally {
      await runner.release();
    }
    expect(
      await dataSource.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_settlement_lots'`,
      ),
    ).toHaveLength(1);
  });

  it('refuses a body with both lots and a single price', async () => {
    const reception = await weighedReception();
    await settle(
      reception.id,
      settlement(reception.version, {
        priceBasis: 'sack',
        unitPriceCents: 9000,
      }),
    ).expect(400);
  });

  it('voids a purchase with lots, reversing its cash and freight', async () => {
    const reception = await weighedReception();
    const purchase = (
      await settle(
        reception.id,
        settlement(reception.version, {
          freightBasis: 'sack',
          freightChargedTo: 'wholesaler',
          freightRateCents: 250,
        }),
      ).expect(201)
    ).body;
    const settled = await dataSource
      .getRepository(ReceptionEntity)
      .findOneByOrFail({ id: reception.id });
    await post(`/api/v1/purchases/${purchase.id}/void`, {
      clientOperationId: randomUUID(),
      expectedPurchaseVersion: purchase.version,
      expectedReceptionVersion: settled.version,
      reason: 'Precio mal registrado',
    }).expect(201);
    const voided = await dataSource
      .getRepository(PurchaseSettlementEntity)
      .findOneByOrFail({ id: purchase.id });
    expect(voided.state).toBe('voided');
  });
});
