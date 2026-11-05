import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { PublicationHistory } from '@/features/analytics/screens/publication-history';
import { getAnalyticsEvaluation,getPredictionPublication,listPredictionPublications } from '@/services/api/analytics-api';
import type { AnalyticsEvaluation,PredictionPublication } from '@/domain/analytics/analytics';
const mockInvalidate=jest.fn();
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({invalidateSession:mockInvalidate})}));
jest.mock('@/services/api/analytics-api',()=>({getAnalyticsEvaluation:jest.fn(),getPredictionPublication:jest.fn(),listPublicationOutcomes:jest.fn(async()=>({items:[],total:0,limit:20,offset:0})),listPredictionPublications:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,FeedbackState:control,LoadingState:control,EmptyState:control};});
const summary={id:'pub-20',evaluationId:'source',varietyId:'v',weekStart:'2026-10-12',weekEnd:'2026-10-18',algorithmVersion:'weekly-mean-4-v1',reviewedByUserId:'u',reviewedAt:'2026-10-12T14:00:00Z',createdAt:'2026-10-12T14:00:00Z',retainUntil:'2031-10-12T14:00:00Z'};
const publication:PredictionPublication={...summary,forecast:{evaluationId:'source',varietyId:'v',inputsHash:'hash',takenAt:summary.reviewedAt,timeZone:'America/Lima',weekStart:summary.weekStart,weekEnd:summary.weekEnd,algorithmVersion:summary.algorithmVersion,variables:['precio semanal'],targetCoveragePercent:80,maeSolesPerKg:'1.0000',baselineMaeSolesPerKg:'2.0000',coveredWeeks:8,observedCoveragePercent:100,reviewRequired:false,publicationAvailable:true,priceSolesPerKg:'3.0000',lowerSolesPerKg:'2.0000',upperSolesPerKg:'4.0000',widthSolesPerKg:'2.0000',calibrationCount:22}};
const evaluation:AnalyticsEvaluation={id:'source',varietyId:'v',asOf:'2026-10-12',algorithmVersion:summary.algorithmVersion,inputsHash:'hash',createdAt:summary.createdAt,retainUntil:summary.retainUntil,window:{from:'2026-04-13',to:'2026-10-11',weeksRequired:26,minimumSalesPerWeek:5},maeSolesPerKg:'1.0000',baselineMaeSolesPerKg:'2.0000',coveredWeeks:8,observedCoveragePercent:100,improvementMet:true,coverageMet:true,reviewRequired:true,publicationAvailable:false,comparisons:[]};
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(listPredictionPublications).mockImplementation(async(_token,_variety,offset)=>({items:offset?[summary]:Array.from({length:20},(_,index)=>({...summary,id:`pub-${index}`})),total:21,limit:20,offset}));jest.mocked(getPredictionPublication).mockResolvedValue(publication);jest.mocked(getAnalyticsEvaluation).mockResolvedValue(evaluation);});
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<PublicationHistory key="session" token="token" varietyId="v"/>);});return root;}
it('recovers a published version and its original evidence without reissuing a publication',async()=>{
  const root=await open();await act(async()=>button(root,'Publicaciones siguientes').props.onPress());
  await act(async()=>button(root,'Abrir publicación pub-20').props.onPress());
  expect(getPredictionPublication).toHaveBeenCalledWith('token','pub-20');
  expect(JSON.stringify(root.toJSON())).toContain('Estimación publicada');
  await act(async()=>button(root,'Ver evidencia de la publicación').props.onPress());
  expect(getAnalyticsEvaluation).toHaveBeenCalledWith('token','source');
  expect(root.root.findAll(node=>node.props.label==='Revisar vigencia para publicar')).toHaveLength(0);
  await act(async()=>button(root,'Volver a publicaciones').props.onPress());
  expect(button(root,'Publicaciones siguientes').props.disabled).toBe(true);
  expect(listPredictionPublications).toHaveBeenCalledTimes(2);await act(async()=>root.unmount());
});
it('distinguishes failed list from empty history and recovers after retry',async()=>{
  jest.mocked(listPredictionPublications).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({items:[],total:0,limit:20,offset:0});
  const root=await open();expect(JSON.stringify(root.toJSON())).not.toContain('Sin publicaciones conservadas');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar historial')[0]!.props.onAction());
  expect(JSON.stringify(root.toJSON())).toContain('Sin publicaciones conservadas');await act(async()=>root.unmount());
});
