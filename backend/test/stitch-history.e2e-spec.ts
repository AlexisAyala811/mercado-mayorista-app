import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DataSource } from 'typeorm';

import { configureHttpApplication } from '../src/configure-http-application.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import type { SessionIdentity } from '../src/identity/application/ports/session-identity-reader.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';
import { ReceptionService } from '../src/reception/reception.service.js';
import { WeighingService } from '../src/reception/weighing.service.js';

// Spec 011 (RQ-ST05, RQ-ST07, CL-ST04, CL-ST10) on PostgreSQL: «Ver compras»
// and «Ver ventas» with sacks, kilos, totals and payment state, their counts,
// and the daily report rows, always limited to the session business.
describe('Stitch convergence history (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  const prefix = `st-${randomUUID()}`;
  const password = `Strong-${randomUUID()}`;
  type Actor = {
    token: string;
    identity: SessionIdentity;
    variety: string;
    varietyName: string;
    buyer: string;
  };
  let own: Actor;
  let other: Actor;

  const http = () => request(app.getHttpServer());
  const post = (actor: Actor, path: string, body: object) =>
    http()
      .post(`/api/v1${path}`)
      .set('Authorization', `Bearer ${actor.token}`)
      .send(body);
  const get = (actor: Actor, path: string) =>
    http().get(`/api/v1${path}`).set('Authorization', `Bearer ${actor.token}`);
  const today = () =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(
      new Date(),
    );

  async function actor(name: string): Promise<Actor> {
    const business = await dataSource
      .getRepository(BusinessEntity)
      .save({ displayName: name, isActive: true });
    const username = `${prefix}-${name}`.slice(0, 60);
    const user = await dataSource.getRepository(UserEntity).save({
      businessId: business.id,
      isActive: true,
      passwordHash: await new PasswordHasher().hash(password),
      role: UserRole.Wholesaler,
      username,
    });
    const token = (
      await http()
        .post('/api/v1/auth/sessions')
        .send({ password, username })
        .expect(201)
    ).body.accessToken as string;
    const identity: SessionIdentity = {
      businessId: business.id,
      businessName: name,
      expiresAt: new Date(Date.now() + 3_600_000),
      role: UserRole.Wholesaler,
      sessionId: randomUUID(),
      userId: user.id,
      username,
    };
    const partial = {
      buyer: '',
      identity,
      token,
      variety: '',
      varietyName: `Canchán ${name} ${prefix}`,
    };
    partial.variety = (
      await post(partial, '/catalog/varieties', {
        name: partial.varietyName,
      }).expect(201)
    ).body.id;
    partial.buyer = (
      await post(partial, '/catalog/buyers', {
        name: `Comprador ${name} ${prefix}`,
      }).expect(201)
    ).body.id;
    return partial;
  }

  // Two sacks of 50 kg net, closed and ready to settle.
  async function weighedReception(who: Actor) {
    const providerId = (
      await post(who, '/catalog/providers', {
        name: `Proveedor ${randomUUID().slice(0, 8)}`,
      }).expect(201)
    ).body.id;
    const reception = (
      await post(who, '/receptions', {
        clientOperationId: randomUUID(),
        driverName: 'Conductor',
        expectedVarietyIds: [who.variety],
        providerId,
        receivedOn: today(),
      }).expect(201)
    ).body as { id: string; version: number };
    const weighing = app.get(WeighingService);
    let version = reception.version;
    for (let index = 0; index < 2; index++) {
      await weighing.add(who.identity, reception.id, {
        clientOperationId: randomUUID(),
        expectedReceptionVersion: version,
        grossWeightKg: '51',
        tareKg: '1',
        varietyId: who.variety,
      });
      version += 1;
    }
    const closed = await weighing.close(who.identity, reception.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: version,
    });
    return { id: reception.id, version: closed.version };
  }

  // 100 kg at S/ 2.00 = S/ 200.00.
  async function settled(who: Actor, paymentMode: 'cash' | 'credit') {
    const reception = await weighedReception(who);
    const body = {
      advancesCents: 0,
      clientOperationId: randomUUID(),
      discountsCents: 0,
      expectedReceptionVersion: reception.version,
      installments:
        paymentMode === 'credit'
          ? [{ amountCents: 20000, dueOn: '2030-01-15' }]
          : [],
      lots: [
        {
          priceBasis: 'kilogram',
          qualityId: null,
          unitPriceCents: 200,
          varietyId: who.variety,
        },
      ],
      paymentMode,
    };
    const settlement = (
      await post(
        who,
        `/purchases/receptions/${reception.id}/settlement`,
        body,
      ).expect(201)
    ).body as { id: string; version: number };
    return { receptionId: reception.id, settlement };
  }

  // 5 sacks, 250 kg at S/ 100.00 per sack = S/ 500.00.
  async function sale(who: Actor, paymentMode: 'cash' | 'credit') {
    return (
      await post(who, '/sales', {
        buyerId: who.buyer,
        clientOperationId: randomUUID(),
        destinationDepartment: 'Lima',
        discountsCents: 0,
        freightIncludedInTotal: false,
        installments:
          paymentMode === 'credit'
            ? [{ amountCents: 50000, dueOn: '2030-01-15' }]
            : [],
        lines: [
          {
            priceBasis: 'sack',
            sacks: 5,
            unitPriceCents: 10000,
            varietyId: who.variety,
            weightKg: '250',
          },
        ],
        paymentMode,
      }).expect(201)
    ).body as { id: string; version: number };
  }

  async function accountOf(who: Actor, sourceId: string) {
    const accounts = (await get(who, '/accounts?limit=100').expect(200)).body
      .items as { id: string; sourceId: string; version: number }[];
    return accounts.find((account) => account.sourceId === sourceId)!;
  }

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app);
    await app.init();
    own = await actor('Historial');
    other = await actor('Otro');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('lists purchases with sacks, kilos, totals and the CL-MD05 state, counts them and filters in the server', async () => {
    const cash = await settled(own, 'cash');
    const credit = await settled(own, 'credit');
    const paid = await settled(own, 'credit');
    const voided = await settled(own, 'cash');
    const open = await weighedReception(own);
    // A reception voided before it was settled is «Anulado», not «Sin liquidar» (CL-ST30).
    const voidedOpen = await weighedReception(own);
    const voidedOpenReception = (
      await get(own, `/receptions/${voidedOpen.id}`).expect(200)
    ).body as { version: number };
    await post(own, `/receptions/${voidedOpen.id}/void`, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: voidedOpenReception.version,
      reason: 'Prueba sin liquidar',
    }).expect(201);
    await settled(other, 'cash');

    const account = await accountOf(own, paid.settlement.id);
    await post(own, `/accounts/${account.id}/payments`, {
      amountCents: 20000,
      clientOperationId: randomUUID(),
      expectedAccountVersion: account.version,
    }).expect(201);
    const reception = (
      await get(own, `/receptions/${voided.receptionId}`).expect(200)
    ).body as { version: number };
    await post(own, `/purchases/${voided.settlement.id}/void`, {
      clientOperationId: randomUUID(),
      expectedPurchaseVersion: voided.settlement.version,
      expectedReceptionVersion: reception.version,
      reason: 'Prueba de historial',
    }).expect(201);

    const page = (await get(own, '/purchases/history?limit=100').expect(200))
      .body as {
      total: number;
      items: {
        receptionId: string;
        paymentState: string;
        balanceCents: string;
      }[];
    };
    expect(page.total).toBe(6);
    const byReception = new Map(
      page.items.map((item) => [item.receptionId, item]),
    );
    expect(byReception.get(credit.receptionId)).toMatchObject({
      balanceCents: '20000',
      netWeightKg: '100.000',
      paidCents: '0',
      paymentState: 'debt',
      sacks: 2,
      settlementId: credit.settlement.id,
      totalCents: '20000',
      varieties: [own.varietyName],
    });
    expect(byReception.get(cash.receptionId)).toMatchObject({
      balanceCents: '0',
      paidCents: '20000',
      paymentState: 'paid',
    });
    expect(byReception.get(paid.receptionId)).toMatchObject({
      balanceCents: '0',
      paidCents: '20000',
      paymentState: 'paid',
    });
    expect(byReception.get(voided.receptionId)).toMatchObject({
      balanceCents: '0',
      paidCents: '0',
      paymentState: 'voided',
    });
    expect(byReception.get(voidedOpen.id)).toMatchObject({
      paymentState: 'voided',
      settlementId: null,
    });
    expect(byReception.get(open.id)).toMatchObject({
      paymentState: 'unsettled',
      sacks: 2,
      settlementId: null,
      totalCents: null,
    });

    // Same state as GET /purchases/payment-status (CL-MD05) for every settled reception.
    const ids = [cash, credit, paid, voided].map((item) => item.receptionId);
    const statuses = (
      await get(
        own,
        `/purchases/payment-status?receptionIds=${ids.join(',')}`,
      ).expect(200)
    ).body as { receptionId: string; state: string; balanceCents: string }[];
    for (const status of statuses)
      expect(byReception.get(status.receptionId)).toMatchObject({
        balanceCents: status.balanceCents,
        paymentState: status.state,
      });

    const summary = (await get(own, '/purchases/history/summary').expect(200))
      .body;
    expect(summary).toEqual({
      balanceCents: '20000',
      counts: { all: 6, debt: 1, paid: 2, unsettled: 1, voided: 2 },
      paidCents: '40000',
      totalCents: '60000',
    });

    const debts = (
      await get(own, '/purchases/history?paymentState=debt').expect(200)
    ).body as { total: number; items: { receptionId: string }[] };
    expect(debts.total).toBe(1);
    expect(debts.items[0]!.receptionId).toBe(credit.receptionId);
    await get(own, '/purchases/history?paymentState=otro').expect(400);
    await get(own, `/purchases/history?from=${today()}&to=2000-01-01`).expect(
      422,
    );
    await http().get('/api/v1/purchases/history').expect(401);
  }, 180_000);

  it('adds varieties, sacks, kilos and payment state to sales, counts them and filters in the server', async () => {
    const cash = await sale(own, 'cash');
    const credit = await sale(own, 'credit');
    const voided = await sale(own, 'credit');
    await sale(other, 'cash');
    await post(own, `/sales/${voided.id}/void`, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: voided.version,
      reason: 'Prueba de historial',
    }).expect(201);
    const account = await accountOf(own, credit.id);
    await post(own, `/accounts/${account.id}/payments`, {
      amountCents: 20000,
      clientOperationId: randomUUID(),
      expectedAccountVersion: account.version,
    }).expect(201);

    const page = (await get(own, '/sales?limit=100').expect(200)).body as {
      total: number;
      items: { id: string }[];
    };
    expect(page.total).toBe(3);
    const byId = new Map(page.items.map((item) => [item.id, item]));
    expect(byId.get(credit.id)).toMatchObject({
      balanceCents: '30000',
      paidCents: '20000',
      paymentState: 'debt',
      sacks: 5,
      varieties: [own.varietyName],
      weightKg: '250.000',
    });
    expect(byId.get(cash.id)).toMatchObject({
      balanceCents: '0',
      paidCents: '50000',
      paymentState: 'paid',
    });
    expect(byId.get(voided.id)).toMatchObject({
      balanceCents: '0',
      paidCents: '0',
      paymentState: 'voided',
    });

    const summary = (await get(own, '/sales/summary').expect(200)).body;
    expect(summary).toEqual({
      balanceCents: '30000',
      counts: { all: 3, debt: 1, paid: 1, voided: 1 },
      paidCents: '70000',
      totalCents: '100000',
    });
    const debts = (await get(own, '/sales?paymentState=debt').expect(200))
      .body as { total: number; items: { id: string }[] };
    expect(debts.items.map((item) => item.id)).toEqual([credit.id]);
    await get(own, '/sales?paymentState=otro').expect(400);
    await http().get('/api/v1/sales/summary').expect(401);
  }, 180_000);

  it('answers the list and the summary of 300 receptions quickly', async () => {
    const many = await actor('Volumen');
    const providerId = (
      await post(many, '/catalog/providers', {
        name: `Proveedor volumen ${prefix}`,
      }).expect(201)
    ).body.id;
    // Through the service: 300 HTTP writes would hit the rate limit.
    const receptions = app.get(ReceptionService);
    for (let index = 0; index < 300; index++)
      await receptions.create(many.identity, {
        clientOperationId: randomUUID(),
        driverName: 'Conductor',
        expectedVarietyIds: [many.variety],
        providerId,
        receivedOn: today(),
      });
    const started = performance.now();
    const page = (await get(many, '/purchases/history?limit=50').expect(200))
      .body as { total: number; items: unknown[] };
    const summary = (await get(many, '/purchases/history/summary').expect(200))
      .body as { counts: { all: number; unsettled: number } };
    const elapsed = performance.now() - started;
    expect(page.total).toBe(300);
    expect(page.items).toHaveLength(50);
    expect(summary.counts).toMatchObject({ all: 300, unsettled: 300 });
    expect(elapsed).toBeLessThan(2000);
  }, 300_000);

  it('groups the daily report by the day in Lima', async () => {
    const actor3 = await actor('Diario');
    const first = await settled(actor3, 'cash');
    const second = await settled(actor3, 'cash');
    const third = await settled(actor3, 'cash');
    // 23:30 in Lima on the 3rd is 04:30 UTC on the 4th; it still belongs to the 3rd.
    await dataSource.query(
      'UPDATE purchase_settlements SET created_at = $2 WHERE id = $1',
      [first.settlement.id, '2026-11-04T04:30:00Z'],
    );
    await dataSource.query(
      'UPDATE purchase_settlements SET created_at = $2 WHERE id = $1',
      [second.settlement.id, '2026-11-04T15:00:00Z'],
    );
    await dataSource.query(
      'UPDATE purchase_settlements SET created_at = $2 WHERE id = $1',
      [third.settlement.id, '2026-11-06T15:00:00Z'],
    );

    const rows = (
      await get(
        actor3,
        '/reports/rows?operation=purchase&from=2026-11-01&to=2026-11-07&report=daily',
      ).expect(200)
    ).body as { total: string; items: object[] };
    expect(rows.total).toBe('3');
    expect(rows.items).toEqual([
      {
        amount: '20000',
        date: '2026-11-03',
        id: '2026-11-03',
        operations: '1',
        sacks: '2',
        weight: '100.000',
      },
      {
        amount: '20000',
        date: '2026-11-04',
        id: '2026-11-04',
        operations: '1',
        sacks: '2',
        weight: '100.000',
      },
      {
        amount: '20000',
        date: '2026-11-06',
        id: '2026-11-06',
        operations: '1',
        sacks: '2',
        weight: '100.000',
      },
    ]);
    await get(
      actor3,
      '/reports/rows?operation=purchase&from=2026-11-01&to=2026-11-07&report=semanal',
    ).expect(400);
  }, 180_000);
});
