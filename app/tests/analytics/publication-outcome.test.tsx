import React from 'react';
import { act,create,type ReactTestRenderer } from 'react-test-renderer';
import { PublicationOutcomePanel } from '@/features/analytics/screens/publication-outcome';
import { getPublicationOutcome } from '@/services/api/analytics-api';
import type { PublicationOutcome } from '@/domain/analytics/analytics';
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({invalidateSession:jest.fn()})}));
jest.mock('@/services/api/analytics-api',()=>({getPublicationOutcome:jest.fn()}));
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,FeedbackState:control,LoadingState:control};});
const pending:PublicationOutcome={publicationId:'p',takenAt:'2026-10-12T15:00:00Z',timeZone:'America/Lima',state:'week_in_progress',actualSolesPerKg:null,absoluteErrorSolesPerKg:null,covered:null,operationIds:[],compensationIds:[],excluded:[]};
beforeEach(()=>{(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();jest.mocked(getPublicationOutcome).mockResolvedValue(pending);});
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<PublicationOutcomePanel token="token" id="p"/>);});return root;}
async function consult(root:ReactTestRenderer){await act(async()=>root.root.findAll(node=>node.props.label==='Consultar comparación posterior')[0]!.props.onPress());}
it('does not invent actual prices during an unfinished week',async()=>{const root=await open();await consult(root);expect(JSON.stringify(root.toJSON())).toContain('Semana en curso');expect(JSON.stringify(root.toJSON())).not.toContain('Real S/');await act(async()=>root.unmount());});
it('retries read failure and presents actual zero as a recorded value',async()=>{
  jest.mocked(getPublicationOutcome).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({...pending,state:'compared',actualSolesPerKg:'0.0000',absoluteErrorSolesPerKg:'3.0000',covered:false,operationCount:1,weightKg:'10.000'});
  const root=await open();await consult(root);expect(JSON.stringify(root.toJSON())).not.toContain('Sin valor real calculable');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar comparación')[0]!.props.onAction());
  expect(JSON.stringify(root.toJSON())).toContain('0.0000');expect(JSON.stringify(root.toJSON())).toContain('Fuera del rango publicado');
  expect(getPublicationOutcome).toHaveBeenLastCalledWith('token','p');await act(async()=>root.unmount());
});
