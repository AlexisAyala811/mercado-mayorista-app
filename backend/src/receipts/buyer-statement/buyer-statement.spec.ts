import {
  buildBuyerStatement,
  BuyerStatementInconsistentError,
  type StatementAccountInput,
  type StatementInput,
} from './buyer-statement.js';

const buyer = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Comercial Lima',
};

function account(
  overrides: Partial<StatementAccountInput> = {},
): StatementAccountInput {
  return {
    accountId: 'account-1',
    saleId: '3f9a2c1b-0000-4000-8000-000000000001',
    saleCreatedAt: new Date('2026-10-15T15:00:00Z'),
    state: 'open',
    version: 3,
    initialCents: '80000',
    balanceCents: '40000',
    payments: [{ amountCents: '30000', isReversal: false }],
    returnCreditsCents: ['10000'],
    installments: [
      { dueOn: '2026-10-29', balanceCents: '20000', state: 'open' },
      { dueOn: '2026-11-15', balanceCents: '20000', state: 'open' },
    ],
    ...overrides,
  };
}

function input(overrides: Partial<StatementInput> = {}): StatementInput {
  return {
    businessName: 'Mercado E2E',
    buyer,
    // 30 Oct 2026, 10:42 in Lima.
    cutoffAt: new Date('2026-10-30T15:42:10Z'),
    accounts: [account()],
    ...overrides,
  };
}

