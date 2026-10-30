import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { operationOverview, type OperationOverviewQuery } from './operation-overview.js';
import { loadReportExport, type ReportKind } from './report-export-data.js';
import { renderReportExport } from './report-export.js';

import type {
  PriceHistoryQueryDto,
  ReportAlertsQueryDto,
  ReportAsOfDto,
  ReportPeriodDto,
  ReportRowsQueryDto,
} from './http/report-query.dto.js';

type AmountRow = { amount: string; count: string };

@Injectable()
export class ReportsService {
  constructor(private readonly dataSource: DataSource) {}

  async reportRows(businessId: string, query: ReportRowsQueryDto) {
    const data = await loadReportExport(this.dataSource, businessId, query, query.report, query);
    return { report: query.report, operation: query.operation, period: data.overview.period,
      generatedAt: data.overview.generatedAt, limit: query.limit, offset: query.offset,
      total: data.total, items: query.report === 'detail' ? data.rows : data.varieties };
  }

  async exportReport(businessId: string, businessName: string, query: OperationOverviewQuery & { report: ReportKind }) {
    const data = await loadReportExport(this.dataSource, businessId, query, query.report);
    return renderReportExport(data, businessName, query.report);
  }

  operationOverview(businessId: string, query: OperationOverviewQuery) {
    return operationOverview(this.dataSource, businessId, query);
  }

