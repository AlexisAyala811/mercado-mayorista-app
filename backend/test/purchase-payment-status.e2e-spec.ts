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
import { WeighingService } from '../src/reception/weighing.service.js';

// Spec 011 (CL-MD05) on PostgreSQL: «Ver compras» reads paid, debt or voided
// from the settlement and its payable account, only for the session business.
describe('Purchase payment status (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  const prefix = `ps-${randomUUID()}`;
  const password = `Strong-${randomUUID()}`;
  type Actor = { token: string; identity: SessionIdentity; variety: string };
  let own: Actor;
  let other: Actor;

  const http = () => request(app.getHttpServer());
  const post = (actor: Actor, path: string, body: object) =>
    http().post(`/api/v1${path}`).set('Authorization', `Bearer ${actor.token}`).send(body);
  const get = (actor: Actor, path: string) =>
    http().get(`/api/v1${path}`).set('Authorization', `Bearer ${actor.token}`);
  const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

  async function actor(name: string): Promise<Actor> {
    const business = await dataSource.getRepository(BusinessEntity).save({ displayName: name, isActive: true });
    const username = `${prefix}-${name}`.slice(0, 60);
    const user = await dataSource.getRepository(UserEntity).save({
      businessId: business.id, isActive: true, passwordHash: await new PasswordHasher().hash(password), role: UserRole.Wholesaler, username,
    });
    const token = (await http().post('/api/v1/auth/sessions').send({ password, username }).expect(201)).body.accessToken as string;
    const identity: SessionIdentity = {
      businessId: business.id, businessName: name, expiresAt: new Date(Date.now() + 3_600_000), role: UserRole.Wholesaler, sessionId: randomUUID(), userId: user.id, username,
    };
    const partial = { identity, token, variety: '' };
    partial.variety = (await post(partial, '/catalog/varieties', { name: `Canchán ${name} ${prefix}` }).expect(201)).body.id;
    return partial;
  }

  // Two sacks of 50 kg net, closed and ready to settle.
  async function weighedReception(who: Actor) {
    const providerId = (await post(who, '/catalog/providers', { name: `Proveedor ${randomUUID().slice(0, 8)}` }).expect(201)).body.id;
    const reception = (await post(who, '/receptions', { clientOperationId: randomUUID(), driverName: 'Conductor', expectedVarietyIds: [who.variety], providerId, receivedOn: today() }).expect(201)).body as { id: string; version: number };
    const weighing = app.get(WeighingService);
    let version = reception.version;
    for (let index = 0; index < 2; index++) {
      await weighing.add(who.identity, reception.id, { clientOperationId: randomUUID(), expectedReceptionVersion: version, grossWeightKg: '51', tareKg: '1', varietyId: who.variety });
      version += 1;
    }
    const closed = await weighing.close(who.identity, reception.id, { clientOperationId: randomUUID(), expectedReceptionVersion: version });
    return { id: reception.id, version: closed.version };
  }

  async function settled(who: Actor, paymentMode: 'cash' | 'credit') {
    const reception = await weighedReception(who);
    // 100 kg at S/ 2.00 = S/ 200.00.
    const body = {
      advancesCents: 0, clientOperationId: randomUUID(), discountsCents: 0, expectedReceptionVersion: reception.version,
      installments: paymentMode === 'credit' ? [{ amountCents: 20000, dueOn: '2030-01-15' }] : [],
      lots: [{ priceBasis: 'kilogram', qualityId: null, unitPriceCents: 200, varietyId: who.variety }], paymentMode,
    };
    const settlement = (await post(who, `/purchases/receptions/${reception.id}/settlement`, body).expect(201)).body as { id: string; version: number };
    return { receptionId: reception.id, settlement };
  }

  async function payableAccount(who: Actor, settlementId: string) {
    const accounts = (await get(who, '/accounts?limit=100').expect(200)).body.items as { id: string; sourceId: string; version: number }[];
    return accounts.find((account) => account.sourceId === settlementId)!;
  }

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
    const { AppModule } = await import('../src/app.module.js');
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureHttpApplication(app);
    await app.init();
    own = await actor('Estado');
    other = await actor('Ajeno');
  }, 60_000);

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('reports paid, debt and voided per reception and leaves out the rest', async () => {
    const cash = await settled(own, 'cash');
    const credit = await settled(own, 'credit');
    const paid = await settled(own, 'credit');
    const voided = await settled(own, 'cash');
    const open = await weighedReception(own);
    const foreign = await settled(other, 'cash');

    const account = await payableAccount(own, paid.settlement.id);
    await post(own, `/accounts/${account.id}/payments`, { amountCents: 20000, clientOperationId: randomUUID(), expectedAccountVersion: account.version }).expect(201);
    const reception = (await get(own, `/receptions/${voided.receptionId}`).expect(200)).body as { version: number };
    await post(own, `/purchases/${voided.settlement.id}/void`, { clientOperationId: randomUUID(), expectedPurchaseVersion: voided.settlement.version, expectedReceptionVersion: reception.version, reason: 'Prueba de estado' }).expect(201);

    const ids = [cash, credit, paid, voided].map((item) => item.receptionId).concat(open.id, foreign.receptionId, randomUUID());
    const response = await get(own, `/purchases/payment-status?receptionIds=${ids.join(',')}`).expect(200);
    const byReception = new Map((response.body as { receptionId: string }[]).map((item) => [item.receptionId, item]));

    expect(byReception.get(cash.receptionId)).toEqual({ balanceCents: '0', receptionId: cash.receptionId, settlementId: cash.settlement.id, state: 'paid' });
    expect(byReception.get(credit.receptionId)).toMatchObject({ balanceCents: '20000', state: 'debt' });
    expect(byReception.get(paid.receptionId)).toMatchObject({ balanceCents: '0', state: 'paid' });
    expect(byReception.get(voided.receptionId)).toMatchObject({ balanceCents: '0', state: 'voided' });
    expect(byReception.has(open.id)).toBe(false);
    expect(byReception.has(foreign.receptionId)).toBe(false);
    expect(byReception.size).toBe(4);
  }, 120_000);

  it('rejects malformed or oversized requests and requires a session', async () => {
    await get(own, '/purchases/payment-status').expect(400);
    await get(own, '/purchases/payment-status?receptionIds=no-es-uuid').expect(400);
    await get(own, `/purchases/payment-status?receptionIds=${Array.from({ length: 101 }, () => randomUUID()).join(',')}`).expect(400);
    await http().get(`/api/v1/purchases/payment-status?receptionIds=${randomUUID()}`).expect(401);
  });
});