describe('buildBuyerStatement', () => {
  it('reproduces the spec example: 800.00 - 300.00 - 100.00 = 400.00', () => {
    const statement = buildBuyerStatement(input());
    expect(statement.sales).toEqual([
      {
        saleId: '3f9a2c1b-0000-4000-8000-000000000001',
        saleCode: 'V-3F9A2C1B',
        saleDate: '2026-10-15',
        initialCents: '80000',
        paidCents: '30000',
        returnedCents: '10000',
        outstandingCents: '40000',
        installments: [
          { dueOn: '2026-10-29', outstandingCents: '20000', overdue: true },
          { dueOn: '2026-11-15', outstandingCents: '20000', overdue: false },
        ],
      },
    ]);
    expect(statement.totals).toEqual({
      outstandingCents: '40000',
      overdueCents: '20000',
      nextDue: { dueOn: '2026-11-15', amountCents: '20000' },
    });
    expect(statement.cutoffDate).toBe('2026-10-30');
    expect(statement.buyer).toEqual(buyer);
  });

  it('returns a valid zero statement for a buyer without debt', () => {
    const statement = buildBuyerStatement(input({ accounts: [] }));
    expect(statement.sales).toEqual([]);
    expect(statement.totals).toEqual({
      outstandingCents: '0',
      overdueCents: '0',
      nextDue: null,
    });
    expect(statement.imageAvailable).toBe(true);
  });

  it('nets reversed payments out of the paid amount', () => {
    const statement = buildBuyerStatement(
      input({
        accounts: [
          account({
            balanceCents: '70000',
            payments: [
              { amountCents: '30000', isReversal: false },
              { amountCents: '20000', isReversal: false },
              { amountCents: '20000', isReversal: true },
              { amountCents: '20000', isReversal: false },
              { amountCents: '20000', isReversal: true },
              { amountCents: '30000', isReversal: true },
            ],
            returnCreditsCents: ['10000'],
            installments: [
              { dueOn: '2026-11-15', balanceCents: '70000', state: 'open' },
            ],
          }),
        ],
      }),
    );
    expect(statement.sales[0]).toMatchObject({
      paidCents: '0',
      returnedCents: '10000',
    });
  });

  it('leaves out paid and voided accounts (CL-EC01)', () => {
    const statement = buildBuyerStatement(
      input({
        accounts: [
          account(),
          account({ accountId: 'paid', state: 'paid', balanceCents: '0' }),
          account({ accountId: 'voided', state: 'voided', balanceCents: '0' }),
        ],
      }),
    );
    expect(statement.sales).toHaveLength(1);
    expect(statement.totals.outstandingCents).toBe('40000');
  });

  it('orders sales by date and installments by due date, skipping settled ones', () => {
    const statement = buildBuyerStatement(
      input({
        accounts: [
          account({
            accountId: 'later',
            saleId: 'bbbbbbbb-0000-4000-8000-000000000002',
            saleCreatedAt: new Date('2026-10-20T15:00:00Z'),
            payments: [],
            returnCreditsCents: [],
            initialCents: '50000',
            balanceCents: '50000',
            installments: [
              { dueOn: '2026-12-01', balanceCents: '30000', state: 'open' },
              { dueOn: '2026-11-15', balanceCents: '20000', state: 'open' },
              { dueOn: '2026-10-01', balanceCents: '0', state: 'paid' },
            ],
          }),
          account(),
        ],
      }),
    );
    expect(statement.sales.map((sale) => sale.saleCode)).toEqual([
      'V-3F9A2C1B',
      'V-BBBBBBBB',
    ]);
    expect(statement.sales[1]!.installments.map((item) => item.dueOn)).toEqual([
      '2026-11-15',
      '2026-12-01',
    ]);
    // Both sales have an installment on 15 Nov: next due adds them.
    expect(statement.totals.nextDue).toEqual({
      dueOn: '2026-11-15',
      amountCents: '40000',
    });
  });

  it.each([
    // 23:59 in Lima on 29 Oct: an installment due 29 Oct is not overdue yet.
    ['2026-10-30T04:59:00Z', '2026-10-29', false],
    // 00:01 in Lima on 30 Oct: the same installment is overdue.
    ['2026-10-30T05:01:00Z', '2026-10-30', true],
  ])('uses the Lima date at cutoff %s', (instant, cutoffDate, overdue) => {
    const statement = buildBuyerStatement(
      input({ cutoffAt: new Date(instant) }),
    );
    expect(statement.cutoffDate).toBe(cutoffDate);
    expect(statement.sales[0]!.installments[0]).toMatchObject({
      dueOn: '2026-10-29',
      overdue,
    });
  });

  it('refuses figures that do not add up to the balance', () => {
    expect(() =>
      buildBuyerStatement(
        input({ accounts: [account({ balanceCents: '45000' })] }),
      ),
    ).toThrow(BuyerStatementInconsistentError);
    expect(() =>
      buildBuyerStatement(
        input({
          accounts: [
            account({
              installments: [
                { dueOn: '2026-11-15', balanceCents: '30000', state: 'open' },
              ],
            }),
          ],
        }),
      ),
    ).toThrow(/cuotas pendientes/);
  });

  it('keeps the same number for the same balances and changes it after a payment', () => {
    const first = buildBuyerStatement(input());
    const again = buildBuyerStatement(
      input({ cutoffAt: new Date('2026-10-30T20:00:00Z') }),
    );
    expect(again.statementNumber).toBe(first.statementNumber);
    expect(again.sourceVersion).toBe(first.sourceVersion);
    expect(first.statementNumber).toMatch(/^EC-20261030-[0-9A-F]{6}$/);
    expect(first.sourceVersion).toMatch(
      /^statement-v1:2026-10-30:[0-9a-f]{64}$/,
    );

    const afterPayment = buildBuyerStatement(
      input({
        accounts: [
          account({
            version: 4,
            balanceCents: '30000',
            payments: [
              { amountCents: '30000', isReversal: false },
              { amountCents: '10000', isReversal: false },
            ],
            installments: [
              { dueOn: '2026-10-29', balanceCents: '10000', state: 'open' },
              { dueOn: '2026-11-15', balanceCents: '20000', state: 'open' },
            ],
          }),
        ],
      }),
    );
    expect(afterPayment.statementNumber).not.toBe(first.statementNumber);
  });

  it('offers the image for up to 10 sales only (CL-EC06)', () => {
    const sales = (count: number) =>
      Array.from({ length: count }, (_, index) =>
        account({
          accountId: `account-${index}`,
          saleId: `${String(index).padStart(8, '0')}-0000-4000-8000-000000000000`,
        }),
      );
    expect(
      buildBuyerStatement(input({ accounts: sales(10) })).imageAvailable,
    ).toBe(true);
    const eleven = buildBuyerStatement(input({ accounts: sales(11) }));
    expect(eleven.imageAvailable).toBe(false);
    expect(eleven.imageLimit).toBe(10);
  });
});
