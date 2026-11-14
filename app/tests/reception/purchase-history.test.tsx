import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PurchaseHistoryScreen} from '@/features/reception/screens/purchase-history-screen';
import {getPurchaseSettlement,getReception,getSacks} from '@/services/api/reception-api';
import {listPurchaseHistory,purchaseHistorySummary} from '@/services/api/history-api';
import type {Reception} from '@/domain/reception/reception';
import { barButton, withChrome } from '../shared/with-chrome';

const mockEnqueue=jest.fn();const mockSendQueued=jest.fn();const mockPush=jest.fn();
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued})}));
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:{accessToken:'test-token',user:{role:'wholesaler'}}})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn()})}));
jest.mock('@/services/api/reception-api',()=>({getPurchaseSettlement:jest.fn(),getReception:jest.fn(),getSacks:jest.fn()}));
jest.mock('@/services/api/history-api',()=>({listPurchaseHistory:jest.fn(),purchaseHistorySummary:jest.fn()}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=> 'history-operation'}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,ConfirmationDialog:control,EmptyState:control,FeedbackState:control,FormField:control,LoadingState:control,MetricTile:control,ScreenHeader:control};
});
const reception:Reception={id:'reception-id',providerId:'provider-id',providerPhone:null,vehicleId:null,driverName:'Conductor',receivedOn:'2026-10-04',state:'weighed',version:3,expectedVarieties:[{id:'variety-id',name:'Papa'}]};
// Spec 011 (RQ-ST05): the list now comes from GET /purchases/history.
const historyItem={receptionId:'reception-id',receivedOn:'2026-10-04',receptionState:'weighed',providerId:'provider-id',providerName:null,settlementId:null,varieties:['Papa'],sacks:1,netWeightKg:'100.000',totalCents:null,paidCents:'0',balanceCents:'0',paymentState:'unsettled' as const};
beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockEnqueue.mockResolvedValue({id:'history-operation',status:'pending'});
  mockSendQueued.mockResolvedValue({id:'history-operation',status:'confirmed',centralReference:'central-result'});
  jest.mocked(listPurchaseHistory).mockResolvedValue({items:[historyItem],total:1,limit:20,offset:0});
  jest.mocked(purchaseHistorySummary).mockResolvedValue({balanceCents:'0',counts:{all:1,debt:0,paid:0,unsettled:1,voided:0},paidCents:'0',totalCents:'0'});
  jest.mocked(getReception).mockResolvedValue(reception);
  jest.mocked(getSacks).mockResolvedValue([{id:'sack-id',sequence:1,varietyId:'variety-id',grossWeightKg:'100.000',tareKg:'0.000',netWeightKg:'100.000'}]);
  jest.mocked(getPurchaseSettlement).mockResolvedValue({id:'purchase-id',grossAmountCents:'25000',freightAmountCents:'0',advancesCents:'0',discountsCents:'0',liquidAmountCents:'25000',paymentMode:'cash',state:'confirmed',version:2});
});
type Kind='void-reception'|'void-purchase'|'void-sack'|'correct-open'|'correct-closed';
it.each(['draft', 'weighing', 'weighed'] as const)('offers continuation for %s using the existing reception identity', async (state) => {
  jest.mocked(getReception).mockResolvedValue({ ...reception, state });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<PurchaseHistoryScreen />)); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Ver detalle')[0].props.onPress(); });
  const label = state === 'weighed' ? 'Continuar liquidación' : 'Continuar pesaje';
  await act(async () => { root.root.findAll(node => node.props.label === label)[0].props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/purchase-flow', params: { receptionId: reception.id } });
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each(['settled', 'voided'] as const)('does not offer continuation for %s receptions', async (state) => {
  jest.mocked(getReception).mockResolvedValue({ ...reception, state });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<PurchaseHistoryScreen />)); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Ver detalle')[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.label === 'Continuar liquidación' || node.props.label === 'Continuar pesaje')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

async function prepare(kind:Kind='void-reception'){
  if(kind==='void-purchase')jest.mocked(getReception).mockResolvedValue({...reception,state:'settled'});
  if(kind==='correct-open')jest.mocked(getReception).mockResolvedValue({...reception,state:'weighing'});
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(withChrome(<PurchaseHistoryScreen/>))});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Ver detalle')[0].props.onPress();await Promise.resolve()});
  const correction=kind.startsWith('correct');
  await act(async()=>{root.root.findAll(node=>node.props.label===(correction?'Corregir':kind==='void-reception'?'Anular recepción':kind==='void-purchase'?'Anular compra':'Anular saco'))[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Motivo')[0].props.onChangeText('Corrección autorizada');if(correction)root.root.findAll(node=>node.props.label==='Peso bruto (kg)')[0].props.onChangeText('110')});
  await act(async()=>{root.root.findAll(node=>node.props.label===(correction?'Revisar corrección':'Revisar anulación'))[0].props.onPress()});
  return root;
}
async function confirm(root:ReactTestRenderer){await act(async()=>{root.root.findAll(node=>node.props.visible===true&&typeof node.props.onConfirm==='function')[0].props.onConfirm();await Promise.resolve()})}

it.each(['void-reception','void-purchase','void-sack','correct-open','correct-closed'] as const)('saves %s before sending and retains its success after refreshing',async(kind)=>{
  const root=await prepare(kind);await confirm(root);
  const contracts={
    'void-reception':{type:'reception.void',method:'POST',path:'/receptions/reception-id/void'},
    'void-purchase':{type:'purchase.void',method:'POST',path:'/purchases/purchase-id/void'},
    'void-sack':{type:'reception.sack-void',method:'POST',path:'/receptions/reception-id/sacks/sack-id/void'},
    'correct-open':{type:'reception.sack-correct',method:'PATCH',path:'/receptions/reception-id/sacks/sack-id'},
    'correct-closed':{type:'reception.sack-correct',method:'POST',path:'/receptions/reception-id/sacks/sack-id/correct-closed'},
  };
  expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({id:'history-operation',...contracts[kind],body:expect.objectContaining({clientOperationId:'history-operation',expectedReceptionVersion:3})}));
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[0]);
  expect(getReception).toHaveBeenCalledTimes(2);expect(mockPush).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('keeps the correction data without sending when storage fails',async()=>{
  const root=await prepare('correct-closed');mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();expect(mockPush).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.message==='Storage full')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Peso bruto (kg)')[0].props.value).toBe('110');
  await act(async()=>{root.unmount()});
});
it('opens recovery for an uncertain void without refreshing or reporting success',async()=>{
  const root=await prepare();mockSendQueued.mockResolvedValueOnce({id:'history-operation',status:'pending'});await confirm(root);
  expect(mockPush).toHaveBeenCalledWith('/sync-queue');expect(getReception).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('locks new actions and retries only the detail after a confirmed operation',async()=>{
  const root=await prepare();jest.mocked(getReception).mockRejectedValueOnce(new Error('Detail lookup failed'));await confirm(root);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Anular recepción')[0].props.disabled).toBe(true);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta de recepción')[0].props.onAction();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);expect(getReception).toHaveBeenCalledTimes(3);
  expect(root.root.findAll(node=>node.props.label==='Anular recepción')[0].props.disabled).toBe(false);
  await act(async()=>{root.unmount()});
});

