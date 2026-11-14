import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import { toPage } from '../common/http/page-query.dto.js';
import type {
  PurchaseHistoryFilterDto,
  PurchaseHistoryQueryDto,
  PurchaseHistoryState,
} from './http/purchase-history-query.dto.js';

// Spec 011 (RQ-ST05, CL-ST04): «Ver compras» as Stitch shows it. One row per
// reception with its latest settlement, its live sacks and the payable
// account. The payment state follows CL-MD05 (`domain/payment-status.ts`);
// the e2e test checks both give the same state for every reception.
export type PurchaseHistoryItem = {
  receptionId: string;
  receivedOn: string;
  receptionState: string;
  providerId: string;
  providerName: string | null;
  settlementId: string | null;
  varieties: string[];
  sacks: number;
  netWeightKg: string;
  totalCents: string | null;
  paidCents: string;
  balanceCents: string;
  paymentState: PurchaseHistoryState;
};

export type PurchaseHistorySummary = {
  counts: Record<PurchaseHistoryState | 'all', number>;
  totalCents: string;
  paidCents: string;
  balanceCents: string;
};

function base(filters: PurchaseHistoryFilterDto) {
  if (filters.from && filters.to && filters.from > filters.to)
    throw new UnprocessableEntityException(
      'La fecha inicial debe ser anterior o igual a la final.',
    );
  const parameters: unknown[] = [];
  const bind = (value: unknown) => {
    parameters.push(value);
    return `$${parameters.length}`;
  };
  const business = bind(null);
  const where = [`r.business_id = ${business}`];
  if (filters.from) where.push(`r.received_on >= ${bind(filters.from)}::date`);
  if (filters.to) where.push(`r.received_on <= ${bind(filters.to)}::date`);
  if (filters.search)
    where.push(`strpos(lower(p.name), lower(${bind(filters.search)})) > 0`);
  if (filters.providerId)
    where.push(`r.provider_id = ${bind(filters.providerId)}`);
  const sql = `
    WITH latest AS (
      SELECT DISTINCT ON (s.reception_id) s.reception_id, s.id, s.state, s.payment_mode, s.liquid_amount_cents
      FROM purchase_settlements s WHERE s.business_id = ${business}
      ORDER BY s.reception_id, s.created_at DESC, s.id DESC
    ), sacks AS (
      SELECT k.reception_id, COUNT(*)::int AS sacks, COALESCE(SUM(k.net_weight_kg), 0) AS weight,
        array_agg(DISTINCT v.name ORDER BY v.name) AS varieties
      FROM reception_sacks k
      JOIN potato_varieties v ON v.id = k.variety_id AND v.business_id = k.business_id
      WHERE k.business_id = ${business} AND k.voided_at IS NULL
      GROUP BY k.reception_id
    ), history AS (
      SELECT r.id, r.received_on, r.state::text AS reception_state, r.provider_id, r.created_at,
        p.name AS provider_name, l.id AS settlement_id, l.liquid_amount_cents,
        COALESCE(k.sacks, 0) AS sacks, COALESCE(k.weight, 0) AS weight, COALESCE(k.varieties, '{}') AS varieties,
        CASE
          WHEN l.id IS NULL THEN 'unsettled'
          WHEN l.state = 'voided' THEN 'voided'
          WHEN l.payment_mode = 'cash' OR a.id IS NULL OR a.balance_cents <= 0 THEN 'paid'
          ELSE 'debt'
        END AS payment_state,
        CASE
          WHEN l.id IS NULL OR l.state = 'voided' OR l.payment_mode = 'cash' OR a.id IS NULL THEN 0
          ELSE GREATEST(a.balance_cents, 0)
        END AS balance_cents
      FROM receptions r
      LEFT JOIN providers p ON p.id = r.provider_id AND p.business_id = r.business_id
      LEFT JOIN latest l ON l.reception_id = r.id
      LEFT JOIN accounts a ON a.business_id = r.business_id
        AND a.source_type = 'purchase-settlement' AND a.source_id = l.id
      LEFT JOIN sacks k ON k.reception_id = r.id
      WHERE ${where.join(' AND ')}
    )`;
  return { bind, parameters, sql };
}

