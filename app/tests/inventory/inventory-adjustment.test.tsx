import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {InventoryAdjustmentScreen} from '@/features/inventory/screens/inventory-adjustment-screen';
import {getInventoryLot,listInventoryMovements} from '@/services/api/inventory-api';
import {listSales} from '@/services/api/sales-api';

const mockEnqueue=jest.fn();const mockSendQueued=jest.fn();const mockPush=jest.fn();
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued})}));
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:{accessToken:'test-token'}})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:jest.fn()}),useLocalSearchParams:()=>({id:'lot-id'})}));
jest.mock('@/services/api/inventory-api',()=>({getInventoryLot:jest.fn(),listInventoryMovements:jest.fn()}));
jest.mock('@/services/api/sales-api',()=>({listSales:jest.fn()}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=> 'inventory-operation'}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,ChoiceDialog:control,ConfirmationDialog:control,FeedbackState:control,FormField:control,LoadingState:control,MetricTile:control,ScreenHeader:control,SelectionField:control};
});
beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockEnqueue.mockResolvedValue({id:'inventory-operation',status:'pending'});
  mockSendQueued.mockResolvedValue({id:'inventory-operation',status:'confirmed',centralReference:'central-movement'});
  jest.mocked(getInventoryLot).mockResolvedValue({id:'lot-id',varietyId:'variety-id',state:'available',availableSacks:2,availableWeightKg:'20.000',initialSacks:2,initialWeightKg:'20.000',version:4,createdAt:'2026-10-04T00:00:00Z'});
  jest.mocked(listInventoryMovements).mockResolvedValue({items:[],total:0,limit:100,offset:0});
  jest.mocked(listSales).mockResolvedValue({items:[{id:'sale-id',buyerId:'buyer-id',destinationDepartment:'Lima',grossAmountCents:'2500',freightAmountCents:'0',discountsCents:'0',totalAmountCents:'2500',paymentMode:'cash',state:'confirmed',version:1,createdAt:'2026-10-04T00:00:00Z'}],total:1,limit:100,offset:0});
});
async function prepare(kind:'correction'|'loss'|'return'='correction'){
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<InventoryAdjustmentScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label===({correction:'Corrección',loss:'Merma',return:'Devolución física'}[kind]))[0].props.onPress()});
  await act(async()=>{
    for(const[label,value]of [['Variación de sacos',kind==='loss'?'-1':'1'],['Variación de peso (kg)',kind==='loss'?'-10':'10'],['Motivo','Reconteo autorizado']])root.root.findAll(node=>node.props.label===label)[0].props.onChangeText(value);
  });
  if(kind==='return'){
    await act(async()=>{root.root.findAll(node=>node.props.label==='Venta de origen')[0].props.onPress()});
    await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar venta de origen')[0].props.onSelect({id:'sale-id'})});
  }
  await act(async()=>{root.root.findAll(node=>node.props.label==='Revisar ajuste')[0].props.onPress()});
  return root;
}
async function confirm(root:ReactTestRenderer){await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Aplicar ajuste')[0].props.onConfirm();await Promise.resolve()})}

it.each(['correction','loss','return'] as const)('stores %s with its central version before sending',async(kind)=>{
  const root=await prepare(kind);await confirm(root);
  expect(mockEnqueue).toHaveBeenCalledWith({id:'inventory-operation',method:'POST',path:'/inventory/lots/lot-id/adjustments',type:'inventory.adjustment',body:{clientOperationId:'inventory-operation',expectedVersion:4,kind,reason:'Reconteo autorizado',sackDelta:kind==='loss'?-1:1,weightDeltaKg:kind==='loss'?'-10':'10',...(kind==='return'?{sourceSaleId:'sale-id'}:{})}});
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[0]);
  expect(mockPush).not.toHaveBeenCalled();expect(getInventoryLot).toHaveBeenCalledTimes(2);
  expect(root.root.findAll(node=>node.props.title==='Ajuste confirmado')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('keeps the form without sending when the queue cannot persist the adjustment',async()=>{
  const root=await prepare();mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();expect(mockPush).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.message==='Storage full')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.value).toBe('Reconteo autorizado');
  expect(root.root.findAll(node=>node.props.label==='Revisar ajuste')[0].props.disabled).toBe(false);
  await act(async()=>{root.unmount()});
});
it('opens recovery for a pending adjustment without refreshing or reporting success',async()=>{
  const root=await prepare();mockSendQueued.mockResolvedValueOnce({id:'inventory-operation',status:'pending'});await confirm(root);
  expect(mockPush).toHaveBeenCalledWith('/sync-queue');expect(getInventoryLot).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='Ajuste confirmado')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('locks new adjustments until the confirmed lot can be refreshed',async()=>{
  const root=await prepare();jest.mocked(getInventoryLot).mockRejectedValueOnce(new Error('Lot lookup failed'));await confirm(root);
  expect(root.root.findAll(node=>node.props.title==='Ajuste confirmado')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Revisar ajuste')[0].props.disabled).toBe(true);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta de lote')[0].props.onAction();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(getInventoryLot).toHaveBeenCalledTimes(3);
  expect(root.root.findAll(node=>node.props.label==='Revisar ajuste')[0].props.disabled).toBe(false);
  await act(async()=>{root.unmount()});
});
it('offers a read retry instead of leaving the initial lot failure loading forever',async()=>{
  jest.mocked(getInventoryLot).mockRejectedValueOnce(new Error('Initial lookup failed'));
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<InventoryAdjustmentScreen/>)});
  expect(root.root.findAll(node=>node.props.title==='No se pudo abrir el lote')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Cargando lote')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta de lote')[0].props.onAction();await Promise.resolve()});
  expect(root.root.findAll(node=>node.props.title==='Ajustar lote')).not.toHaveLength(0);
  expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
