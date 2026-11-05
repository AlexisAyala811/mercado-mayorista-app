import type { AnalyticsEvaluation, AnalyticsFilterOption, AnalyticsSeries, PredictionReadiness,PublicationPreview,PredictionPublication,PublicationOutcome } from '@/domain/analytics/analytics';
import { apiRequest } from './api-client';
import { loadCollectionPages } from './collection-pages';
import type { Page } from '@/domain/reception/reception';
export const previewPredictionPublication=(token:string,id:string)=>apiRequest<PublicationPreview>(`/analytics/evaluations/${encodeURIComponent(id)}/publication-preview`,{token});
export const publishPrediction=(token:string,body:{evaluationId:string;clientOperationId:string;reviewed:true})=>apiRequest<PredictionPublication>('/analytics/publications',{token,method:'POST',body});
export type PublicationSummary=Omit<PredictionPublication,'forecast'>&{weekStart:string;weekEnd:string;algorithmVersion:string};
export const getPredictionPublication=(token:string,id:string)=>apiRequest<PredictionPublication>(`/analytics/publications/${encodeURIComponent(id)}`,{token});
export const getPublicationOutcome=(token:string,id:string)=>apiRequest<PublicationOutcome>(`/analytics/publications/${encodeURIComponent(id)}/outcome`,{token});
export function listPredictionPublications(token:string,varietyId:string,offset:number){const query=new URLSearchParams({varietyId,limit:'20',offset:String(offset)});return apiRequest<Page<PublicationSummary>>(`/analytics/publications?${query}`,{token});}
export type EvaluationSummary = Omit<AnalyticsEvaluation,'comparisons'|'window'|'maeSolesPerKg'|'baselineMaeSolesPerKg'|'coveredWeeks'|'observedCoveragePercent'|'improvementMet'|'coverageMet'|'reviewRequired'|'publicationAvailable'>;
export function listAnalyticsEvaluations(token: string, varietyId: string, offset: number) {
  const query = new URLSearchParams({varietyId,offset:String(offset),limit:'20'});
  return apiRequest<Page<EvaluationSummary>>(`/analytics/evaluations?${query}`, {token});
}
export function createAnalyticsEvaluation(token: string, body: { clientOperationId: string; varietyId: string; asOf: string }) {
  return apiRequest<AnalyticsEvaluation>('/analytics/evaluations', { token, method: 'POST', body });
}
export function getAnalyticsEvaluation(token: string, id: string) {
  return apiRequest<AnalyticsEvaluation>(`/analytics/evaluations/${encodeURIComponent(id)}`, { token });
}
export async function loadHistoricalCommercialFilters(token: string) {
  const [providers, buyers, varieties, qualities, origins] = await Promise.all([
    loadCollectionPages<AnalyticsFilterOption>('/analytics/filters/providers', token, 'El listado de proveedores históricos'),
    loadCollectionPages<AnalyticsFilterOption>('/analytics/filters/buyers', token, 'El listado de compradores históricos'),
    loadCollectionPages<AnalyticsFilterOption>('/analytics/filters/varieties', token, 'El listado de variedades históricas'),
    loadCollectionPages<AnalyticsFilterOption>('/analytics/filters/qualities', token, 'El listado de calidades históricas'),
    loadCollectionPages<AnalyticsFilterOption>('/analytics/filters/origins', token, 'El listado de procedencias históricas'),
  ]);
  return { providers: providers.items, buyers: buyers.items, varieties: varieties.items, qualities: qualities.items, origins: origins.items };
}
export const loadAnalyticsFilters = loadHistoricalCommercialFilters;
export function analyticsSeries(token: string, filters: { from: string; to: string; varietyId?: string; providerId?: string; buyerId?: string; qualityId?: string; originId?: string }) {
  const query = new URLSearchParams({ from: filters.from, to: filters.to });
  if (filters.varietyId) query.set('varietyId', filters.varietyId);
  if (filters.providerId) query.set('providerId', filters.providerId);
  if (filters.buyerId) query.set('buyerId', filters.buyerId);
  if (filters.qualityId) query.set('qualityId', filters.qualityId);
  if (filters.originId) query.set('originId', filters.originId);
  return apiRequest<AnalyticsSeries>(`/analytics/series?${query.toString()}`, { token });
}

export function predictionReadiness(token: string, asOf: string, varietyId: string) {
  const query = new URLSearchParams({ asOf, varietyId });
  return apiRequest<PredictionReadiness>(`/analytics/readiness?${query.toString()}`, { token });
}

export type SavedPublicationOutcome={id:string;publicationId:string;createdAt:string;retainUntil:string;createdByUserId:string;result:PublicationOutcome};
export type OutcomeSummary=Omit<SavedPublicationOutcome,'result'>;
export const savePublicationOutcome=(token:string,id:string,clientOperationId:string)=>apiRequest<SavedPublicationOutcome>(`/analytics/publications/${encodeURIComponent(id)}/outcomes`,{token,method:'POST',body:{clientOperationId}});
export const getSavedPublicationOutcome=(token:string,id:string,outcomeId:string)=>apiRequest<SavedPublicationOutcome>(`/analytics/publications/${encodeURIComponent(id)}/outcomes/${encodeURIComponent(outcomeId)}`,{token});
export const listPublicationOutcomes=(token:string,id:string,offset:number)=>apiRequest<Page<OutcomeSummary>>(`/analytics/publications/${encodeURIComponent(id)}/outcomes?limit=20&offset=${offset}`,{token});
