import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { EvaluationHistory } from '@/features/analytics/screens/evaluation-history';
import { getAnalyticsEvaluation,listAnalyticsEvaluations } from '@/services/api/analytics-api';
import type { AnalyticsEvaluation } from '@/domain/analytics/analytics';
import { ApiError } from '@/services/api/api-client';
const mockInvalidate=jest.fn();
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({invalidateSession:mockInvalidate})}));
jest.mock('@/services/api/analytics-api',()=>({getAnalyticsEvaluation:jest.fn(),listAnalyticsEvaluations:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,ConfirmationDialog:control,FeedbackState:control,LoadingState:control,EmptyState:control};});
const summary={id:'saved-20',varietyId:'v',asOf:'2026-10-12',algorithmVersion:'weekly-mean-4-v1',inputsHash:'hash',createdAt:'2026-10-12T12:00:00Z',retainUntil:'2031-10-12T12:00:00Z'};
const saved:AnalyticsEvaluation={...summary,window:{from:'2026-04-13',to:'2026-10-11',weeksRequired:26,minimumSalesPerWeek:5},maeSolesPerKg:'1.0000',baselineMaeSolesPerKg:'2.0000',coveredWeeks:8,observedCoveragePercent:100,improvementMet:true,coverageMet:true,reviewRequired:true,publicationAvailable:false,comparisons:[]};
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(listAnalyticsEvaluations).mockImplementation(async(_token,_variety,offset)=>({items:offset?[summary]:Array.from({length:20},(_,index)=>({...summary,id:`saved-${index}`})),total:21,limit:20,offset}));jest.mocked(getAnalyticsEvaluation).mockResolvedValue(saved);});
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<EvaluationHistory key="old" token="token" varietyId="v"/>);});return root;}
it('opens saved evidence from page two, retries only the detail and returns to the same page',async()=>{
  const root=await open();await act(async()=>button(root,'Evaluaciones siguientes').props.onPress());
  expect(listAnalyticsEvaluations).toHaveBeenLastCalledWith('token','v',20);
  jest.mocked(getAnalyticsEvaluation).mockRejectedValueOnce(new Error('network'));
  await act(async()=>button(root,'Abrir evaluación saved-20').props.onPress());
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar versión')[0]!.props.onAction());
  expect(getAnalyticsEvaluation).toHaveBeenLastCalledWith('token','saved-20');
  expect(JSON.stringify(root.toJSON())).toContain('Evaluación conservada');
  await act(async()=>button(root,'Volver a evaluaciones').props.onPress());
  expect(button(root,'Evaluaciones siguientes').props.disabled).toBe(true);
  expect(listAnalyticsEvaluations).toHaveBeenCalledTimes(2);
  await act(async()=>root.unmount());
});
it('distinguishes a failed list from a true empty history and retries',async()=>{
  jest.mocked(listAnalyticsEvaluations).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({items:[],total:0,limit:20,offset:0});
  const root=await open();expect(JSON.stringify(root.toJSON())).not.toContain('Sin evaluaciones conservadas');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar historial')[0]!.props.onAction());
  expect(JSON.stringify(root.toJSON())).toContain('Sin evaluaciones conservadas');
  await act(async()=>root.unmount());
});
it('does not invalidate the new session when a previous detail request expires late',async()=>{
  let reject!:(cause:Error)=>void;
  jest.mocked(getAnalyticsEvaluation).mockReturnValueOnce(new Promise((_resolve,fail)=>{reject=fail;}));
  const root=await open();await act(async()=>button(root,'Abrir evaluación saved-0').props.onPress());
  await act(async()=>root.update(<EvaluationHistory key="new" token="new-token" varietyId="v"/>));
  await act(async()=>reject(new ApiError('expired',401)));
  expect(mockInvalidate).not.toHaveBeenCalled();
  expect(listAnalyticsEvaluations).toHaveBeenLastCalledWith('new-token','v',0);
  await act(async()=>root.unmount());
});