  async commercialSummary(businessId: string, period: ReportPeriodDto) {
    validatePeriod(period);
    const parameters = [businessId, period.from, period.to];
    const [purchases, sales, payables, receivables, cash, costs] =
      await Promise.all([
        this.one<AmountRow>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(liquid_amount_cents), 0)::text AS amount
         FROM purchase_settlements WHERE business_id = $1 AND state = 'confirmed' AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`,
          parameters,
        ),
        this.one<AmountRow>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(total_amount_cents), 0)::text AS amount
         FROM sales WHERE business_id = $1 AND state = 'confirmed' AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`,
          parameters,
        ),
        this.one<{ balance: string }>(
          `SELECT COALESCE(SUM(balance_cents), 0)::text AS balance
         FROM accounts WHERE business_id = $1 AND kind = 'payable' AND state = 'open'`,
          [businessId],
        ),
        this.one<{ balance: string }>(
          `SELECT COALESCE(SUM(balance_cents), 0)::text AS balance
         FROM accounts WHERE business_id = $1 AND kind = 'receivable' AND state = 'open'`,
          [businessId],
        ),
        this.one<{ incoming: string; outgoing: string }>(
          `SELECT COALESCE(SUM(amount_cents) FILTER (WHERE direction = 'in'), 0)::text AS incoming,
                COALESCE(SUM(amount_cents) FILTER (WHERE direction = 'out'), 0)::text AS outgoing
         FROM cash_movements WHERE business_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')`,
          parameters,
        ),
        this.one<{
          purchaseFreight: string;
          saleFreight: string;
          stowage: string;
        }>(
          `SELECT
           COALESCE((SELECT SUM(freight_amount_cents) FROM purchase_settlements
                     WHERE business_id = $1 AND state = 'confirmed' AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')), 0)::text AS "purchaseFreight",
           COALESCE((SELECT SUM(freight_amount_cents) FROM sales
                     WHERE business_id = $1 AND state = 'confirmed' AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')), 0)::text AS "saleFreight",
           COALESCE((SELECT SUM(total_amount_cents) FROM stowage_settlements
                     WHERE business_id = $1 AND created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')), 0)::text AS stowage`,
          parameters,
        ),
      ]);
    return {
      generatedAt: new Date(),
      period,
      purchases: {
        count: Number(purchases.count),
        liquidAmountCents: purchases.amount,
      },
      sales: { count: Number(sales.count), totalAmountCents: sales.amount },
      accounts: {
        payableBalanceCents: payables.balance,
        receivableBalanceCents: receivables.balance,
      },
      cash: {
        incomingCents: cash.incoming,
        netCents: (BigInt(cash.incoming) - BigInt(cash.outgoing)).toString(),
        outgoingCents: cash.outgoing,
      },
      costs: {
        purchaseFreightCents: costs.purchaseFreight,
        saleFreightCents: costs.saleFreight,
        stowageCents: costs.stowage,
      },
    };
  }

  async commercialMargin(businessId: string, period: ReportPeriodDto) {
    validatePeriod(period);
    const from = `${period.from}T00:00:00.000Z`;
    const toExclusive = new Date(`${period.to}T00:00:00.000Z`);
    toExclusive.setUTCDate(toExclusive.getUTCDate() + 1);
    const parameters = [businessId, from, toExclusive.toISOString()];
    const [sales, returns, freightCosts, stowageCosts, purchaseFreight] =
      await Promise.all([
        this.one<{
          cost: string;
          freightCharged: string;
          merchandiseRevenue: string;
        }>(
          `SELECT
             COALESCE(SUM(s.gross_amount_cents - s.discounts_cents), 0)::text AS "merchandiseRevenue",
             COALESCE(SUM(CASE WHEN s.freight_included_in_total THEN s.freight_amount_cents ELSE 0 END), 0)::text AS "freightCharged",
             COALESCE(SUM(costs.net_cost_cents), 0)::text AS cost
           FROM sales s
           LEFT JOIN (
             SELECT sale_id, SUM(net_cost_cents) AS net_cost_cents
             FROM sale_line_costs WHERE is_determinable GROUP BY sale_id
           ) costs ON costs.sale_id = s.id
           WHERE s.business_id = $1 AND s.state = 'confirmed' AND s.created_at >= $2 AND s.created_at < $3`,
          parameters,
        ),
        this.one<{
          costReduction: string;
          freightAdjustment: string;
          merchandiseReduction: string;
        }>(
          `SELECT
             COALESCE(SUM(sr.net_merchandise_refund_cents), 0)::text AS "merchandiseReduction",
             COALESCE(SUM(sr.freight_adjustment_cents), 0)::text AS "freightAdjustment",
             COALESCE(SUM(costs.net_cost_reduction_cents), 0)::text AS "costReduction"
           FROM sale_returns sr
           LEFT JOIN (
             SELECT sale_return_id, SUM(net_cost_reduction_cents) AS net_cost_reduction_cents
             FROM sale_return_lines WHERE net_cost_reduction_cents IS NOT NULL GROUP BY sale_return_id
           ) costs ON costs.sale_return_id = sr.id
           WHERE sr.business_id = $1 AND sr.created_at >= $2 AND sr.created_at < $3`,
          parameters,
        ),
        this.one<{ amount: string }>(
          `SELECT COALESCE(SUM(fe.amount_cents), 0)::text AS amount
           FROM freight_entries fe JOIN freight_settlements fs ON fs.id = fe.settlement_id
           WHERE fe.business_id = $1 AND fe.operation_type = 'sale' AND fe.state = 'settled'
             AND fs.settled_on >= $2::date AND fs.settled_on < $3::date`,
          parameters,
        ),
        this.one<{ amount: string }>(
          `SELECT COALESCE(SUM(se.amount_cents), 0)::text AS amount
           FROM stowage_entries se JOIN stowage_settlements ss ON ss.id = se.settlement_id
           WHERE se.business_id = $1 AND se.state = 'settled'
             AND ((se.operation_type = 'purchase' AND se.activity = 'unload') OR
                  (se.operation_type = 'sale' AND se.activity = 'load'))
             AND ss.settled_on >= $2::date AND ss.settled_on < $3::date`,
          parameters,
        ),
        this.one<{ amount: string }>(
          `SELECT COALESCE(SUM(freight_amount_cents), 0)::text AS amount
           FROM purchase_settlements
           WHERE business_id = $1 AND state = 'confirmed' AND created_at >= $2 AND created_at < $3`,
          parameters,
        ),
      ]);
    const [undeterminedSales, undeterminedReturns] = await Promise.all([
      this.dataSource.query(
        `SELECT DISTINCT s.id AS "operationId", 'sale' AS "operationType"
         FROM sales s JOIN sale_lines sl ON sl.sale_id = s.id
         LEFT JOIN sale_line_costs slc ON slc.sale_line_id = sl.id
         WHERE s.business_id = $1 AND s.state = 'confirmed' AND s.created_at >= $2 AND s.created_at < $3
           AND (slc.id IS NULL OR NOT slc.is_determinable)
         ORDER BY s.id`,
        parameters,
      ),
      this.dataSource.query(
        `SELECT DISTINCT sr.id AS "operationId", 'commercial-return' AS "operationType"
         FROM sale_returns sr JOIN sale_return_lines srl ON srl.sale_return_id = sr.id
         WHERE sr.business_id = $1 AND sr.created_at >= $2 AND sr.created_at < $3
           AND srl.net_cost_reduction_cents IS NULL
         ORDER BY sr.id`,
        parameters,
      ),
    ]);
    const merchandiseRevenue =
      BigInt(sales.merchandiseRevenue) - BigInt(returns.merchandiseReduction);
    const costOfGoodsSold = BigInt(sales.cost) - BigInt(returns.costReduction);
    const saleFreightCost = BigInt(freightCosts.amount);
    const stowageCost = BigInt(stowageCosts.amount);
    return {
      cutoffDate: period.to,
      generatedAt: new Date(),
      period,
      components: {
        costOfGoodsSoldCents: costOfGoodsSold.toString(),
        grossMerchandiseRevenueCents: sales.merchandiseRevenue,
        merchandiseReturnReductionCents: returns.merchandiseReduction,
        netMerchandiseRevenueCents: merchandiseRevenue.toString(),
        purchaseFreightShownSeparatelyCents: purchaseFreight.amount,
        saleFreightChargedCents: (
          BigInt(sales.freightCharged) - BigInt(returns.freightAdjustment)
        ).toString(),
        settledSaleFreightCostCents: saleFreightCost.toString(),
        settledStowageCostCents: stowageCost.toString(),
      },
      estimatedCommercialMarginCents: (
        merchandiseRevenue -
        costOfGoodsSold -
        saleFreightCost -
        stowageCost
      ).toString(),
      indicatorName: 'margen comercial estimado',
      undeterminedCostOperations: [
        ...(undeterminedSales as unknown[]),
        ...(undeterminedReturns as unknown[]),
      ],
    };
  }

  async overdueAccounts(businessId: string, query: ReportAsOfDto) {
    return this.dataSource.query(
      `SELECT a.id AS "accountId", a.kind, a.counterparty_type AS "counterpartyType",
              a.counterparty_id AS "counterpartyId", i.id AS "installmentId", i.due_on AS "dueOn",
              i.balance_cents::text AS "balanceCents"
       FROM account_installments i
       JOIN accounts a ON a.id = i.account_id
       WHERE a.business_id = $1 AND a.state = 'open' AND i.state = 'open' AND i.due_on < $2
       ORDER BY i.due_on ASC`,
      [businessId, query.asOf],
    );
  }

  async alerts(businessId: string, query: ReportAlertsQueryDto) {
    if (query.asOf > query.through)
      throw new UnprocessableEntityException(
        'La fecha límite de alertas debe ser igual o posterior a la fecha de corte.',
      );
    const accounts = await this.dataSource.query(
      `SELECT a.id AS "accountId", a.kind, a.counterparty_type AS "counterpartyType",
                a.counterparty_id AS "counterpartyId", i.id AS "installmentId", i.due_on AS "dueOn",
                i.balance_cents::text AS "balanceCents",
                CASE WHEN i.due_on < $3 THEN 'overdue' ELSE 'due_soon' END AS status
         FROM account_installments i JOIN accounts a ON a.id = i.account_id
         WHERE a.business_id = $1 AND a.state = 'open' AND i.state = 'open' AND i.due_on <= $2
         ORDER BY i.due_on ASC`,
      [businessId, query.through, query.asOf],
    );
    return {
      accountAlerts: accounts,
      filters: query,
      generatedAt: new Date(),
    };
  }

  async priceHistory(businessId: string, query: PriceHistoryQueryDto) {
    validatePeriod(query);
    const rows = await this.dataSource.query(
      `SELECT DISTINCT 'purchase' AS "operationType", ps.id AS "operationId", ps.created_at AS "occurredAt",
              rs.variety_id AS "varietyId", v.name AS "varietyName", r.provider_id AS "counterpartyId",
              p.name AS "counterpartyName", ps.price_basis AS "priceBasis",
              ps.unit_price_cents::text AS "unitPriceCents", NULL::uuid AS "sourceLineId",
              rs.quality_id AS "qualityId", rs.quality_name AS "qualityName", rs.origin_id AS "originId", rs.origin_name AS "originName"
       FROM purchase_settlements ps
       JOIN receptions r ON r.id = ps.reception_id AND r.business_id = ps.business_id
       JOIN reception_sacks rs ON rs.reception_id = r.id AND rs.business_id = ps.business_id AND rs.voided_at IS NULL
       JOIN potato_varieties v ON v.id = rs.variety_id AND v.business_id = ps.business_id
       JOIN providers p ON p.id = r.provider_id AND p.business_id = ps.business_id
       WHERE ps.business_id = $1 AND ps.state = 'confirmed' AND ps.created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND ps.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
         AND ($4::uuid IS NULL OR rs.variety_id = $4) AND ($5::uuid IS NULL OR r.provider_id = $5)
         AND ($7::text IS NULL OR CASE WHEN $7 = 'unreported' THEN rs.quality_id IS NULL ELSE rs.quality_id = NULLIF($7,'unreported')::uuid END)
         AND ($8::text IS NULL OR CASE WHEN $8 = 'unreported' THEN rs.origin_id IS NULL ELSE rs.origin_id = NULLIF($8,'unreported')::uuid END)
       UNION ALL
       SELECT 'sale', s.id, s.created_at, sl.variety_id, v.name, s.buyer_id, b.name,
              sl.price_basis, sl.unit_price_cents::text, sl.id,
              sl.quality_id, sl.quality_name, sl.origin_id, sl.origin_name
       FROM sales s
       JOIN sale_lines sl ON sl.sale_id = s.id
       JOIN potato_varieties v ON v.id = sl.variety_id AND v.business_id = s.business_id
       JOIN buyers b ON b.id = s.buyer_id AND b.business_id = s.business_id
       WHERE s.business_id = $1 AND s.state = 'confirmed' AND s.created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima') AND s.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
         AND ($4::uuid IS NULL OR sl.variety_id = $4) AND ($6::uuid IS NULL OR s.buyer_id = $6)
         AND ($7::text IS NULL OR CASE WHEN $7 = 'unreported' THEN sl.quality_id IS NULL ELSE sl.quality_id = NULLIF($7,'unreported')::uuid END)
         AND ($8::text IS NULL OR CASE WHEN $8 = 'unreported' THEN sl.origin_id IS NULL ELSE sl.origin_id = NULLIF($8,'unreported')::uuid END)
       ORDER BY "occurredAt" DESC, "operationId", "varietyId", "qualityId", "qualityName", "originId", "originName", "sourceLineId"`,
      [
        businessId,
        query.from,
        query.to,
        query.varietyId ?? null,
        query.providerId ?? null,
        query.buyerId ?? null,
        query.qualityId ?? null,
        query.originId ?? null,
      ],
    );
    return { filters: query, generatedAt: new Date(), items: rows };
  }

  private async one<T>(sql: string, parameters: unknown[]): Promise<T> {
    const rows = (await this.dataSource.query(sql, parameters)) as T[];
    return rows[0]!;
  }
}

function validatePeriod(period: ReportPeriodDto) {
  if (period.from > period.to)
    throw new UnprocessableEntityException(
      'La fecha inicial debe ser anterior a la fecha final.',
    );
}
