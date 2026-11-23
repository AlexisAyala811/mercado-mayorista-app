import type { StoredEvaluation } from './evaluation-store.js';
import type { loadCurrentPredictionSnapshot } from './historical-price-snapshots.js';
import { canonicalSha256 } from './evaluation-integrity.js';
import { predictionWindow } from './prediction-readiness.js';
import { evaluateHistoricalSnapshots,forecastFromSnapshot,predictionAlgorithm } from './predictive-engine.js';
import { PredictionInputError } from './prediction-input-error.js';
type Snapshot=Awaited<ReturnType<typeof loadCurrentPredictionSnapshot>>;
function facts(snapshot:Snapshot) {
  return snapshot.observations.map(row=>({operationId:row.operationId,varietyId:row.varietyId,weekStart:row.weekStart,sacks:row.sacks,
    weightKg:row.weightKg,merchandiseCents:row.merchandiseCents,compensationIds:row.compensationIds}));
}
export function preparePublicationCandidate(stored:StoredEvaluation,current:Snapshot,takenAt:string) {
  if (!Number.isFinite(Date.parse(takenAt)) || new Date(takenAt).toISOString()!==takenAt)throw new PredictionInputError('Instante de revisión inválido.');
  if (current.cutoffExclusive!==takenAt)throw new PredictionInputError('La revisión requiere una lectura del instante actual.');
  const inputs=stored.evidence.inputs;
  if (stored.algorithmVersion!==predictionAlgorithm || stored.evidence.evaluation.algorithmVersion!==predictionAlgorithm)throw new PredictionInputError('La versión del algoritmo requiere una evaluación nueva.');
  if (stored.inputsHash!==canonicalSha256(inputs))throw new PredictionInputError('La evidencia conservada no coincide con su huella.');
  if (current.businessId!==inputs.final.businessId || current.varietyId!==stored.varietyId || inputs.final.varietyId!==stored.varietyId)throw new PredictionInputError('La revisión no corresponde al negocio y variedad evaluados.');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Lima'}).format(new Date(takenAt));
  const window=predictionWindow(today);
  if (inputs.window.from!==window.from || inputs.window.to!==window.to || current.from!==window.from || current.to!==window.to)throw new PredictionInputError('La semana objetivo venció. Genera una evaluación nueva.');
  if (canonicalSha256(facts(current))!==canonicalSha256(facts(inputs.final)))throw new PredictionInputError('Las entradas comerciales cambiaron. Genera una evaluación nueva.');
  if (current.points.length!==26)throw new PredictionInputError('La revisión requiere 26 semanas completas.');
  const forecast=forecastFromSnapshot(current.points.map(point=>({weekStart:point.weekStart,priceSolesPerKg:point.priceSolesPerKg,validSaleCount:point.operationCount,weightKg:point.weightKg})));
  const evaluated=evaluateHistoricalSnapshots(inputs.folds);
  if (canonicalSha256(evaluated)!==canonicalSha256(stored.evidence.evaluation))throw new PredictionInputError('Los resultados conservados no son reproducibles.');
  if (!evaluated.improvementMet || !evaluated.coverageMet)throw new PredictionInputError('La evaluación no cumple mejora y cobertura aprobadas.');
  const weekEnd=new Date(Date.parse(`${forecast.forecastWeekStart}T00:00:00Z`)+6*86400000).toISOString().slice(0,10);
  return {evaluationId:stored.id,varietyId:stored.varietyId,inputsHash:stored.inputsHash,takenAt,timeZone:'America/Lima' as const,
    weekStart:forecast.forecastWeekStart,weekEnd,...forecast,
    variables:['precio semanal de venta por kg ponderado por peso','cuatro semanas previas','residuos históricos anteriores'] as const,
    maeSolesPerKg:evaluated.maeSolesPerKg,baselineMaeSolesPerKg:evaluated.baselineMaeSolesPerKg,
    observedCoveragePercent:evaluated.observedCoveragePercent,coveredWeeks:evaluated.coveredWeeks,
    reviewRequired:true as const,publicationAvailable:false as const};
}
