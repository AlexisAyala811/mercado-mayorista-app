import { PredictionInputError } from './prediction-input-error.js';
import { aggregateAnalytics, type AnalyticsObservation } from './analytics-calculation.js';
import { predictionWindow } from './prediction-readiness.js';
import type { EvaluationFold, PriceWeek } from './predictive-engine.js';

type HistoricalQuery = (sql: string, parameters: unknown[]) => Promise<AnalyticsObservation[]>;
const day = 86400000;
function shift(value: string, days: number) { return new Date(Date.parse(`${value}T00:00:00Z`) + days * day).toISOString().slice(0, 10); }
function validDate(value: string) {
  const time = Date.parse(`${value}T00:00:00Z`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

/** Use a transaction-scoped query for all snapshots of one evaluation. */
export async function loadHistoricalPriceSnapshot(query: HistoricalQuery, businessId: string, varietyId: string, from: string, to: string, cutoffExclusive: string) {
  return loadPriceSnapshot(query,businessId,varietyId,from,to,cutoffExclusive,false);
}
export async function loadCurrentPredictionSnapshot(query: HistoricalQuery, businessId: string, varietyId: string, takenAt: string) {
  if (!Number.isFinite(Date.parse(takenAt)) || new Date(takenAt).toISOString() !== takenAt) throw new PredictionInputError('Instante de revisión inválido.');
  const asOf=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date(takenAt));
  const window=predictionWindow(asOf);
  return loadPriceSnapshot(query,businessId,varietyId,window.from,window.to,takenAt,true);
}
export async function loadPublicationWeekSnapshot(query:HistoricalQuery,businessId:string,varietyId:string,from:string,to:string,takenAt:string){
  if(!Number.isFinite(Date.parse(takenAt))||new Date(takenAt).toISOString()!==takenAt)throw new PredictionInputError('Instante de comparación inválido.');
  return loadPriceSnapshot(query,businessId,varietyId,from,to,takenAt,true);
}
async function loadPriceSnapshot(query: HistoricalQuery, businessId: string, varietyId: string, from: string, to: string, cutoffExclusive: string, current: boolean) {
  const asOf=current?new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date(cutoffExclusive)):cutoffExclusive;
  if (![from, to].every(validDate) || (!current && (!validDate(cutoffExclusive) || new Date(`${cutoffExclusive}T00:00:00Z`).getUTCDay() !== 1)) || from > to || to >= asOf ||
    new Date(`${from}T00:00:00Z`).getUTCDay() !== 1 || new Date(`${to}T00:00:00Z`).getUTCDay() !== 0 ||
    Date.parse(to) - Date.parse(from) > 181 * day)
    throw new PredictionInputError('Instantánea inválida: requiere semanas completas y corte exclusivo posterior.');
  const exclusive=current?'$5::timestamptz':"($5::date::timestamp AT TIME ZONE 'America/Lima')";
  const rows = await query(`
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
        SUM(rl.authorized_gross_cents) AS amount, ARRAY_AGG(DISTINCT sr.id::text ORDER BY sr.id::text) AS ids
      FROM sale_return_lines rl JOIN sale_returns sr ON sr.id = rl.sale_return_id
      WHERE rl.sale_line_id = sl.id AND sr.sale_id = s.id AND sr.business_id = $1
        AND sr.created_at < ${exclusive}
    ) r ON true
    WHERE s.business_id = $1 AND sl.variety_id = $2
      AND s.created_at >= ($3::date::timestamp AT TIME ZONE 'America/Lima')
      AND s.created_at < (($4::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')
      AND s.created_at < ${exclusive}
      AND (s.state = 'confirmed' OR (s.state = 'voided' AND s.voided_at >= ${exclusive}))
    ORDER BY "weekStart", s.id, sl.id`, [businessId, varietyId, from, to, cutoffExclusive]);
  return { businessId, varietyId, from, to, cutoffExclusive, timeZone: 'America/Lima' as const,
    observations: rows, ...aggregateAnalytics(rows, from, to, asOf) };
}

export async function loadHistoricalEvaluationInputs(query: HistoricalQuery, businessId: string, varietyId: string, asOf: string) {
  if (!validDate(asOf)) throw new PredictionInputError('Fecha de evaluación inválida.');
  const window = predictionWindow(asOf);
  const snapshots = [];
  const folds: EvaluationFold[] = [];
  for (let index = 18; index < 26; index += 1) {
    const target = shift(window.from, index * 7);
    const training = await loadHistoricalPriceSnapshot(query, businessId, varietyId, window.from, shift(target, -1), target);
    const actual = await loadHistoricalPriceSnapshot(query, businessId, varietyId, target, shift(target, 6), shift(target, 7));
    snapshots.push({ training, actual });
    const actualPoint = actual.points[0];
    if (!actualPoint || actual.points.length !== 1) throw new PredictionInputError(`No hay valor real válido para ${target}.`);
    const asWeek = (point: typeof actualPoint): PriceWeek => ({ weekStart: point.weekStart, priceSolesPerKg: point.priceSolesPerKg,
      validSaleCount: point.operationCount, weightKg: point.weightKg });
    folds.push({ training: training.points.map(asWeek), actual: asWeek(actualPoint) });
  }
  const final = await loadHistoricalPriceSnapshot(query, businessId, varietyId, window.from, window.to, shift(window.to, 1));
  return { asOf, window, snapshots, folds, final };
}
