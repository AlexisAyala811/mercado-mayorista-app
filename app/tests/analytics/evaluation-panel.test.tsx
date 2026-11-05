import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { EvaluationPanel } from '@/features/analytics/screens/evaluation-panel';
import { createAnalyticsEvaluation } from '@/services/api/analytics-api';
import type { AnalyticsEvaluation } from '@/domain/analytics/analytics';
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({invalidateSession:jest.fn()})}));
jest.mock('@/services/api/analytics-api',()=>({createAnalyticsEvaluation:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,ConfirmationDialog:control,FeedbackState:control,LoadingState:control};});
const result: AnalyticsEvaluation={id:'version-one',varietyId:'v',asOf:'2026-10-12',algorithmVersion:'weekly-mean-4-v1',inputsHash:'hash',createdAt:'2026-10-12T12:00:00Z',retainUntil:'2031-10-12T12:00:00Z',window:{from:'2026-04-13',to:'2026-10-11',weeksRequired:26,minimumSalesPerWeek:5},maeSolesPerKg:'1.0000',baselineMaeSolesPerKg:'2.0000',coveredWeeks:8,observedCoveragePercent:100,improvementMet:true,coverageMet:true,reviewRequired:true,publicationAvailable:false,comparisons:[{weekStart:'2026-10-05',trainingThrough:'2026-09-28',actualSolesPerKg:'2.0000',priceSolesPerKg:'3.0000',baselineSolesPerKg:'4.0000',lowerSolesPerKg:'2.0000',upperSolesPerKg:'4.0000',absoluteErrorSolesPerKg:'1.0000',covered:true}]};
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(createAnalyticsEvaluation).mockResolvedValue(result);});
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<EvaluationPanel key="old" token="token" varietyId="v" asOf="2026-10-12"/>);});return root;}
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
it('retries a lost response with the same UUID and displays evidence as historical, not published',async()=>{
  jest.mocked(createAnalyticsEvaluation).mockRejectedValueOnce(new Error('network'));
  const root=await open();await act(async()=>{button(root,'Evaluar y conservar evidencia').props.onPress();});
  const request=jest.mocked(createAnalyticsEvaluation).mock.calls[0]![1];
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar evaluación')[0]!.props.onAction();});
  expect(createAnalyticsEvaluation).toHaveBeenLastCalledWith('token',request);
  const content=JSON.stringify(root.toJSON());expect(content).toContain('Evaluación conservada');expect(content).toContain('conserva su propia versión y revisión');expect(content).toContain('Estimado histórico');
  await act(async()=>{button(root,'Crear otra evaluación').props.onPress();});
  expect(jest.mocked(createAnalyticsEvaluation).mock.calls[2]![1].clientOperationId).not.toBe(request.clientOperationId);
  await act(async()=>root.unmount());
});
it('blocks duplicate presses and discards an old session response',async()=>{
  let resolve!:(value:AnalyticsEvaluation)=>void;
  jest.mocked(createAnalyticsEvaluation).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const root=await open();
  await act(async()=>{const press=button(root,'Evaluar y conservar evidencia').props.onPress;press();press();});
  expect(createAnalyticsEvaluation).toHaveBeenCalledTimes(1);
  expect(button(root,'Evaluando…').props.disabled).toBe(true);
  await act(async()=>{root.update(<EvaluationPanel key="new" token="new-token" varietyId="v" asOf="2026-10-12"/>);});
  await act(async()=>resolve(result));
  expect(JSON.stringify(root.toJSON())).not.toContain('version-one');
  await act(async()=>root.unmount());
});
