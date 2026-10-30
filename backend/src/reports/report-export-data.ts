import type { DataSource } from 'typeorm';
import { operationOverview, type OperationOverviewQuery } from './operation-overview.js';
import { readReportRows, type ReportPageRequest } from './report-page.js';

export type ReportKind = 'summary' | 'detail' | 'counterparty' | 'variety';
export interface OperationReportRow {
  id: string; date: string; counterpartyId: string; counterparty: string;
  gross: string; freight: string; discounts: string; advances: string;
  amount: string; balance: string; sacks: string; weight: string;
}
export interface VarietyReportRow {
  id: string; name: string; operations: string; sacks: string; weight: string; subtotal: string | null;
}

export async function loadReportExport(source: DataSource, businessId: string, period: OperationOverviewQuery, kind: ReportKind, page?: ReportPageRequest) {
  return source.transaction('REPEATABLE READ', async (manager) => {
    await manager.query('SET TRANSACTION READ ONLY');
    const overview = await operationOverview(manager, businessId, period);
    const purchase = period.operation === 'purchase';
    const parameters = [businessId, period.from, period.to];
    const selected = purchase ? `
      SELECT p.*, r.provider_id AS counterparty_id FROM purchase_settlements p
      JOIN receptions r ON r.id=p.reception_id AND r.business_id=p.business_id
      WHERE p.business_id=$1 AND p.state='confirmed'` : `
      SELECT p.*, p.buyer_id AS counterparty_id FROM sales p WHERE p.business_id=$1 AND p.state='confirmed'`;
    const periodSql = ` AND p.created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima')
      AND p.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`;
    let rows: OperationReportRow[] = [];
    let varieties: VarietyReportRow[] = [];
    let total = '0';
    if (kind === 'detail' || kind === 'counterparty') {
      const quantities = purchase
        ? `SELECT o.id, COUNT(s.id)::text AS sacks, COALESCE(SUM(s.net_weight_kg),0)::text AS weight
           FROM selected o LEFT JOIN reception_sacks s ON s.reception_id=o.reception_id AND s.business_id=$1 AND s.voided_at IS NULL GROUP BY o.id`
        : `SELECT o.id, COALESCE(SUM(l.sacks),0)::text AS sacks, COALESCE(SUM(l.weight_kg),0)::text AS weight
           FROM selected o LEFT JOIN sale_lines l ON l.sale_id=o.id GROUP BY o.id`;
      const result = await readReportRows<OperationReportRow>(manager, `
        WITH selected AS (${selected}${periodSql}), quantities AS (${quantities}), balances AS (
          SELECT a.source_id, SUM(a.balance_cents)::text AS amount FROM accounts a JOIN selected o ON o.id=a.source_id
          WHERE a.business_id=$1 AND a.state='open' AND a.kind='${purchase ? 'payable' : 'receivable'}'
            AND a.source_type='${purchase ? 'purchase-settlement' : 'sale'}' GROUP BY a.source_id
        ) SELECT o.id, to_char(o.created_at AT TIME ZONE 'America/Lima','YYYY-MM-DD HH24:MI:SS') AS date,
          o.counterparty_id AS "counterpartyId", c.name AS counterparty,
          o.gross_amount_cents::text AS gross, o.freight_amount_cents::text AS freight,
          o.discounts_cents::text AS discounts, ${purchase ? 'o.advances_cents::text' : "'0'::text"} AS advances,
          o.${purchase ? 'liquid_amount_cents' : 'total_amount_cents'}::text AS amount,
          COALESCE(b.amount,'0') AS balance, q.sacks, q.weight
        FROM selected o JOIN ${purchase ? 'providers' : 'buyers'} c ON c.id=o.counterparty_id AND c.business_id=$1
        JOIN quantities q ON q.id=o.id LEFT JOIN balances b ON b.source_id=o.id
        ORDER BY date, o.id`, parameters, 'date, id', page);
      rows = result.items; total = result.total;
    }
    if (kind === 'variety') {
      const lines = purchase
        ? `SELECT o.id AS operation_id, s.variety_id, 1 AS sacks, s.net_weight_kg AS weight, NULL::bigint AS subtotal
           FROM selected o JOIN reception_sacks s ON s.reception_id=o.reception_id AND s.business_id=$1 AND s.voided_at IS NULL`
        : `SELECT o.id AS operation_id, l.variety_id, l.sacks, l.weight_kg AS weight, l.subtotal_cents AS subtotal
           FROM selected o JOIN sale_lines l ON l.sale_id=o.id`;
      const result = await readReportRows<VarietyReportRow>(manager, `
        WITH selected AS (${selected}${periodSql}), lines AS (${lines})
        SELECT v.id, v.name, COUNT(DISTINCT l.operation_id)::text AS operations,
          SUM(l.sacks)::text AS sacks, SUM(l.weight)::text AS weight, SUM(l.subtotal)::text AS subtotal
        FROM lines l JOIN potato_varieties v ON v.id=l.variety_id AND v.business_id=$1
        GROUP BY v.id,v.name ORDER BY v.name,v.id`, parameters, 'name, id', page);
      varieties = result.items; total = result.total;
    }
    return { overview, rows, varieties, total };
  });
}

export type ReportExportData = Awaited<ReturnType<typeof loadReportExport>>;
