import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { PublicationReview } from '@/features/analytics/screens/publication-review';
import { previewPredictionPublication,publishPrediction } from '@/services/api/analytics-api';
import type { AnalyticsEvaluation,PredictionPublication,PublicationPreview } from '@/domain/analytics/analytics';
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({invalidateSession:jest.fn()})}));
jest.mock('@/services/api/analytics-api',()=>({previewPredictionPublication:jest.fn(),publishPrediction:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,ConfirmationDialog:control,FeedbackState:control};});
const evaluation={id:'evaluated',improvementMet:true,coverageMet:true} as AnalyticsEvaluation;
const preview:PublicationPreview={evaluationId:'evaluated',varietyId:'v',inputsHash:'hash',takenAt:'2026-10-12T14:00:00Z',timeZone:'America/Lima',weekStart:'2026-10-12',weekEnd:'2026-10-18',algorithmVersion:'weekly-mean-4-v1',variables:['precio semanal'],targetCoveragePercent:80,maeSolesPerKg:'1.0000',baselineMaeSolesPerKg:'2.0000',coveredWeeks:8,observedCoveragePercent:100,reviewRequired:true,publicationAvailable:false};
const publication:PredictionPublication={id:'published-version',evaluationId:'evaluated',varietyId:'v',reviewedByUserId:'u',reviewedAt:preview.takenAt,createdAt:preview.takenAt,retainUntil:'2031-10-12T14:00:00Z',forecast:{...preview,reviewRequired:false,publicationAvailable:true,priceSolesPerKg:'9.4321',lowerSolesPerKg:'8.7654',upperSolesPerKg:'10.0988',widthSolesPerKg:'1.3334',calibrationCount:22}};
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(previewPredictionPublication).mockResolvedValue(preview);jest.mocked(publishPrediction).mockResolvedValue(publication);});
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
const dialog=(root:ReactTestRenderer)=>root.root.findAll(node=>node.props.title==='¿Publicar la estimación revisada?')[0]!;
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<PublicationReview token="token" evaluation={evaluation}/>);});return root;}
it('requires preview and explicit review; cancellation has no publication effect',async()=>{
  const root=await open();await act(async()=>button(root,'Revisar vigencia para publicar').props.onPress());
  expect(JSON.stringify(root.toJSON())).not.toContain('9.4321');
  await act(async()=>button(root,'Confirmar revisión y publicar').props.onPress());
  await act(async()=>dialog(root).props.onCancel());expect(publishPrediction).not.toHaveBeenCalled();
  await act(async()=>button(root,'Confirmar revisión y publicar').props.onPress());
  await act(async()=>dialog(root).props.onConfirm());
  expect(publishPrediction).toHaveBeenCalledWith('token',expect.objectContaining({evaluationId:'evaluated',reviewed:true}));
  expect(JSON.stringify(root.toJSON())).toContain('Estimación publicada');expect(JSON.stringify(root.toJSON())).toContain('9.4321');
  await act(async()=>root.unmount());
});
it('retries a lost publication response with the same UUID without displaying unconfirmed prices',async()=>{
  jest.mocked(publishPrediction).mockRejectedValueOnce(new Error('network'));const root=await open();
  await act(async()=>button(root,'Revisar vigencia para publicar').props.onPress());
  await act(async()=>button(root,'Confirmar revisión y publicar').props.onPress());await act(async()=>dialog(root).props.onConfirm());
  const body=jest.mocked(publishPrediction).mock.calls[0]![1];expect(JSON.stringify(root.toJSON())).not.toContain('9.4321');
  await act(async()=>button(root,'Confirmar revisión y publicar').props.onPress());await act(async()=>dialog(root).props.onConfirm());
  expect(publishPrediction).toHaveBeenLastCalledWith('token',body);await act(async()=>root.unmount());
});
it('blocks a failed evaluation and does not show a candidate after failed revalidation',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PublicationReview token="token" evaluation={{...evaluation,coverageMet:false}}/>);});
  expect(button(root,'Revisar vigencia para publicar').props.disabled).toBe(true);await act(async()=>root.unmount());
  jest.mocked(previewPredictionPublication).mockRejectedValueOnce(new Error('changed'));root=await open();
  await act(async()=>button(root,'Revisar vigencia para publicar').props.onPress());
  expect(root.root.findAll(node=>node.props.label==='Confirmar revisión y publicar')).toHaveLength(0);
  expect(publishPrediction).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
