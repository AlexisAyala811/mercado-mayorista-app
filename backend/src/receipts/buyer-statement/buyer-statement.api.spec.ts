import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Response } from 'express';
import type { DataSource, EntityManager } from 'typeorm';

import { AccountInstallmentEntity } from '../../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../../accounts/entities/account-payment.entity.js';
import { AccountEntity } from '../../accounts/entities/account.entity.js';
import type { AuditService } from '../../audit/audit.service.js';
import { BuyerEntity } from '../../catalog/entities/buyer.entity.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { BusinessEntity } from '../../identity/entities/business.entity.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { RolesGuard } from '../../identity/http/roles.guard.js';
import { SaleReturnEntity } from '../../sales/entities/sale-return.entity.js';
import { SaleEntity } from '../../sales/entities/sale.entity.js';
import type { ReceiptsService } from '../receipts.service.js';
import { BuyerStatementController } from './buyer-statement.controller.js';
import { BuyerStatementService } from './buyer-statement.service.js';

const identity: SessionIdentity = {
  businessId: 'business-a',
  businessName: 'Mercado E2E',
  expiresAt: new Date('2099-01-01'),
  role: UserRole.Wholesaler,
  sessionId: 'session',
  userId: 'user-a',
  username: 'mayorista',
};
const buyerId = '11111111-1111-4111-8111-111111111111';
const saleId = '3f9a2c1b-0000-4000-8000-000000000001';

function fixture(
  options: { accounts?: number; balance?: string; buyer?: boolean } = {},
) {
  const count = options.accounts ?? 1;
  const accounts = Array.from({ length: count }, (_, index) => ({
    id: `account-${index}`,
    sourceId:
      index === 0 ? saleId : `${index}`.padStart(8, '0') + saleId.slice(8),
    state: 'open',
    version: 2,
    initialAmountCents: '80000',
    balanceCents: options.balance ?? '40000',
    createdAt: new Date('2026-10-15T15:00:00Z'),
  }));
  const repositories = new Map<
    unknown,
    Record<string, ReturnType<typeof vi.fn>>
  >([
    [
      BuyerEntity,
      {
        findOne: vi
          .fn()
          .mockResolvedValue(
            options.buyer === false
              ? null
              : { id: buyerId, name: 'Comercial Lima' },
          ),
      },
    ],
    [
      BusinessEntity,
      {
        findOneOrFail: vi
          .fn()
          .mockResolvedValue({ displayName: 'Mercado E2E' }),
      },
    ],
    [AccountEntity, { find: vi.fn().mockResolvedValue(accounts) }],
    [
      AccountPaymentEntity,
      {
        find: vi.fn().mockResolvedValue(
          accounts.map((a) => ({
            accountId: a.id,
            amountCents: '30000',
            isReversal: false,
          })),
        ),
      },
    ],
    [
      AccountInstallmentEntity,
      {
        find: vi.fn().mockResolvedValue(
          accounts.flatMap((a) => [
            {
              accountId: a.id,
              dueOn: '2026-10-29',
              balanceCents: '20000',
              state: 'open',
            },
            {
              accountId: a.id,
              dueOn: '2026-11-15',
              balanceCents: '20000',
              state: 'open',
            },
          ]),
        ),
      },
    ],
    [
      SaleEntity,
      {
        find: vi
          .fn()
          .mockResolvedValue(
            accounts.map((a) => ({ id: a.sourceId, createdAt: a.createdAt })),
          ),
      },
    ],
    [
      SaleReturnEntity,
      {
        find: vi.fn().mockResolvedValue(
          accounts.map((a) => ({
            saleId: a.sourceId,
            accountCreditCents: '10000',
          })),
        ),
      },
    ],
  ]);
  const manager = {
    getRepository: (entity: unknown) => repositories.get(entity),
  } as unknown as EntityManager;
  const transaction = vi.fn(
    async (_level: string, work: (m: EntityManager) => unknown) =>
      work(manager),
  );
  const getOrCreateDocument = vi.fn(
    async (
      _i: unknown,
      _t: string,
      _s: string,
      _v: string,
      render: () => Promise<Buffer>,
      _format?: { extension: string; mimeType: string },
    ) => render(),
  );
  const service = new BuyerStatementService(
    { transaction } as unknown as DataSource,
    { getOrCreateDocument } as unknown as ReceiptsService,
  );
  return { service, repositories, transaction, getOrCreateDocument };
}

