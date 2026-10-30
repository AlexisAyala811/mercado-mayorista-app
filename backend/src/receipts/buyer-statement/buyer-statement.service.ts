import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';

import { AccountInstallmentEntity } from '../../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../../accounts/entities/account-payment.entity.js';
import {
  AccountEntity,
  AccountKind,
  AccountState,
} from '../../accounts/entities/account.entity.js';
import { BuyerEntity } from '../../catalog/entities/buyer.entity.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { BusinessEntity } from '../../identity/entities/business.entity.js';
import { SaleReturnEntity } from '../../sales/entities/sale-return.entity.js';
import { SaleEntity } from '../../sales/entities/sale.entity.js';
import { ReceiptsService } from '../receipts.service.js';
import {
  buildBuyerStatement,
  BuyerStatementInconsistentError,
  STATEMENT_IMAGE_SALE_LIMIT,
  type BuyerStatement,
  type StatementInput,
} from './buyer-statement.js';
import { renderBuyerStatementPng } from './buyer-statement.image.js';
import { renderBuyerStatementPdf } from './buyer-statement.pdf.js';
import { buildStatementView } from './buyer-statement.view.js';

@Injectable()
export class BuyerStatementService {
  private readonly logger = new Logger(BuyerStatementService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly receipts: ReceiptsService,
  ) {}

  async statement(
    identity: SessionIdentity,
    buyerId: string,
    now = new Date(),
  ): Promise<BuyerStatement> {
    // One snapshot: accounts, payments, returns and installments of the same instant.
    const input = await this.dataSource.transaction(
      'REPEATABLE READ',
      (manager) => readInput(manager, identity.businessId, buyerId, now),
    );
    try {
      return buildBuyerStatement(input);
    } catch (error) {
      if (!(error instanceof BuyerStatementInconsistentError)) throw error;
      this.logger.error(
        JSON.stringify({
          accountId: error.accountId,
          businessId: identity.businessId,
          code: error.code,
          detail: error.message,
        }),
      );
      throw new ConflictException({
        code: error.code,
        message:
          'Las cifras de una cuenta del comprador no cuadran; no se generó el estado de cuenta.',
      });
    }
  }

  async pdf(identity: SessionIdentity, buyerId: string) {
    const statement = await this.statement(identity, buyerId);
    const content = await this.receipts.getOrCreateDocument(
      identity,
      'buyer-statement',
      buyerId,
      statement.sourceVersion,
      () => renderBuyerStatementPdf(buildStatementView(statement)),
    );
    return { content, statement };
  }

  async png(identity: SessionIdentity, buyerId: string) {
    const statement = await this.statement(identity, buyerId);
    if (!statement.imageAvailable)
      throw new UnprocessableEntityException({
        code: 'statement-image-too-long',
        message: `Con más de ${STATEMENT_IMAGE_SALE_LIMIT} ventas pendientes el estado de cuenta no cabe legible en una imagen; envíalo en PDF.`,
      });
    const content = await this.receipts.getOrCreateDocument(
      identity,
      'buyer-statement-image',
      buyerId,
      statement.sourceVersion,
      async () => renderBuyerStatementPng(buildStatementView(statement)),
      { extension: 'png', mimeType: 'image/png' },
    );
    return { content, statement };
  }
}

async function readInput(
  manager: EntityManager,
  businessId: string,
  buyerId: string,
  now: Date,
): Promise<StatementInput> {
  const buyer = await manager.getRepository(BuyerEntity).findOne({
    select: { id: true, name: true },
    where: { businessId, id: buyerId },
  });
  if (!buyer) throw new NotFoundException('Comprador no encontrado.');
  const business = await manager.getRepository(BusinessEntity).findOneOrFail({
    select: { displayName: true },
    where: { id: businessId },
  });

  // CL-EC01: open receivables of this buyer only.
  const accounts = await manager.getRepository(AccountEntity).find({
    where: {
      businessId,
      counterpartyId: buyerId,
      counterpartyType: 'buyer',
      kind: AccountKind.Receivable,
      sourceType: 'sale',
      state: AccountState.Open,
    },
  });
  const accountIds = accounts.map((account) => account.id);
  const saleIds = accounts.map((account) => account.sourceId);
  const [payments, installments, sales, returns] = accountIds.length
    ? await Promise.all([
        manager
          .getRepository(AccountPaymentEntity)
          .find({ where: { businessId, accountId: In(accountIds) } }),
        manager
          .getRepository(AccountInstallmentEntity)
          .find({ where: { accountId: In(accountIds) } }),
        manager.getRepository(SaleEntity).find({
          select: { id: true, createdAt: true },
          where: { businessId, id: In(saleIds) },
        }),
        manager.getRepository(SaleReturnEntity).find({
          select: { saleId: true, accountCreditCents: true },
          where: { businessId, saleId: In(saleIds) },
        }),
      ])
    : [[], [], [], []];
  const saleDates = new Map(sales.map((sale) => [sale.id, sale.createdAt]));

  return {
    businessName: business.displayName,
    buyer: { id: buyer.id, name: buyer.name },
    cutoffAt: now,
    accounts: accounts.map((account) => ({
      accountId: account.id,
      saleId: account.sourceId,
      saleCreatedAt: saleDates.get(account.sourceId) ?? account.createdAt,
      state: account.state,
      version: account.version,
      initialCents: account.initialAmountCents,
      balanceCents: account.balanceCents,
      payments: payments
        .filter((payment) => payment.accountId === account.id)
        .map((payment) => ({
          amountCents: payment.amountCents,
          isReversal: payment.isReversal,
        })),
      returnCreditsCents: returns
        .filter((item) => item.saleId === account.sourceId)
        .map((item) => item.accountCreditCents),
      installments: installments
        .filter((item) => item.accountId === account.id)
        .map((item) => ({
          dueOn: item.dueOn,
          balanceCents: item.balanceCents,
          state: item.state,
        })),
    })),
  };
}
