// unstable_mockModule is only typed in @jest/globals; the rest uses the global jest.
import { jest as esmJest } from '@jest/globals';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';

// ESM: the module mock is registered before the modules under test are
// imported, so they are loaded with await import() afterwards (spec 020).
const actualRenderer = await import('./pdf-receipt.renderer.js');
esmJest.unstable_mockModule('./pdf-receipt.renderer.js', () => ({
  ...actualRenderer,
  renderReceiptPdf: jest.fn(async () => Buffer.from('%PDF-new-projection')),
}));
const { ReceiptsService } = await import('./receipts.service.js');
const { renderReceiptPdf } = await import('./pdf-receipt.renderer.js');

const identity = { businessId: 'business', userId: 'actor' } as SessionIdentity;
function fixture() {
  const old = { content: Buffer.from('%PDF-old'), retentionUntil: new Date('2031-10-14'), sourceVersion: 'confirmed:v0:date-lima-v1' };
  const stored = [old];
  const builder = { update: jest.fn(), set: jest.fn(), where: jest.fn(), andWhere: jest.fn(), execute: jest.fn() };
  for (const method of ['update', 'set', 'where', 'andWhere'] as const) builder[method].mockReturnValue(builder);
  const documents = {
    findOne: jest.fn(async ({ where }: { where: { sourceVersion: string } }) => stored.find((row) => row.sourceVersion === where.sourceVersion) ?? null),
    create: jest.fn((value: typeof old) => value),
    save: jest.fn(async (value: typeof old) => { stored.push(value); return { ...value, id: 'document' }; }),
    createQueryBuilder: jest.fn(() => builder),
  };
  const manager = { query: jest.fn(), getRepository: jest.fn(() => documents) };
  const dataSource = { transaction: jest.fn(async (run: (value: typeof manager) => Promise<Buffer>) => run(manager)) };
  const audit = { record: jest.fn(), recordDirect: jest.fn() };
  const business = { findOneByOrFail: jest.fn(async () => ({ displayName: 'Mercado QA' })) };
  const purchase = { findOne: jest.fn(async () => ({ id: 'purchase', receptionId: 'reception', state: 'closed', version: 1, grossAmountCents: '1000', freightAmountCents: '0', advancesCents: '0', discountsCents: '0', liquidAmountCents: '1000', paymentMode: 'cash' })) };
  const receptions = { findOneByOrFail: jest.fn(async () => ({ id: 'reception', providerId: 'provider', receivedOn: '2026-10-14' })) };
  const historical = { qualityId: 'q', qualityName: 'Calidad original', originId: 'o', originName: 'Origen original' };
  const sacks = { find: jest.fn(async () => [{ varietyId: 'v', netWeightKg: '10.001', ...historical }, { varietyId: 'v', netWeightKg: '20.002' }]) };
  const party = { findOneByOrFail: jest.fn(async () => ({ name: 'Persona QA' })) };
  const varieties = { findBy: jest.fn(async () => [{ id: 'v', name: 'Canchán' }]) };
  const sales = { findOne: jest.fn(async () => ({ id: 'sale', buyerId: 'buyer', state: 'confirmed', version: 0, createdAt: new Date('2026-10-14T06:00:00Z'), grossAmountCents: '1000', freightAmountCents: '0', discountsCents: '0', totalAmountCents: '1000', paymentMode: 'cash' })) };
  const original = { id: 'line', saleId: 'sale', varietyId: 'v', sacks: 1, weightKg: '10.000', unitPriceCents: '100', priceBasis: 'kilogram', subtotalCents: '1000', ...historical };
  const saleLines = { find: jest.fn(async () => [original]), findBy: jest.fn(async () => [original]) };
  const returns = { findOne: jest.fn(async () => ({ id: 'return', saleId: 'sale', saleVersionAfter: 1, createdAt: new Date('2026-10-14T06:00:00Z'), merchandiseGrossCents: '500', allocatedSaleDiscountCents: '0', freightAdjustmentCents: '0', accountCreditCents: '0', cashRefundCents: '500', totalRefundCents: '500' })) };
  const returnLines = { find: jest.fn(async () => [{ saleLineId: 'line', returnedSacks: 0, returnedWeightKg: '5.000', netRefundCents: '500', authorizedGrossCents: '500', allocatedSaleDiscountCents: '0' }]) };
  const args = [dataSource, audit, { getOrThrow: () => 5 }, business, purchase, receptions, sacks, party, varieties, sales, saleLines, returns, returnLines, {}, {}, party, documents];
  const service = new ReceiptsService(...args as unknown as ConstructorParameters<typeof ReceiptsService>);
  return { service, documents, old, stored, original, audit, saleLines };
}

describe('RF04 receipt service projection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps purchase sacks with different characteristics separate', async () => {
    const { service } = fixture();
    await service.purchase(identity, 'purchase');
    const receipt = jest.mocked(renderReceiptPdf).mock.calls[0]![0];
    expect(receipt.lines).toHaveLength(2);
    expect(receipt.lines[0]!.detail).toContain('10.001 kg netos\nCalidad: Calidad original');
    expect(receipt.lines[1]!.detail).toContain('20.002 kg netos\nCalidad: No informada');
  });

  it('retains prior bytes and retention, then reuses the new sale version', async () => {
    const { service, documents, old, stored } = fixture();
    const bytes = Buffer.from(old.content);
    const retention = old.retentionUntil.toISOString();
    const first = await service.sale(identity, 'sale');
    const repeated = await service.sale(identity, 'sale');
    expect(repeated).toEqual(first);
    expect(renderReceiptPdf).toHaveBeenCalledTimes(1);
    expect(documents.save).toHaveBeenCalledTimes(1);
    expect(stored).toHaveLength(2);
    expect(old.content).toEqual(bytes);
    expect(old.retentionUntil.toISOString()).toBe(retention);
    expect(stored[1]!.sourceVersion).toBe('confirmed:v0:date-lima-v1:characteristics-v1');
    expect(jest.mocked(renderReceiptPdf).mock.calls[0]![0].lines[0]!.detail)
      .toContain('Calidad: Calidad original · Procedencia: Origen original');
  });

  it('inherits return labels from its original sale line without another classification', async () => {
    const { service, saleLines, documents } = fixture();
    await service.saleReturn(identity, 'return');
    expect(saleLines.findBy).toHaveBeenCalledWith([{ id: 'line', saleId: 'sale' }]);
    expect(jest.mocked(renderReceiptPdf).mock.calls[0]![0].lines[0]!.detail)
      .toContain('Calidad: Calidad original · Procedencia: Origen original');
    expect(documents.create.mock.calls[0]![0].sourceVersion)
      .toBe('confirmed:v1:date-lima-v1:characteristics-v1');
  });
});
