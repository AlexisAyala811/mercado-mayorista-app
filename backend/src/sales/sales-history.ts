import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import type { SalesHistoryFilterDto } from './http/sales-history-query.dto.js';

// Spec 011 (RQ-ST05, CL-ST04): payment data of «Ver ventas». A voided sale is
// voided; otherwise it has debt while its receivable account keeps a balance.
export type SalePaymentState = 'paid' | 'debt' | 'voided';

// SQL for the receivable balance and the payment state of the sale in `alias`.
export const saleBalanceSql = (alias: string) => `COALESCE((
  SELECT SUM(GREATEST(a.balance_cents, 0)) FROM accounts a
  WHERE a.business_id = ${alias}.business_id AND a.source_type = 'sale' AND a.source_id = ${alias}.id
), 0)`;
export const salePaymentStateSql = (alias: string) => `(CASE
  WHEN ${alias}.state = 'voided' THEN 'voided'
  WHEN ${saleBalanceSql(alias)} > 0 THEN 'debt'
  ELSE 'paid' END)`;

export type SaleHistoryFacts = {
  varieties: string[];
  sacks: number;
  weightKg: string;
  paidCents: string;
  balanceCents: string;
  paymentState: SalePaymentState;
};

export async function saleHistoryFacts(
  source: Pick<DataSource, 'query'>,
  businessId: string,
  saleIds: readonly string[],
) {
  if (saleIds.length === 0) return new Map<string, SaleHistoryFacts>();
  const rows = await source.query<(SaleHistoryFacts & { id: string })[]>(
    `SELECT s.id,
      COALESCE((SELECT array_agg(DISTINCT v.name ORDER BY v.name) FROM sale_lines l
        JOIN potato_varieties v ON v.id = l.variety_id AND v.business_id = s.business_id
        WHERE l.sale_id = s.id), '{}') AS varieties,
      COALESCE((SELECT SUM(l.sacks) FROM sale_lines l WHERE l.sale_id = s.id), 0)::int AS sacks,
      to_char(COALESCE((SELECT SUM(l.weight_kg) FROM sale_lines l WHERE l.sale_id = s.id), 0), 'FM999999999990.000') AS "weightKg",
      ${salePaymentStateSql('s')} AS "paymentState",
      (CASE WHEN s.state = 'voided' THEN 0 ELSE ${saleBalanceSql('s')} END)::text AS "balanceCents",
      (CASE WHEN s.state = 'voided' THEN 0 ELSE s.total_amount_cents - ${saleBalanceSql('s')} END)::text AS "paidCents"
    FROM sales s WHERE s.business_id = $1 AND s.id = ANY($2::uuid[])`,
    [businessId, [...saleIds]],
  );
  return new Map(rows.map(({ id, ...facts }) => [id, facts]));
}

export async function salesHistorySummary(
  source: Pick<DataSource, 'query'>,
  businessId: string,
  filters: SalesHistoryFilterDto,
) {
  if (filters.from && filters.to && filters.from > filters.to)
    throw new UnprocessableEntityException(
      'La fecha inicial debe ser anterior o igual a la final.',
    );
  const parameters: unknown[] = [businessId];
  const bind = (value: unknown) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };
  const where = ['s.business_id = $1'];
  if (filters.from)
    where.push(
      `s.created_at >= (${bind(filters.from)}::date::timestamp AT TIME ZONE 'America/Lima')`,
    );
  if (filters.to)
    where.push(
      `s.created_at < ((${bind(filters.to)}::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`,
    );
  if (filters.search)
    where.push(`strpos(lower(b.name), lower(${bind(filters.search)})) > 0`);
  if (filters.buyerId) where.push(`s.buyer_id = ${bind(filters.buyerId)}`);
  if (filters.state) where.push(`s.state = ${bind(filters.state)}`);
  const [row] = await source.query<
    {
      all_count: number;
      paid: number;
      debt: number;
      voided: number;
      total: string;
      paid_cents: string;
      balance: string;
    }[]
  >(
    `WITH history AS (
      SELECT s.total_amount_cents, ${salePaymentStateSql('s')} AS payment_state,
        (CASE WHEN s.state = 'voided' THEN 0 ELSE ${saleBalanceSql('s')} END) AS balance
      FROM sales s LEFT JOIN buyers b ON b.id = s.buyer_id AND b.business_id = s.business_id
      WHERE ${where.join(' AND ')}
    )
    SELECT COUNT(*)::int AS all_count,
      COUNT(*) FILTER (WHERE payment_state = 'paid')::int AS paid,
      COUNT(*) FILTER (WHERE payment_state = 'debt')::int AS debt,
      COUNT(*) FILTER (WHERE payment_state = 'voided')::int AS voided,
      COALESCE(SUM(total_amount_cents) FILTER (WHERE payment_state <> 'voided'), 0)::text AS total,
      COALESCE(SUM(total_amount_cents - balance) FILTER (WHERE payment_state <> 'voided'), 0)::text AS paid_cents,
      COALESCE(SUM(balance), 0)::text AS balance
    FROM history`,
    parameters,
  );
  return {
    balanceCents: row?.balance ?? '0',
    counts: {
      all: row?.all_count ?? 0,
      debt: row?.debt ?? 0,
      paid: row?.paid ?? 0,
      voided: row?.voided ?? 0,
    },
    paidCents: row?.paid_cents ?? '0',
    totalCents: row?.total ?? '0',
  };
}
