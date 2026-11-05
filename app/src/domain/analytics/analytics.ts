export type AnalyticsFilterOption = { id: string; name: string; isActive: boolean };
export type PublicationOutcome={publicationId:string;takenAt:string;timeZone:string;state:'week_in_progress'|'no_valid_operations'|'compared';actualSolesPerKg:string|null;absoluteErrorSolesPerKg:string|null;covered:boolean|null;operationCount?:number;weightKg?:string;operationIds:string[];compensationIds:string[];excluded:AnalyticsSeries['excluded']};
export type PublicationPreview={evaluationId:string;varietyId:string;inputsHash:string;takenAt:string;timeZone:string;weekStart:string;weekEnd:string;algorithmVersion:string;variables:string[];targetCoveragePercent:number;maeSolesPerKg:string;baselineMaeSolesPerKg:string;coveredWeeks:number;observedCoveragePercent:number;reviewRequired:true;publicationAvailable:false};
export type PredictionPublication={id:string;evaluationId:string;varietyId:string;reviewedByUserId:string;reviewedAt:string;createdAt:string;retainUntil:string;forecast:Omit<PublicationPreview,'reviewRequired'|'publicationAvailable'>&{reviewRequired:false;publicationAvailable:true;priceSolesPerKg:string;lowerSolesPerKg:string;upperSolesPerKg:string;widthSolesPerKg:string;calibrationCount:number}};
export type AnalyticsEvaluation = {
  id: string; varietyId: string; asOf: string; algorithmVersion: string; inputsHash: string; createdAt: string; retainUntil: string;
  window: { from: string; to: string; weeksRequired: number; minimumSalesPerWeek: number };
  maeSolesPerKg: string; baselineMaeSolesPerKg: string; coveredWeeks: number; observedCoveragePercent: number;
  improvementMet: boolean; coverageMet: boolean; reviewRequired: true; publicationAvailable: false;
  comparisons: { weekStart: string; trainingThrough: string; actualSolesPerKg: string; priceSolesPerKg: string;
    baselineSolesPerKg: string; lowerSolesPerKg: string; upperSolesPerKg: string; absoluteErrorSolesPerKg: string; covered: boolean }[];
};
export function analyticsFilterLabel(option: AnalyticsFilterOption) {
  return option.isActive ? option.name : `${option.name} (desactivado)`;
}

export type AnalyticsPoint = {
  operationType: 'purchase' | 'sale'; varietyId: string; varietyName: string;
  weekStart: string; weekEnd: string; complete: boolean; operationCount: number;
  sacks: number; weightKg: string; merchandiseCents: string; priceSolesPerKg: string;
  operationIds: string[]; compensationIds: string[];
};
export type AnalyticsSeries = {
  filters: { from: string; to: string; varietyId: string | null; providerId?: string | null; buyerId?: string | null; qualityId?: string | null; originId?: string | null };
  timeZone: string; generatedAt: string; priceDefinition: 'merchandise_before_discounts_and_freight';
  points: AnalyticsPoint[];
  excluded: { operationId: string; operationType: 'purchase' | 'sale'; varietyId: string; varietyName: string; weekStart: string; reason: string }[];
};

export type PredictionReadiness = {
  asOf: string; varietyId: string; varietyName: string; timeZone: string; generatedAt: string;
  window: { from: string; to: string; weeksRequired: number; minimumSalesPerWeek: number };
  weeks: { weekStart: string; weekEnd: string; validSaleCount: number; sufficient: boolean; weightKg: string | null; priceSolesPerKg: string | null; operationIds: string[]; compensationIds: string[] }[];
  sufficientWeeks: number; dataSufficient: boolean; predictionAvailable: boolean;
  availability: {state:'not_checked_historical'|'not_published'|'current'|'requires_reevaluation';publicationId:string|null;evaluationId:string|null;checkedAt:string;message:string};
  stage: 'ready_for_evaluation' | 'insufficient_history'; excluded: AnalyticsSeries['excluded'];
  criteria: { id: string; status: 'met' | 'unmet' | 'pending'; message: string }[];
};

export function priceChange(current: string, previous: string) {
  const next = BigInt(current.replace('.', '')); const before = BigInt(previous.replace('.', ''));
  if (before === 0n) return 'Sin comparación porcentual: precio anterior cero';
  const difference = next - before;
  const absolute = difference < 0n ? -difference : difference;
  const tenths = (absolute * 1000n * 2n + before) / (before * 2n);
  return `${difference > 0n ? '+' : difference < 0n ? '−' : ''}${tenths / 10n},${tenths % 10n} %`;
}

export function analyticsPointKey(point: Pick<AnalyticsPoint, 'operationType' | 'varietyId' | 'weekStart'>) {
  return `${point.operationType}:${point.varietyId}:${point.weekStart}`;
}

export function weeklyComparisons(points: readonly AnalyticsPoint[]) {
  const previous = new Map<string, AnalyticsPoint>();
  const comparisons = new Map<string, string>();
  for (const point of [...points].sort((a, b) => a.weekStart.localeCompare(b.weekStart))) {
    const series = `${point.operationType}:${point.varietyId}`;
    const before = previous.get(series);
    let message: string;
    if (!point.complete) {
      message = 'Sin variación semanal: la semana actual es parcial.';
    } else if (!before) {
      message = 'Primera semana disponible en el periodo; sin comparación semanal.';
    } else if (Date.parse(`${point.weekStart}T00:00:00Z`) - Date.parse(`${before.weekStart}T00:00:00Z`) !== 7 * 86400000) {
      message = 'Sin variación semanal: falta la semana anterior en el periodo consultado.';
    } else if (!before.complete) {
      message = 'Sin variación semanal: la semana anterior es parcial.';
    } else {
      message = `${priceChange(point.priceSolesPerKg, before.priceSolesPerKg)} respecto a la semana ${before.weekStart}`;
    }
    comparisons.set(analyticsPointKey(point), message);
    previous.set(series, point);
  }
  return comparisons;
}

export function analyticsExclusionReason(reason: string) {
  if (reason === 'invalid_week') return 'La fecha no permite identificar una semana comercial válida.';
  if (reason === 'no_remaining_quantity') return 'La operación no conserva cantidad comercial para esta variedad.';
  if (reason === 'invalid_quantity_or_amount') return 'El peso, la cantidad o el importe no permiten calcular un precio válido.';
  return 'Registro excluido por validación central; requiere revisión de su referencia.';
}
