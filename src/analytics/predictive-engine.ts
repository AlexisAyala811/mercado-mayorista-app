import { PredictionInputError } from './prediction-input-error.js';
/** Pure engine. Inputs must be historical snapshots; never pass the live series. */
export type PriceWeek = { weekStart: string; priceSolesPerKg: string; validSaleCount: number; weightKg: string };
export type EvaluationFold = { training: readonly PriceWeek[]; actual: PriceWeek };
export const predictionAlgorithm = 'weekly-mean-4-v1' as const;
const day = 86400000;
function date(value: string) {
  const time = Date.parse(`${value}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value || new Date(time).getUTCDay() !== 1)
    throw new PredictionInputError('La serie requiere lunes comerciales válidos.');
  return time;
}
function price(value: string) {
  if (!/^\d+\.\d{4}$/.test(value)) throw new PredictionInputError('El precio requiere cuatro decimales no negativos.');
  return BigInt(value.replace('.', ''));
}
function display(value: bigint) { return `${value / 10000n}.${String(value % 10000n).padStart(4, '0')}`; }
function absolute(value: bigint) { return value < 0n ? -value : value; }
function average(values: readonly bigint[]) {
  return roundedMean(values.reduce((sum, value) => sum + value, 0n), BigInt(values.length));
}
function roundedMean(total: bigint, count: bigint) { return (total * 2n + count) / (count * 2n); }
function validateWeeks(weeks: readonly PriceWeek[]) {
  if (weeks.length < 18) throw new PredictionInputError('El prefijo inicial requiere 18 semanas.');
  if (weeks.length > 26) throw new PredictionInputError('La versión requiere una ventana máxima de 26 semanas.');
  weeks.forEach((week, index) => {
    const current = date(week.weekStart);
    if (index && current - date(weeks[index - 1]!.weekStart) !== 7 * day) throw new PredictionInputError('Falta continuidad semanal.');
    if (!Number.isSafeInteger(week.validSaleCount) || week.validSaleCount < 5 || !/^\d+\.\d{3}$/.test(week.weightKg) || BigInt(week.weightKg.replace('.', '')) <= 0n)
      throw new PredictionInputError('La semana no cumple ventas válidas y peso positivo.');
    price(week.priceSolesPerKg);
  });
}
export function forecastFromSnapshot(training: readonly PriceWeek[]) {
  validateWeeks(training);
  const values = training.map(week => price(week.priceSolesPerKg));
  const predicted = average(values.slice(-4));
  const residuals = values.slice(4).map((value, index) => absolute(value - average(values.slice(index, index + 4))));
  residuals.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const radius = residuals[Math.ceil(residuals.length * 4 / 5) - 1]!;
  const lower = predicted > radius ? predicted - radius : 0n;
  const upper = predicted + radius;
  return { algorithmVersion: predictionAlgorithm, trainingThrough: training[training.length - 1]!.weekStart,
    forecastWeekStart: new Date(date(training[training.length - 1]!.weekStart) + 7 * day).toISOString().slice(0, 10),
    priceSolesPerKg: display(predicted), lowerSolesPerKg: display(lower), upperSolesPerKg: display(upper),
    widthSolesPerKg: display(upper - lower), calibrationCount: residuals.length, targetCoveragePercent: 80 as const };
}
export function evaluateHistoricalSnapshots(folds: readonly EvaluationFold[]) {
  if (folds.length !== 8) throw new PredictionInputError('La evaluación requiere ocho semanas.');
  let modelError = 0n; let baselineError = 0n; let covered = 0;
  const start = folds[0]!.training[0]?.weekStart;
  const comparisons = folds.map((fold, index) => {
    if (fold.training.length !== 18 + index || fold.training[0]?.weekStart !== start) throw new PredictionInputError('Los prefijos deben crecer desde la misma ventana.');
    validateWeeks([...fold.training, fold.actual]);
    if (index && date(fold.actual.weekStart) - date(folds[index - 1]!.actual.weekStart) !== 7 * day) throw new PredictionInputError('Los objetivos deben ser consecutivos.');
    const forecast = forecastFromSnapshot(fold.training);
    const real = price(fold.actual.priceSolesPerKg);
    const baseline = price(fold.training[fold.training.length - 1]!.priceSolesPerKg);
    const error = absolute(real - price(forecast.priceSolesPerKg));
    const referenceError = absolute(real - baseline);
    const inside = real >= price(forecast.lowerSolesPerKg) && real <= price(forecast.upperSolesPerKg);
    modelError += error; baselineError += referenceError; if (inside) covered += 1;
    return { ...forecast, weekStart: fold.actual.weekStart, actualSolesPerKg: display(real), baselineSolesPerKg: display(baseline),
      absoluteErrorSolesPerKg: display(error), baselineAbsoluteErrorSolesPerKg: display(referenceError), covered: inside };
  });
  return { algorithmVersion: predictionAlgorithm, comparisons, maeSolesPerKg: display(roundedMean(modelError, 8n)),
    baselineMaeSolesPerKg: display(roundedMean(baselineError, 8n)), coveredWeeks: covered,
    observedCoveragePercent: covered * 100 / 8, improvementMet: baselineError > 0n && modelError * 10n <= baselineError * 9n,
    coverageMet: covered >= 7, reviewRequired: true as const, publicationAvailable: false as const };
}
