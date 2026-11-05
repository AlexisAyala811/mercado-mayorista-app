import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PurchaseHistoryScreen} from '@/features/reception/screens/purchase-history-screen';
import {getPurchaseSettlement,getReception,getSacks,listReceptions} from '@/services/api/reception-api';
import type {Reception} from '@/domain/reception/reception';

const mockEnqueue=jest.fn();const mockSendQueued=jest.fn();const mockPush=jest.fn();
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued})}));
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:{accessToken:'test-token',user:{role:'wholesaler'}}})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn()})}));
jest.mock('@/services/api/reception-api',()=>({getPurchaseSettlement:jest.fn(),getReception:jest.fn(),getSacks:jest.fn(),listReceptions:jest.fn()}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=> 'history-operation'}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,ConfirmationDialog:control,EmptyState:control,FeedbackState:control,FormField:control,LoadingState:control,MetricTile:control,ScreenHeader:control};
});
const reception:Reception={id:'reception-id',providerId:'provider-id',providerPhone:null,vehicleId:null,driverName:'Conductor',receivedOn:'2026-10-04',state:'weighed',version:3,expectedVarieties:[{id:'variety-id',name:'Papa'}]};
beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockEnqueue.mockResolvedValue({id:'history-operation',status:'pending'});
  mockSendQueued.mockResolvedValue({id:'history-operation',status:'confirmed',centralReference:'central-result'});
  jest.mocked(listReceptions).mockResolvedValue({items:[reception],total:1,limit:100,offset:0});
  jest.mocked(getReception).mockResolvedValue(reception);
  jest.mocked(getSacks).mockResolvedValue([{id:'sack-id',sequence:1,varietyId:'variety-id',grossWeightKg:'100.000',tareKg:'0.000',netWeightKg:'100.000'}]);
  jest.mocked(getPurchaseSettlement).mockResolvedValue({id:'purchase-id',grossAmountCents:'25000',freightAmountCents:'0',advancesCents:'0',discountsCents:'0',liquidAmountCents:'25000',paymentMode:'cash',state:'confirmed',version:2});
});
type Kind='void-reception'|'void-purchase'|'void-sack'|'correct-open'|'correct-closed';
it.each(['draft', 'weighing', 'weighed'] as const)('offers continuation for %s using the existing reception identity', async (state) => {
  jest.mocked(getReception).mockResolvedValue({ ...reception, state });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Abrir detalle')[0].props.onPress(); });
  const label = state === 'weighed' ? 'Continuar liquidación' : 'Continuar pesaje';
  await act(async () => { root.root.findAll(node => node.props.label === label)[0].props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/purchase-flow', params: { receptionId: reception.id } });
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each(['settled', 'voided'] as const)('does not offer continuation for %s receptions', async (state) => {
  jest.mocked(getReception).mockResolvedValue({ ...reception, state });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Abrir detalle')[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.label === 'Continuar liquidación' || node.props.label === 'Continuar pesaje')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

async function prepare(kind:Kind='void-reception'){
  if(kind==='void-purchase')jest.mocked(getReception).mockResolvedValue({...reception,state:'settled'});
  if(kind==='correct-open')jest.mocked(getReception).mockResolvedValue({...reception,state:'weighing'});
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Abrir detalle')[0].props.onPress();await Promise.resolve()});
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


it('queries the full central history with combined filters and removes old results during editing',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  expect(listReceptions).toHaveBeenCalledWith('test-token',{limit:20,offset:0});
  await act(async()=>{for(const [label,value] of [['Desde','2026-10-07'],['Hasta','2026-10-07'],['Participante comercial',' Proveedor QA ']])root.root.findAll(node=>node.props.label===label)[0].props.onChangeText(value)});
  expect(root.root.findAll(node=>node.props.label==='Abrir detalle')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.label==='Liquidada')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Buscar')[0].props.onPress();await Promise.resolve()});
  expect(listReceptions).toHaveBeenLastCalledWith('test-token',{limit:20,offset:0,from:'2026-10-07',to:'2026-10-07',search:'Proveedor QA',state:'settled'});
  await act(async()=>{root.unmount()});
});
it('keeps filtered pagination and its position after returning from the detail',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Participante comercial')[0].props.onChangeText('Proveedor QA')});
  jest.mocked(listReceptions).mockResolvedValueOnce({items:Array.from({length:20},(_,index)=>({...reception,id:`r-${index}`})),total:21,limit:20,offset:0});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Buscar')[0].props.onPress();await Promise.resolve()});
  jest.mocked(listReceptions).mockResolvedValueOnce({items:[reception],total:21,limit:20,offset:20});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Página siguiente')[0].props.onPress();await Promise.resolve()});
  expect(listReceptions).toHaveBeenLastCalledWith('test-token',expect.objectContaining({search:'Proveedor QA',offset:20}));
  await act(async()=>{root.root.findAll(node=>node.props.label==='Abrir detalle')[0].props.onPress();await Promise.resolve()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Volver al historial')[0].props.onPress()});
  expect(listReceptions).toHaveBeenCalledTimes(3);
  expect(root.root.findAll(node=>node.props.label==='Participante comercial')[0].props.value).toBe('Proveedor QA');
  expect(root.root.findAll(node=>node.props.label==='Página siguiente')[0].props.disabled).toBe(true);
  await act(async()=>{root.unmount()});
});
it('ignores late reception results after a new filter is entered',async()=>{
  let finish!:(value:Awaited<ReturnType<typeof listReceptions>>)=>void;
  jest.mocked(listReceptions).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Participante comercial')[0].props.onChangeText('Nuevo proveedor')});
  await act(async()=>{finish({items:[reception],total:1,limit:20,offset:0});await Promise.resolve()});
  expect(root.root.findAll(node=>node.props.label==='Abrir detalle')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.title==='Aplica los filtros')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('distinguishes a query error from an empty result and retries its criteria',async()=>{
  jest.mocked(listReceptions).mockRejectedValueOnce(new Error('History unavailable'));
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  expect(root.root.findAll(node=>node.props.title==='Sin resultados')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta')[0].props.onAction();await Promise.resolve()});
  expect(root.root.findAll(node=>node.props.label==='Abrir detalle')).not.toHaveLength(0);
  expect(listReceptions).toHaveBeenCalledTimes(2);await act(async()=>{root.unmount()});
});
it('rejects nonexistent dates without querying and clears filters with a new central request',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Desde')[0].props.onChangeText('2026-02-30')});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Buscar')[0].props.onPress()});
  expect(listReceptions).toHaveBeenCalledTimes(1);expect(root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.label==='Limpiar filtros')[0].props.onPress();await Promise.resolve()});
  expect(listReceptions).toHaveBeenLastCalledWith('test-token',expect.objectContaining({offset:0,from:undefined,to:undefined,search:undefined}));
  expect(root.root.findAll(node=>node.props.label==='Desde')[0].props.value).toBe('');await act(async()=>{root.unmount()});
});
it('returns once to the first filtered page when the last page has disappeared',async()=>{
  jest.mocked(listReceptions).mockResolvedValueOnce({items:Array.from({length:20},(_,index)=>({...reception,id:`r-${index}`})),total:21,limit:20,offset:0});
  let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseHistoryScreen/>)});
  jest.mocked(listReceptions).mockResolvedValueOnce({items:[],total:20,limit:20,offset:20});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Página siguiente')[0].props.onPress();await Promise.resolve()});
  expect(listReceptions).toHaveBeenNthCalledWith(2,'test-token',{limit:20,offset:20});
  expect(listReceptions).toHaveBeenLastCalledWith('test-token',{limit:20,offset:0});
  expect(listReceptions).toHaveBeenCalledTimes(3);await act(async()=>{root.unmount()});
});
