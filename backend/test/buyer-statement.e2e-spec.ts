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
import { ReceiptDocumentEntity } from '../src/receipts/receipt-document.entity.js';

// Spec 009 (HU16/RF27): the spec example end to end on PostgreSQL —
// S/ 800.00 sale on credit, S/ 300.00 payment, S/ 100.00 return.
describe('Buyer account statement (PostgreSQL)', () => {
  let dataSource: DataSource;
  let app: NestExpressApplication<Server>;
  let owner: string;
  let assistant: string;
  let outsider: string;
  let ownerBusinessId: string;
  let outsiderBusinessId: string;
  let buyerId: string;
  const password = `Strong-${randomUUID()}`;
  const prefix = `ec-${randomUUID()}`;

  const limaDate = (offsetDays: number) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(
      new Date(Date.now() + offsetDays * 86_400_000),
    );
  const overdueOn = limaDate(-1);
  const upcomingOn = limaDate(15);

  const http = () => request(app.getHttpServer());
  const as = (token: string) => (path: string) =>
    http().get(path).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    dataSource = (await import('../src/database/data-source.js')).default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });

    const hash = await new PasswordHasher().hash(password);
    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const business = await businesses.save(
      businesses.create({ displayName: 'Mercado Estado E2E', isActive: true }),
    );
    const other = await businesses.save(
      businesses.create({ displayName: 'Otro negocio E2E', isActive: true }),
    );
    ownerBusinessId = business.id;
    outsiderBusinessId = other.id;
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
      reason: 'Prueba E2E del estado de cuenta',
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

    const post = (path: string, body: object) =>
      http().post(path).set('Authorization', `Bearer ${owner}`).send(body);
    buyerId = (
      await post('/api/v1/catalog/buyers', {
        name: 'Comercial Lima E2E',
      }).expect(201)
    ).body.id;
    const varietyId = (
      await post('/api/v1/catalog/varieties', {
        name: `Canchán ${prefix}`,
      }).expect(201)
    ).body.id;
    const sale = (
      await post('/api/v1/sales', {
        clientOperationId: randomUUID(),
        buyerId,
        destinationDepartment: 'Lima',
        discountsCents: 0,
        freightIncludedInTotal: false,
        paymentMode: 'credit',
        installments: [
          { dueOn: overdueOn, amountCents: 40000 },
          { dueOn: upcomingOn, amountCents: 40000 },
        ],
        lines: [
          {
            varietyId,
            sacks: 8,
            weightKg: '400',
            priceBasis: 'sack',
            unitPriceCents: 10000,
          },
        ],
      }).expect(201)
    ).body as { id: string; version: number };
    const accounts = (await as(owner)('/api/v1/accounts?limit=100').expect(200))
      .body.items as Array<{ id: string; sourceId: string; version: number }>;
    const account = accounts.find((item) => item.sourceId === sale.id)!;
    await post(`/api/v1/accounts/${account.id}/payments`, {
      clientOperationId: randomUUID(),
      expectedAccountVersion: account.version,
      amountCents: 30000,
    }).expect(201);
    const detail = (await as(owner)(`/api/v1/sales/${sale.id}`).expect(200))
      .body as {
      lines: Array<{ id: string }>;
    };
    await post(`/api/v1/sales/${sale.id}/commercial-returns`, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: sale.version,
      reason: 'Sacos dañados',
      freightAdjustmentCents: 0,
      lines: [
        {
          saleLineId: detail.lines[0]!.id,
          sacks: 1,
          weightKg: '50',
          authorizedGrossCents: 10000,
        },
      ],
    }).expect(201);
  });

  afterAll(async () => {
    if (app) await app.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('states the spec example with overdue and upcoming installments', async () => {
    const body = (
      await as(owner)(`/api/v1/receipts/buyer-statements/${buyerId}`)
        .expect(200)
        .expect('Cache-Control', 'private, no-store')
    ).body;
    expect(body).not.toHaveProperty('sourceVersion');
    expect(body.buyer).toEqual({ id: buyerId, name: 'Comercial Lima E2E' });
    expect(body.sales).toHaveLength(1);
    expect(body.sales[0]).toMatchObject({
      initialCents: '80000',
      paidCents: '30000',
      returnedCents: '10000',
      outstandingCents: '40000',
      // The payment settles the oldest installment first; the return credits the latest.
      installments: [
        { dueOn: overdueOn, outstandingCents: '10000', overdue: true },
        { dueOn: upcomingOn, outstandingCents: '30000', overdue: false },
      ],
    });
    expect(body.totals).toEqual({
      outstandingCents: '40000',
      overdueCents: '10000',
      nextDue: { dueOn: upcomingOn, amountCents: '30000' },
    });
    expect(body.imageAvailable).toBe(true);
  });

  it('keeps one PDF and one PNG per version and reuses them on the same day', async () => {
    const pdf = await as(owner)(
      `/api/v1/receipts/buyer-statements/${buyerId}.pdf`,
    )
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
      })
      .expect(200)
      .expect('Content-Type', 'application/pdf');
    expect((pdf.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.headers['content-disposition']).toMatch(
      /filename="EC-\d{8}-[0-9A-F]{6}\.pdf"/,
    );
    await as(owner)(`/api/v1/receipts/buyer-statements/${buyerId}.pdf`).expect(
      200,
    );
    await as(owner)(`/api/v1/receipts/buyer-statements/${buyerId}.png`)
      .expect(200)
      .expect('Content-Type', 'image/png');

    const documents = await dataSource
      .getRepository(ReceiptDocumentEntity)
      .find({
        where: { businessId: ownerBusinessId, sourceId: buyerId },
      });
    expect(
      documents.map((item) => [item.sourceType, item.mimeType]).sort(),
    ).toEqual([
      ['buyer-statement', 'application/pdf'],
      ['buyer-statement-image', 'image/png'],
    ]);
  });

  it('answers 404 to another business and audits the attempt in that business', async () => {
    await as(outsider)(`/api/v1/receipts/buyer-statements/${buyerId}`).expect(
      404,
    );
    const events = await dataSource.getRepository(AuditEventEntity).find({
      where: {
        action: 'authorization.cross-business-denied',
        resourceId: buyerId,
      },
    });
    expect(events.map((event) => event.businessId)).toEqual([
      outsiderBusinessId,
    ]);
  });

  it('denies the Assistant', async () => {
    await as(assistant)(
      `/api/v1/receipts/buyer-statements/${buyerId}.pdf`,
    ).expect(403);
  });
});
