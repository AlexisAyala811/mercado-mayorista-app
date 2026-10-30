import { publicationAvailability,type PublicationAvailability } from './publication-availability.js';
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { toPage, type PageQueryDto } from '../common/http/page-query.dto.js';
import {
  aggregateAnalytics,
  type AnalyticsObservation,
} from './analytics-calculation.js';
import type {
  AnalyticsReadinessQueryDto,
  AnalyticsSeriesQueryDto,
} from './analytics-query.dto.js';
import {
  assessPredictionHistory,
  predictionWindow,
} from './prediction-readiness.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  async filterOptions(businessId: string, kind: 'providers' | 'buyers' | 'varieties', page: PageQueryDto) {
    const table = { providers: 'providers', buyers: 'buyers', varieties: 'potato_varieties' }[kind];
    const [items, counts] = await Promise.all([
      this.dataSource.query<{ id: string; name: string; isActive: boolean }[]>(
        `SELECT id, name, is_active AS "isActive" FROM ${table} WHERE business_id = $1 ORDER BY name, id LIMIT $2 OFFSET $3`,
        [businessId, page.limit, page.offset],
      ),
      this.dataSource.query<{ total: number }[]>(`SELECT COUNT(*)::int AS total FROM ${table} WHERE business_id = $1`, [businessId]),
    ]);
    return toPage(items, counts[0]!.total, page);
  }

  async characteristicOptions(businessId: string, kind: 'quality' | 'origin', page: PageQueryDto) {
    const [items, counts] = await Promise.all([
      this.dataSource.query<{ id: string; name: string; isActive: boolean }[]>(
        `SELECT id, name, is_active AS "isActive" FROM commercial_characteristics
         WHERE business_id = $1 AND kind = $2 ORDER BY name, id LIMIT $3 OFFSET $4`,
        [businessId, kind, page.limit, page.offset],
      ),
      this.dataSource.query<{ total: number }[]>(
        'SELECT COUNT(*)::int AS total FROM commercial_characteristics WHERE business_id = $1 AND kind = $2',
        [businessId, kind],
      ),
    ]);
    return toPage(items, counts[0]!.total, page);
  }

  async readiness(businessId: string, query: AnalyticsReadinessQueryDto) {
    const today = commercialDate();
    if (query.asOf > today)
      throw new UnprocessableEntityException(
        'El corte no puede ser una fecha futura.',
      );
    return this.dataSource.transaction('REPEATABLE READ',async manager=>{
    const takenAt=new Date().toISOString();
    const varieties = await manager.query<
      { id: string; name: string }[]
    >(
      'SELECT id, name FROM potato_varieties WHERE business_id = $1 AND id = $2',
      [businessId, query.varietyId],
    );
    if (!varieties.length)
      throw new NotFoundException('Variedad no disponible.');
    const window = predictionWindow(query.asOf);
    const rows = await manager.query<AnalyticsObservation[]>(
      `
      SELECT 'sale' AS "operationType", s.id AS "operationId", sl.variety_id AS "varietyId", v.name AS "varietyName",
        date_trunc('week', s.created_at AT TIME ZONE 'America/Lima')::date::text AS "weekStart",
        sl.sacks - COALESCE(r.sacks, 0)::int AS sacks,
        (sl.weight_kg - COALESCE(r.weight, 0))::text AS "weightKg",
        (sl.subtotal_cents - COALESCE(r.amount, 0))::text AS "merchandiseCents",
        COALESCE(r.ids, ARRAY[]::text[]) AS "compensationIds"
      FROM sales s JOIN sale_lines sl ON sl.sale_id = s.id
      JOIN potato_varieties v ON v.id = sl.variety_id AND v.business_id = s.business_id
      LEFT JOIN LATERAL (
        SELECT SUM(rl.returned_sacks) AS sacks, SUM(rl.returned_weight_kg) AS weight,
          SUM(rl.authorized_gross_cents) AS amount, ARRAY_AGG(DISTINCT sr.id::text) AS ids
        FROM sale_return_lines rl JOIN sale_returns sr ON sr.id = rl.sale_return_id
        WHERE rl.sale_line_id = sl.id AND sr.sale_id = s.id AND sr.business_id = $1
          AND sr.created_at < (($4::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
      ) r ON true
      WHERE s.business_id = $1 AND sl.variety_id = $2
        AND s.created_at >= ($3::date::timestamp AT TIME ZONE 'America/Lima')
        AND s.created_at < (($5::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
        AND (s.state = 'confirmed' OR (s.state = 'voided' AND s.voided_at >= (($4::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')))
      ORDER BY "weekStart", s.id, sl.id`,
      [businessId, query.varietyId, window.from, query.asOf, window.to],
    );
    const history=assessPredictionHistory(rows,query.asOf,query.varietyId);
    const availability:PublicationAvailability=query.asOf===today
      ?await publicationAvailability(manager,businessId,query.varietyId,takenAt)
      :{state:'not_checked_historical',publicationId:null,evaluationId:null,checkedAt:takenAt,message:'Esta consulta reconstruye historial de un corte pasado. No verifica vigencia actual ni certifica publicaciones de aquella fecha.'};
    const current=availability.state==='current';
    return {
      timeZone: 'America/Lima',
      generatedAt: takenAt,
      varietyName: varieties[0]!.name,
      ...history,
      predictionAvailable:current,
      availability,
      criteria:history.criteria.map(criterion=>{
        if(!['evaluation','coverage','review'].includes(criterion.id))return criterion;
        if(current)return {...criterion,status:'met' as const,message:criterion.id==='evaluation'?'Evaluación de la publicación revalidada: mejora MAE mínima del 10 %.':criterion.id==='coverage'?'Evaluación de la publicación revalidada: cobertura de al menos siete de ocho semanas.':'La publicación fue revisada por el Mayorista y conserva vigencia actual.'};
        return {...criterion,status:'pending' as const,message:criterion.id==='evaluation'?'La consulta de historial no acredita una evaluación vigente; revisa las versiones conservadas.':criterion.id==='coverage'?'Sin cobertura vigente acreditada en esta consulta.':'No hay una publicación cuya vigencia se haya acreditado en esta consulta.'};
      }),
    };
    });
  }

  async series(businessId: string, period: AnalyticsSeriesQueryDto) {
    const days = (Date.parse(period.to) - Date.parse(period.from)) / 86400000;
    if (!Number.isFinite(days) || days < 0 || days > 365)
      throw new UnprocessableEntityException(
        'Selecciona un periodo ordenado de hasta 366 días.',
      );
    const rows = await this.dataSource.query<AnalyticsObservation[]>(
      `
      SELECT 'purchase' AS "operationType", ps.id AS "operationId", rs.variety_id AS "varietyId", v.name AS "varietyName",
        date_trunc('week', ps.created_at AT TIME ZONE 'America/Lima')::date::text AS "weekStart",
        rs.sacks, rs.weight::text AS "weightKg",
        (CASE WHEN ps.price_basis = 'kilogram' THEN ROUND(rs.weight * ps.unit_price_cents)
          ELSE rs.sacks * ps.unit_price_cents END)::text AS "merchandiseCents",
        ARRAY[]::text[] AS "compensationIds"
      FROM purchase_settlements ps
      JOIN receptions reception ON reception.id = ps.reception_id AND reception.business_id = ps.business_id
      JOIN LATERAL (
        SELECT variety_id, COUNT(*)::int AS sacks, SUM(net_weight_kg) AS weight
        FROM reception_sacks
        WHERE reception_id = ps.reception_id AND business_id = ps.business_id AND voided_at IS NULL
          AND ($7::text IS NULL OR CASE WHEN $7 = 'unreported' THEN quality_id IS NULL ELSE quality_id = NULLIF($7, 'unreported')::uuid END)
          AND ($8::text IS NULL OR CASE WHEN $8 = 'unreported' THEN origin_id IS NULL ELSE origin_id = NULLIF($8, 'unreported')::uuid END)
        GROUP BY variety_id
      ) rs ON true
      JOIN potato_varieties v ON v.id = rs.variety_id AND v.business_id = ps.business_id
      WHERE ps.business_id = $1 AND ps.state = 'confirmed'
        AND ps.created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima')
        AND ps.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
        AND ($4::uuid IS NULL OR rs.variety_id = $4)
        AND ($5::uuid IS NULL OR reception.provider_id = $5)
      UNION ALL
      SELECT 'sale', s.id, sl.variety_id, v.name,
        date_trunc('week', s.created_at AT TIME ZONE 'America/Lima')::date::text,
        sl.sacks - COALESCE(r.sacks, 0)::int,
        (sl.weight_kg - COALESCE(r.weight, 0))::text,
        (sl.subtotal_cents - COALESCE(r.amount, 0))::text,
        COALESCE(r.ids, ARRAY[]::text[])
      FROM sales s
      JOIN sale_lines sl ON sl.sale_id = s.id
      JOIN potato_varieties v ON v.id = sl.variety_id AND v.business_id = s.business_id
      LEFT JOIN LATERAL (
        SELECT SUM(rl.returned_sacks) AS sacks, SUM(rl.returned_weight_kg) AS weight,
          SUM(rl.authorized_gross_cents) AS amount, ARRAY_AGG(DISTINCT sr.id::text) AS ids
        FROM sale_return_lines rl JOIN sale_returns sr ON sr.id = rl.sale_return_id
        WHERE rl.sale_line_id = sl.id AND sr.sale_id = s.id AND sr.business_id = $1
          AND sr.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
      ) r ON true
      WHERE s.business_id = $1 AND s.state = 'confirmed'
        AND s.created_at >= ($2::date::timestamp AT TIME ZONE 'America/Lima')
        AND s.created_at < (($3::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
        AND ($4::uuid IS NULL OR sl.variety_id = $4)
        AND ($6::uuid IS NULL OR s.buyer_id = $6)
        AND ($7::text IS NULL OR CASE WHEN $7 = 'unreported' THEN sl.quality_id IS NULL ELSE sl.quality_id = NULLIF($7, 'unreported')::uuid END)
        AND ($8::text IS NULL OR CASE WHEN $8 = 'unreported' THEN sl.origin_id IS NULL ELSE sl.origin_id = NULLIF($8, 'unreported')::uuid END)
      ORDER BY "weekStart", "operationId", "varietyId"`,
      [businessId, period.from, period.to, period.varietyId ?? null,
        period.providerId ?? null, period.buyerId ?? null,
        period.qualityId?.toLowerCase() ?? null, period.originId?.toLowerCase() ?? null],
    );
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    return {
      filters: {
        from: period.from,
        to: period.to,
        varietyId: period.varietyId ?? null,
        providerId: period.providerId ?? null,
        buyerId: period.buyerId ?? null,
        qualityId: period.qualityId ?? null,
        originId: period.originId ?? null,
      },
      timeZone: 'America/Lima',
      generatedAt: new Date().toISOString(),
      priceDefinition: 'merchandise_before_discounts_and_freight',
      ...aggregateAnalytics(rows, period.from, period.to, today),
    };
  }
}

function commercialDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
