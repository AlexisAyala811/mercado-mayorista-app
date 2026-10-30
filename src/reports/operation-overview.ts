import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

export type OperationOverviewQuery = { operation: 'purchase' | 'sale'; from: string; to: string };
export type OperationOverview = {
  operationCount: string;
  counterpartyCount: string;
  varietyCount: string;
  totalAmountCents: string;
  sacks: string;
  weightKg: string;
  currentBalanceCents: string;
  openAccountCount: string;
  returnCount: string;
  returnAmountCents: string;
  generatedAt: Date;
};

// Each CTE aggregates independently before combining its single result row.
// One statement gives all indicators the same PostgreSQL snapshot.
export async function operationOverview(source: Pick<DataSource, 'query'>, businessId: string, period: OperationOverviewQuery) {
  if (!['purchase', 'sale'].includes(period.operation) || period.from > period.to) {
    throw new UnprocessableEntityException('Operación o periodo no válido.');
  }
  const purchase = period.operation === 'purchase';
  const operations = purchase
    ? 'SELECT id, reception_id, liquid_amount_cents AS amount FROM purchase_settlements'
    : 'SELECT id, buyer_id, total_amount_cents AS amount FROM sales';
  const quantity = purchase
    ? `SELECT COUNT(*)::text AS sacks, COALESCE(SUM(s.net_weight_kg), 0)::text AS weight, COUNT(DISTINCT s.variety_id)::text AS varieties
       FROM reception_sacks s JOIN selected o ON o.reception_id=s.reception_id
       WHERE s.business_id=$1 AND s.voided_at IS NULL`
    : `SELECT COALESCE(SUM(l.sacks), 0)::text AS sacks, COALESCE(SUM(l.weight_kg), 0)::text AS weight, COUNT(DISTINCT l.variety_id)::text AS varieties
       FROM sale_lines l JOIN selected o ON o.id=l.sale_id`;
  const counterparties = purchase
    ? `SELECT COUNT(DISTINCT r.provider_id)::text AS count FROM receptions r JOIN selected o ON o.reception_id=r.id WHERE r.business_id=$1`
    : `SELECT COUNT(DISTINCT buyer_id)::text AS count FROM selected`;
  const returns = purchase
    ? `SELECT '0'::text AS count, '0'::text AS amount`
    : `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_refund_cents), 0)::text AS amount
       FROM sale_returns WHERE business_id=$1
       AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima')
       AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`;
  const rows = await source.query<OperationOverview[]>(`
    WITH selected AS (
      ${operations}
      WHERE business_id=$1 AND state='confirmed'
      AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima')
      AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
    ), totals AS (
      SELECT COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS amount FROM selected
    ), quantities AS (${quantity}), balances AS (
      SELECT COUNT(*)::text AS count, COALESCE(SUM(a.balance_cents), 0)::text AS amount
      FROM accounts a JOIN selected o ON a.source_id=o.id
      WHERE a.business_id=$1 AND a.source_type=$4 AND a.kind=$5 AND a.state='open'
    ), refunds AS (${returns}), counterparties AS (${counterparties})
    SELECT totals.count AS "operationCount", totals.amount AS "totalAmountCents",
      counterparties.count AS "counterpartyCount", quantities.varieties AS "varietyCount",
      quantities.sacks, quantities.weight AS "weightKg",
      balances.amount AS "currentBalanceCents", balances.count AS "openAccountCount",
      refunds.count AS "returnCount", refunds.amount AS "returnAmountCents",
      statement_timestamp() AS "generatedAt"
    FROM totals CROSS JOIN quantities CROSS JOIN balances CROSS JOIN refunds CROSS JOIN counterparties
  `, [businessId, period.from, period.to, purchase ? 'purchase-settlement' : 'sale', purchase ? 'payable' : 'receivable']);
  if (!rows[0]) throw new Error('No se pudo obtener el resumen de operaciones.');
  return { ...rows[0], operation: period.operation, period: { from: period.from, to: period.to }, balanceScope: 'current-for-period-operations' as const, returnsScope: 'confirmed-in-period' as const };
}