describe('BuyerStatementService', () => {
  it('reads one REPEATABLE READ snapshot scoped to the business and open receivables', async () => {
    const f = fixture();
    const statement = await f.service.statement(
      identity,
      buyerId,
      new Date('2026-10-30T15:42:10Z'),
    );
    expect(f.transaction).toHaveBeenCalledWith(
      'REPEATABLE READ',
      expect.any(Function),
    );
    expect(f.repositories.get(BuyerEntity)!.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: 'business-a', id: buyerId },
      }),
    );
    expect(f.repositories.get(AccountEntity)!.find).toHaveBeenCalledWith({
      where: expect.objectContaining({
        businessId: 'business-a',
        counterpartyId: buyerId,
        counterpartyType: 'buyer',
        kind: 'receivable',
        state: 'open',
      }),
    });
    expect(statement.totals.outstandingCents).toBe('40000');
    expect(statement.sales[0]).toMatchObject({
      paidCents: '30000',
      returnedCents: '10000',
    });
  });

  it('answers 404 for a buyer outside the business', async () => {
    await expect(
      fixture({ buyer: false }).service.statement(identity, buyerId),
    ).rejects.toThrow(NotFoundException);
  });

  it('turns figures that do not add up into 409 statement-inconsistent', async () => {
    const error = await fixture({ balance: '45000' })
      .service.statement(identity, buyerId)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toMatchObject({
      code: 'statement-inconsistent',
    });
  });

  it('keeps the PDF and PNG as documents of their own type and version', async () => {
    const f = fixture();
    const pdf = await f.service.pdf(identity, buyerId);
    const png = await f.service.png(identity, buyerId);
    expect(pdf.content.subarray(0, 5).toString()).toBe('%PDF-');
    expect(png.content.subarray(1, 4).toString()).toBe('PNG');
    expect(
      f.getOrCreateDocument.mock.calls.map((call) => [
        call[1],
        call[2],
        call[3],
        call[5],
      ]),
    ).toEqual([
      ['buyer-statement', buyerId, pdf.statement.sourceVersion, undefined],
      [
        'buyer-statement-image',
        buyerId,
        png.statement.sourceVersion,
        { extension: 'png', mimeType: 'image/png' },
      ],
    ]);
  });

  it('refuses the image with more than 10 sales without storing anything', async () => {
    const f = fixture({ accounts: 11 });
    const error = await f.service
      .png(identity, buyerId)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).getResponse()).toMatchObject(
      {
        code: 'statement-image-too-long',
      },
    );
    expect(f.getOrCreateDocument).not.toHaveBeenCalled();
  });
});

describe('BuyerStatementController', () => {
  it('lets only the Wholesaler in and audits the denied Assistant', async () => {
    const recordDirect = vi.fn().mockResolvedValue(undefined);
    const controller = new BuyerStatementController(
      {} as BuyerStatementService,
      {} as AuditService,
    );
    const guard = new RolesGuard(new Reflector(), {
      recordDirect,
    } as unknown as AuditService);
    const context = {
      getHandler: () => controller.pdf,
      getClass: () => BuyerStatementController,
      switchToHttp: () => ({
        getRequest: () => ({
          identity: { ...identity, role: UserRole.Assistant },
          method: 'GET',
          path: `/receipts/buyer-statements/${buyerId}.pdf`,
        }),
      }),
    } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(recordDirect).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'authorization.denied' }),
    );
  });

  it('sends the PDF without caching and named after the statement number', async () => {
    const f = fixture();
    const controller = new BuyerStatementController(
      f.service,
      {} as AuditService,
    );
    const set = vi.fn();
    await controller.pdf(identity, buyerId, { set } as unknown as Response);
    expect(set).toHaveBeenCalledWith({
      'Cache-Control': 'private, no-store',
      'Content-Disposition': expect.stringMatching(
        /^attachment; filename="EC-\d{8}-[0-9A-F]{6}\.pdf"$/,
      ),
      'Content-Type': 'application/pdf',
    });
  });

  it('does not expose the internal source version in the summary', async () => {
    const f = fixture();
    const controller = new BuyerStatementController(
      f.service,
      {} as AuditService,
    );
    const summary = await controller.summary(identity, buyerId);
    expect(summary).not.toHaveProperty('sourceVersion');
    expect(summary).toHaveProperty('statementNumber');
  });
});
