import { createHash } from 'node:crypto';

// Spec 009 (HU16/RF27). Pure calculation of a buyer's account statement from
// confirmed receivable data; reading and persistence live in the service.

export const STATEMENT_IMAGE_SALE_LIMIT = 10;
const TIME_ZONE = 'America/Lima';

export type StatementInstallmentInput = {
  dueOn: string;
  balanceCents: string;
  state: 'open' | 'paid' | 'voided';
};

export type StatementAccountInput = {
  accountId: string;
  saleId: string;
  saleCreatedAt: Date;
  state: 'open' | 'paid' | 'voided';
  version: number;
  initialCents: string;
  balanceCents: string;
  payments: Array<{ amountCents: string; isReversal: boolean }>;
  returnCreditsCents: string[];
  installments: StatementInstallmentInput[];
};

export type StatementInput = {
  businessName: string;
  buyer: { id: string; name: string };
  cutoffAt: Date;
  accounts: StatementAccountInput[];
};

export type StatementInstallment = {
  dueOn: string;
  outstandingCents: string;
  overdue: boolean;
};

export type StatementSale = {
  saleId: string;
  saleCode: string;
  saleDate: string;
  initialCents: string;
  paidCents: string;
  returnedCents: string;
  outstandingCents: string;
  installments: StatementInstallment[];
};

export type BuyerStatement = {
  statementNumber: string;
  sourceVersion: string;
  cutoffAt: string;
  cutoffDate: string;
  businessName: string;
  buyer: { id: string; name: string };
  totals: {
    outstandingCents: string;
    overdueCents: string;
    nextDue: { dueOn: string; amountCents: string } | null;
  };
  sales: StatementSale[];
  imageAvailable: boolean;
  imageLimit: number;
};

/** The confirmed figures of an account do not add up; no document is produced. */
export class BuyerStatementInconsistentError extends Error {
  readonly code = 'statement-inconsistent';

  constructor(
    readonly accountId: string,
    detail: string,
  ) {
    super(`La cuenta ${accountId} no cuadra: ${detail}`);
    this.name = 'BuyerStatementInconsistentError';
  }
}

export function limaDate(instant: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(
    instant,
  );
}

export function buildBuyerStatement(input: StatementInput): BuyerStatement {
  const cutoffDate = limaDate(input.cutoffAt);
  // CL-EC01: only receivables that still owe money.
  const accounts = input.accounts
    .filter(
      (account) =>
        account.state === 'open' && BigInt(account.balanceCents) > 0n,
    )
    .sort(
      (left, right) =>
        left.saleCreatedAt.getTime() - right.saleCreatedAt.getTime() ||
        left.saleId.localeCompare(right.saleId),
    );

  const sales = accounts.map((account) => toSale(account, cutoffDate));
  const installments = sales.flatMap((sale) => sale.installments);
  const outstanding = sum(sales.map((sale) => sale.outstandingCents));
  const overdue = sum(
    installments
      .filter((item) => item.overdue)
      .map((item) => item.outstandingCents),
  );
  // Next due date that is not yet overdue, adding every installment on that day.
  const upcoming = installments
    .filter((item) => !item.overdue)
    .map((item) => item.dueOn)
    .sort()[0];
  const nextDue = upcoming
    ? {
        dueOn: upcoming,
        amountCents: sum(
          installments
            .filter((item) => item.dueOn === upcoming)
            .map((item) => item.outstandingCents),
        ).toString(),
      }
    : null;

  const fingerprint = createHash('sha256')
    .update(input.buyer.id)
    .update(
      accounts
        .map(
          (account) =>
            `${account.accountId}:${account.version}:${account.balanceCents}`,
        )
        .sort()
        .join('|'),
    )
    .digest('hex');

  return {
    statementNumber: `EC-${cutoffDate.replaceAll('-', '')}-${fingerprint.slice(0, 6).toUpperCase()}`,
    sourceVersion: `statement-v1:${cutoffDate}:${fingerprint}`,
    cutoffAt: input.cutoffAt.toISOString(),
    cutoffDate,
    businessName: input.businessName,
    buyer: input.buyer,
    totals: {
      outstandingCents: outstanding.toString(),
      overdueCents: overdue.toString(),
      nextDue,
    },
    sales,
    imageAvailable: sales.length <= STATEMENT_IMAGE_SALE_LIMIT,
    imageLimit: STATEMENT_IMAGE_SALE_LIMIT,
  };
}

function toSale(
  account: StatementAccountInput,
  cutoffDate: string,
): StatementSale {
  const paid =
    sum(
      account.payments.filter((p) => !p.isReversal).map((p) => p.amountCents),
    ) -
    sum(account.payments.filter((p) => p.isReversal).map((p) => p.amountCents));
  const returned = sum(account.returnCreditsCents);
  const initial = BigInt(account.initialCents);
  const balance = BigInt(account.balanceCents);
  if (initial - paid - returned !== balance)
    throw new BuyerStatementInconsistentError(
      account.accountId,
      `inicial ${initial} - abonos ${paid} - devoluciones ${returned} != saldo ${balance}`,
    );

  const installments = account.installments
    .filter((item) => item.state === 'open' && BigInt(item.balanceCents) > 0n)
    .sort((left, right) => left.dueOn.localeCompare(right.dueOn))
    .map((item) => ({
      dueOn: item.dueOn,
      outstandingCents: item.balanceCents,
      overdue: item.dueOn < cutoffDate,
    }));
  const scheduled = sum(installments.map((item) => item.outstandingCents));
  if (scheduled !== balance)
    throw new BuyerStatementInconsistentError(
      account.accountId,
      `cuotas pendientes ${scheduled} != saldo ${balance}`,
    );

  return {
    saleId: account.saleId,
    saleCode: `V-${account.saleId.replaceAll('-', '').slice(0, 8).toUpperCase()}`,
    saleDate: limaDate(account.saleCreatedAt),
    initialCents: initial.toString(),
    paidCents: paid.toString(),
    returnedCents: returned.toString(),
    outstandingCents: balance.toString(),
    installments,
  };
}

function sum(values: string[]) {
  return values.reduce((total, value) => total + BigInt(value), 0n);
}