export async function purchaseHistory(
  source: Pick<DataSource, 'query'>,
  businessId: string,
  query: PurchaseHistoryQueryDto,
) {
  const { bind, parameters, sql } = base(query);
  parameters[0] = businessId;
  const state = query.paymentState
    ? `WHERE payment_state = ${bind(query.paymentState)}`
    : '';
  const limit = bind(query.limit);
  const offset = bind(query.offset);
  const [result] = await source.query<
    { total: number; items: PurchaseHistoryItem[] }[]
  >(
    `${sql}, filtered AS (SELECT * FROM history ${state})
    SELECT (SELECT COUNT(*)::int FROM filtered) AS total,
      COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'receptionId', f.id, 'receivedOn', to_char(f.received_on, 'YYYY-MM-DD'),
        'receptionState', f.reception_state, 'providerId', f.provider_id, 'providerName', f.provider_name,
        'settlementId', f.settlement_id, 'varieties', to_jsonb(f.varieties), 'sacks', f.sacks,
        'netWeightKg', to_char(f.weight, 'FM999999999990.000'),
        'totalCents', CASE WHEN f.settlement_id IS NULL THEN NULL ELSE f.liquid_amount_cents::text END,
        'paidCents', CASE WHEN f.payment_state IN ('paid', 'debt') THEN (f.liquid_amount_cents - f.balance_cents)::text ELSE '0' END,
        'balanceCents', f.balance_cents::text, 'paymentState', f.payment_state
      ) ORDER BY f.received_on DESC, f.created_at DESC, f.id DESC)
      FROM (SELECT * FROM filtered ORDER BY received_on DESC, created_at DESC, id DESC LIMIT ${limit} OFFSET ${offset}) f),
      '[]'::jsonb) AS items`,
    parameters,
  );
  return toPage(result?.items ?? [], result?.total ?? 0, query);
}

export async function purchaseHistorySummary(
  source: Pick<DataSource, 'query'>,
  businessId: string,
  filters: PurchaseHistoryFilterDto,
): Promise<PurchaseHistorySummary> {
  const { parameters, sql } = base(filters);
  parameters[0] = businessId;
  const [row] = await source.query<
    {
      all_count: number;
      paid: number;
      debt: number;
      voided: number;
      unsettled: number;
      total: string;
      paid_cents: string;
      balance: string;
    }[]
  >(
    `${sql}
    SELECT COUNT(*)::int AS all_count,
      COUNT(*) FILTER (WHERE payment_state = 'paid')::int AS paid,
      COUNT(*) FILTER (WHERE payment_state = 'debt')::int AS debt,
      COUNT(*) FILTER (WHERE payment_state = 'voided')::int AS voided,
      COUNT(*) FILTER (WHERE payment_state = 'unsettled')::int AS unsettled,
      COALESCE(SUM(liquid_amount_cents) FILTER (WHERE payment_state IN ('paid', 'debt')), 0)::text AS total,
      COALESCE(SUM(liquid_amount_cents - balance_cents) FILTER (WHERE payment_state IN ('paid', 'debt')), 0)::text AS paid_cents,
      COALESCE(SUM(balance_cents), 0)::text AS balance
    FROM history`,
    parameters,
  );
  return {
    balanceCents: row?.balance ?? '0',
    counts: {
      all: row?.all_count ?? 0,
      debt: row?.debt ?? 0,
      paid: row?.paid ?? 0,
      unsettled: row?.unsettled ?? 0,
      voided: row?.voided ?? 0,
    },
    paidCents: row?.paid_cents ?? '0',
    totalCents: row?.total ?? '0',
  };
}
