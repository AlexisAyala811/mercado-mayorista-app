import type { AnalyticsObservation } from './analytics-calculation.js';
import { aggregateAnalytics } from './analytics-calculation.js';

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function predictionWindow(asOf: string) {
  const weekday = new Date(`${asOf}T00:00:00Z`).getUTCDay();
  const currentMonday = addDays(asOf, -(weekday === 0 ? 6 : weekday - 1));
  return {
    from: addDays(currentMonday, -26 * 7),
    to: addDays(currentMonday, -1),
    weeksRequired: 26,
    minimumSalesPerWeek: 5,
  };
}

export function assessPredictionHistory(
  rows: AnalyticsObservation[],
  asOf: string,
  varietyId: string,
) {
  const window = predictionWindow(asOf);
  const input = rows.filter(
    (row) =>
      row.operationType === 'sale' &&
      row.varietyId === varietyId &&
      row.weekStart >= window.from &&
      row.weekStart <= window.to,
  );
  const dataset = aggregateAnalytics(input, window.from, window.to, asOf);
  const byWeek = new Map(
    dataset.points.map((point) => [point.weekStart, point]),
  );
  const weeks = Array.from({ length: 26 }, (_, index) => {
    const weekStart = addDays(window.from, index * 7);
    const point = byWeek.get(weekStart);
    const validSaleCount = point?.operationCount ?? 0;
    return {
      weekStart,
      weekEnd: addDays(weekStart, 6),
      validSaleCount,
      sufficient: validSaleCount >= 5,
      weightKg: point?.weightKg ?? null,
      priceSolesPerKg: point?.priceSolesPerKg ?? null,
      operationIds: point?.operationIds ?? [],
      compensationIds: point?.compensationIds ?? [],
    };
  });
  const sufficientWeeks = weeks.filter((week) => week.sufficient).length;
  const dataSufficient = sufficientWeeks === 26;
  return {
    asOf,
    varietyId,
    window,
    weeks,
    sufficientWeeks,
    dataSufficient,
    stage: dataSufficient
      ? ('ready_for_evaluation' as const)
      : ('insufficient_history' as const),
    predictionAvailable: false as const,
    excluded: dataset.excluded,
    criteria: [
      {
        id: 'history',
        status: dataSufficient ? ('met' as const) : ('unmet' as const),
        message: `${sufficientWeeks} de 26 semanas tienen al menos cinco ventas válidas y peso positivo.`,
      },
      {
        id: 'quality',
        status: dataset.points.length ? ('met' as const) : ('pending' as const),
        message: `Solo se incluyeron fechas, cantidades, pesos e importes válidos. ${dataset.excluded.length} registros excluidos; no se imputaron datos.`,
      },
      {
        id: 'scope',
        status: 'met' as const,
        message:
          'Serie limitada a este negocio y variedad. No acredita estacionalidad anual ni se extrapola a otra calidad, procedencia o temporada.',
      },
      {
        id: 'evaluation',
        status: 'pending' as const,
        message:
          'Pendiente evaluar ocho semanas sin información futura y comparar MAE con la referencia.',
      },
      {
        id: 'coverage',
        status: 'pending' as const,
        message:
          'Pendiente comprobar que al menos siete de ocho valores reales quedan dentro del rango.',
      },
      {
        id: 'review',
        status: 'pending' as const,
        message:
          'La evidencia debe ser revisada por el Mayorista antes de publicar una estimación.',
      },
    ],
  };
}
