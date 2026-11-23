import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PaymentStatusQueryDto } from '../http/payment-status-query.dto.js';
import { purchasePaymentStatus } from './payment-status.js';

describe('purchase payment state (spec 011, CL-MD05)', () => {
  it.each([
    [{ settlementState: 'confirmed', paymentMode: 'cash', accountBalanceCents: null }, { state: 'paid', balanceCents: '0' }],
    [{ settlementState: 'confirmed', paymentMode: 'credit', accountBalanceCents: '1250050' }, { state: 'debt', balanceCents: '1250050' }],
    [{ settlementState: 'confirmed', paymentMode: 'credit', accountBalanceCents: '0' }, { state: 'paid', balanceCents: '0' }],
    [{ settlementState: 'voided', paymentMode: 'credit', accountBalanceCents: '0' }, { state: 'voided', balanceCents: '0' }],
    [{ settlementState: 'voided', paymentMode: 'cash', accountBalanceCents: null }, { state: 'voided', balanceCents: '0' }],
  ] as const)('derives %j', (source, expected) => {
    expect(purchasePaymentStatus(source)).toEqual(expected);
  });

  it('keeps balances beyond the safe integer range exact', () => {
    expect(purchasePaymentStatus({ settlementState: 'confirmed', paymentMode: 'credit', accountBalanceCents: '9007199254740993' })).toEqual({ state: 'debt', balanceCents: '9007199254740993' });
  });
});

describe('payment status query', () => {
  const validate = (query: unknown) =>
    new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true })
      .transform(query, { metatype: PaymentStatusQueryDto, type: 'query' }) as Promise<PaymentStatusQueryDto>;
  const ids = Array.from({ length: 101 }, () => randomUUID());

  it('accepts a comma list or the repeated parameter', async () => {
    await expect(validate({ receptionIds: `${ids[0]}, ${ids[1]}` })).resolves.toMatchObject({ receptionIds: [ids[0], ids[1]] });
    await expect(validate({ receptionIds: [ids[0], ids[1]] })).resolves.toMatchObject({ receptionIds: [ids[0], ids[1]] });
  });

  it.each([
    ['nothing', {}],
    ['an empty list', { receptionIds: '' }],
    ['a value that is not a UUID', { receptionIds: `${ids[0]},otra` }],
    ['more than 100 receptions', { receptionIds: ids.join(',') }],
    ['unknown parameters', { receptionIds: ids[0], businessId: ids[1] }],
  ])('rejects %s', async (_case, query) => {
    await expect(validate(query)).rejects.toBeInstanceOf(BadRequestException);
  });
});
