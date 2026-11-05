import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {SaleFlowScreen} from '@/features/sales/screens/sale-flow-screen';
import {getSale,loadSaleCatalogs} from '@/services/api/sales-api';
import type {Sale} from '@/domain/sales/sale';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';

let mockDistinctIds=false;let mockNextId=0;

const mockPreventRemove=jest.fn();const mockBack=jest.fn();const mockDispatch=jest.fn();
const mockEnqueue=jest.fn();const mockSendQueued=jest.fn();const mockReplace=jest.fn();const mockInvalidate=jest.fn();
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued})}));
const mockSession={accessToken:'test-token',expiresAt:'2099-01-01T00:00:00Z',user:{businessId:'11111111-1111-4111-8111-111111111111',userId:'22222222-2222-4222-8222-222222222222',username:'Mayorista de prueba',role:'wholesaler',expiresAt:'2099-01-01T00:00:00Z'}};
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:mockSession,invalidateSession:mockInvalidate})}));
jest.mock('expo-router',()=>({useNavigation:()=>({dispatch:mockDispatch}),useRouter:()=>({replace:mockReplace,back:mockBack,canGoBack:()=>true})}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:(...args:unknown[])=>mockPreventRemove(...args)}));
jest.mock('@/services/api/sales-api',()=>({getSale:jest.fn(),loadSaleCatalogs:jest.fn()}));
jest.mock('@/features/catalog/screens/catalog-workspace',()=>({OperationReferenceEditor:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'reference-editor'})}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=> mockDistinctIds?`sale-operation-${++mockNextId}`:'sale-operation'}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,ChoiceDialog:control,ConfirmationDialog:control,FeedbackState:control,FormField:control,LoadingState:control,MetricTile:control,ScreenHeader:control,SelectionField:control,StepProgress:control};
});

beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockDistinctIds=false;mockNextId=0;mockEnqueue.mockResolvedValue({id:'sale-operation',status:'pending'});
  mockSendQueued.mockResolvedValue({id:'sale-operation',status:'confirmed',centralReference:'central-sale'});
  jest.mocked(loadSaleCatalogs).mockResolvedValue({buyers:[{id:'buyer',name:'Comprador',phone:null,destinationDepartment:'Lima',creditLimitCents:null}],vehicles:[],varieties:[{id:'variety',name:'Papa'}]});
  const sale:Sale={id:'central-sale',buyerId:'buyer',destinationDepartment:'Lima',grossAmountCents:'2500',freightAmountCents:'0',discountsCents:'0',totalAmountCents:'2500',paymentMode:'cash',state:'confirmed',version:1,createdAt:'2026-10-04T00:00:00Z'};
  jest.mocked(getSale).mockResolvedValue({sale,lines:[]});
});

async function prepare() {
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<SaleFlowScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Comprador')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar comprador')[0].props.onSelect({id:'buyer'})});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Variedad')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar variedad')[0].props.onSelect({id:'variety'})});
  await act(async()=>{
    for(const[label,value]of [['Sacos','1'],['Peso (kg)','10'],['Precio (S/)','2.50']])root.root.findAll(node=>node.props.label===label)[0].props.onChangeText(value);
  });
  await act(async()=>{root.root.findAll(node=>node.props.label==='Agregar línea')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Revisar y confirmar')[0].props.onPress()});
  return root;
}
async function confirm(root:ReactTestRenderer){await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Confirmar venta')[0].props.onConfirm();await Promise.resolve()})}

it('reviews credit due dates and exact installment amounts without sending the sale',async()=>{
  const root=await prepare();
  const control=(label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
  const review=()=>root.root.findAll(node=>node.props.confirmLabel==='Confirmar venta')[0]!;
  try {
    await act(async()=>review().props.onCancel());
    await act(async()=>control('Crédito').props.onPress());
    await act(async()=>control('Agregar cuota').props.onPress());
    await act(async()=>{control('Vencimiento cuota 1').props.onChangeText('2099-10-31');control('Importe (S/)').props.onChangeText('24.00');});
    await act(async()=>control('Revisar y confirmar').props.onPress());
    expect(review().props.visible).toBe(false);
    expect(JSON.stringify(root.toJSON())).toContain('Las cuotas deben sumar exactamente el total de venta.');
    await act(async()=>control('Importe (S/)').props.onChangeText('25.00'));
    await act(async()=>control('Revisar y confirmar').props.onPress());
    expect(review().props.visible).toBe(true);
    expect(review().props.message).toContain('Cuota 1: 2099-10-31 · S/ 25.00.');
    expect(control('Importe (S/)').props.accessibilityLabel).toBe('Importe cuota 1 (S/)');
    expect(root.root.findAll(node=>node.props.accessibilityLabel==='Quitar línea 1: Papa').length).toBeGreaterThan(0);
    expect(root.root.findAll(node=>node.props.accessibilityLabel==='Quitar cuota 1').length).toBeGreaterThan(0);
    await act(async()=>review().props.onCancel());
    expect(control('Importe (S/)').props.value).toBe('25.00');
    expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();
  } finally {await act(async()=>root.unmount());}
});

it('returns from the buyer editor to the same sale and blocks departure during a reference write',async()=>{
  const root=await prepare();await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Confirmar venta')[0].props.onCancel());
  await act(async()=>root.root.findAll(node=>node.props.label==='Sacos')[0].props.onChangeText('5'));
  await act(async()=>root.root.findAll(node=>node.props.label==='Registrar o editar compradores')[0].props.onPress());
  const editor=()=>root.root.findAll(node=>node.props.screenKind==='reference-editor')[0]!;expect(editor().props.kind).toBe('buyers');
  await act(async()=>editor().props.onEditingState(true,true));await act(async()=>mockPreventRemove.mock.calls.at(-1)![1]({data:{action:{type:'GO_BACK'}}}));
  expect(mockDispatch).not.toHaveBeenCalled();expect(root.root.findAll(node=>node.props.title==='¿Salir de la venta?')[0].props.visible).toBe(false);
  await act(async()=>editor().props.onEditingState(false,false));await act(async()=>editor().props.onClose(true));
  expect(loadSaleCatalogs).toHaveBeenCalledTimes(2);expect(root.root.findAll(node=>node.props.label==='Sacos')[0].props.value).toBe('5');
  expect(root.root.findAll(node=>node.props.label==='Comprador')[0].props.value).toBe('Comprador');expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('retries reference reads without resending a saved buyer or changing the sale agreement',async()=>{
  const root=await prepare();await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Confirmar venta')[0]!.props.onCancel());
  await act(async()=>root.root.findAll(node=>node.props.label==='Sacos')[0]!.props.onChangeText('5'));
  await act(async()=>root.root.findAll(node=>node.props.label==='Registrar o editar compradores')[0]!.props.onPress());
  jest.mocked(loadSaleCatalogs).mockRejectedValueOnce(new Error('connection lost'));
  await act(async()=>root.root.findAll(node=>node.props.screenKind==='reference-editor')[0]!.props.onClose(true));
  const retry=root.root.findAll(node=>node.props.actionLabel==='Reintentar opciones')[0]!.props.onAction;
  let finish!:(value:Awaited<ReturnType<typeof loadSaleCatalogs>>)=>void;
  jest.mocked(loadSaleCatalogs).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  await act(async()=>{retry();retry();});expect(loadSaleCatalogs).toHaveBeenCalledTimes(3);
  expect(root.root.findAll(node=>node.props.label==='Registrar o editar compradores')[0]!.props.disabled).toBe(true);
  await act(async()=>finish({buyers:[{id:'buyer',name:'Comprador',phone:null,destinationDepartment:'Lima',creditLimitCents:null},{id:'new-buyer',name:'Comprador nuevo',phone:null,destinationDepartment:null,creditLimitCents:null}],vehicles:[],varieties:[{id:'variety',name:'Papa'}]}));
  expect(root.root.findAll(node=>node.props.actionLabel==='Reintentar opciones')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Sacos')[0]!.props.value).toBe('5');expect(root.root.findAll(node=>node.props.label==='Departamento de destino')[0]!.props.value).toBe('Lima');
  await act(async()=>root.root.findAll(node=>node.props.label==='Comprador')[0]!.props.onPress());
  expect(root.root.findAll(node=>node.props.title==='Seleccionar comprador')[0]!.props.choices).toContainEqual({id:'new-buyer',label:'Comprador nuevo'});
  expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('saves the complete sale before sending and loads the confirmed central detail',async()=>{
  const root=await prepare();await confirm(root);
  expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({id:'sale-operation',method:'POST',path:'/sales',type:'sale.create',body:expect.objectContaining({buyerId:'buyer',clientOperationId:'sale-operation',lines:[{varietyId:'variety',qualityId:null,originId:null,priceBasis:'kilogram',sacks:1,unitPriceCents:250,weightKg:'10'}]})}));
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[0]);
  expect(getSale).toHaveBeenCalledWith('test-token','central-sale');expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.title==='Venta confirmada')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('adds and sends two lines of the same variety with different commercial characteristics',async()=>{
  mockDistinctIds=true;const qualityId='33333333-3333-4333-8333-333333333333';
  jest.mocked(loadSaleCatalogs).mockResolvedValue({buyers:[{id:'buyer',name:'Comprador',phone:null,destinationDepartment:'Lima',creditLimitCents:null}],vehicles:[],varieties:[{id:'variety',name:'Papa'}],qualities:[{id:qualityId,name:'Calidad QA',kind:'quality',isActive:true}],origins:[]});
  const root=await prepare();await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Confirmar venta')[0].props.onCancel());
  await act(async()=>root.root.findByType(CharacteristicFields).props.onChange('qualityId',qualityId));
  await act(async()=>root.root.findAll(node=>node.props.label==='Variedad')[0].props.onPress());
  expect(root.root.findAll(node=>node.props.title==='Seleccionar variedad')[0].props.choices).toContainEqual({id:'variety',label:'Papa'});
  await act(async()=>root.root.findAll(node=>node.props.title==='Seleccionar variedad')[0].props.onSelect({id:'variety'}));
  await act(async()=>{for(const[label,value]of [['Sacos','2'],['Peso (kg)','20'],['Precio (S/)','2.00']])root.root.findAll(node=>node.props.label===label)[0].props.onChangeText(value);});
  await act(async()=>root.root.findAll(node=>node.props.label==='Agregar línea')[0].props.onPress());
  await act(async()=>root.root.findAll(node=>node.props.label==='Revisar y confirmar')[0].props.onPress());await confirm(root);
  const body=mockEnqueue.mock.calls[0][0].body;expect(body.lines).toHaveLength(2);expect(body.lines[0]).toMatchObject({varietyId:'variety',qualityId:null,originId:null});expect(body.lines[1]).toMatchObject({varietyId:'variety',qualityId,originId:null});expect(body.lines[1]).not.toHaveProperty('qualityName');
  await act(async()=>root.unmount());
});
it('does not send or navigate away when durable storage fails',async()=>{
  mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));
  const root=await prepare();await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.message==='Storage full')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('opens recovery when the saved sale is not centrally confirmed',async()=>{
  mockSendQueued.mockResolvedValueOnce({id:'sale-operation',status:'pending'});
  const root=await prepare();await confirm(root);
  expect(mockReplace).toHaveBeenCalledWith('/sync-queue');expect(getSale).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.title==='Venta confirmada')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('retries only the detail lookup after a centrally confirmed sale',async()=>{
  jest.mocked(getSale).mockRejectedValueOnce(new Error('Detail unavailable'));
  const root=await prepare();await confirm(root);
  expect(root.root.findAll(node=>node.props.title==='Venta confirmada')).not.toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.label==='Reintentar consulta del detalle')[0].props.onPress();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(getSale).toHaveBeenCalledTimes(2);expect(root.root.findAll(node=>node.props.label==='Total')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('warns before cancel and retains every edited field when the exit is cancelled',async()=>{
  const root=await prepare();
  await act(async()=>{root.root.findAll(node=>node.props.title==='¿Confirmar la venta?')[0].props.onCancel()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Cancelar')[0].props.onPress()});
  const prompt=root.root.findAll(node=>node.props.title==='¿Salir de la venta?')[0];expect(prompt.props.visible).toBe(true);expect(mockBack).not.toHaveBeenCalled();
  await act(async()=>{prompt.props.onCancel()});
  expect(root.root.findAll(node=>node.props.label==='Comprador')[0].props.value).toBe('Comprador');
  expect(root.root.findAll(node=>node.props.label==='Departamento de destino')[0].props.value).toBe('Lima');
  expect(mockEnqueue).not.toHaveBeenCalled();expect(mockBack).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
it('continues the exact intercepted navigation action only after discard approval',async()=>{
  const root=await prepare();const action={type:'GO_BACK',source:'sale-route'};
  const [protect,callback]=mockPreventRemove.mock.calls.at(-1)!;expect(protect).toBe(true);
  await act(async()=>{callback({data:{action}})});
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async()=>{root.root.findAll(node=>node.props.title==='¿Salir de la venta?')[0].props.onConfirm()});
  expect(mockDispatch).toHaveBeenCalledWith(action);expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
it('does not silently omit another line still being edited from the agreement',async()=>{
  const root=await prepare();
  await act(async()=>{root.root.findAll(node=>node.props.title==='¿Confirmar la venta?')[0].props.onCancel();root.root.findAll(node=>node.props.label==='Peso (kg)')[0].props.onChangeText('20')});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Revisar y confirmar')[0].props.onPress()});
  expect(root.root.findAll(node=>node.props.title==='¿Confirmar la venta?')[0].props.visible).toBe(false);
  expect(root.root.findAll(node=>node.props.message==='Agrega la variedad en edición o vacía sus campos antes de revisar la venta.')).not.toHaveLength(0);
  expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});
it('disables editing and prevents route changes while durable saving is in progress',async()=>{
  let finish!:()=>void;mockEnqueue.mockImplementationOnce(()=>new Promise<void>(resolve=>{finish=resolve}));
  const root=await prepare();await confirm(root);
  expect(root.root.findAll(node=>node.props.label==='Departamento de destino')[0].props.editable).toBe(false);
  expect(root.root.findAll(node=>node.props.label==='Comprador')[0].props.disabled).toBe(true);
  const callback=mockPreventRemove.mock.calls.at(-1)![1];await act(async()=>{callback({data:{action:{type:'GO_BACK'}}})});
  expect(root.root.findAll(node=>node.props.title==='¿Salir de la venta?')[0].props.visible).toBe(false);expect(mockDispatch).not.toHaveBeenCalled();
  await act(async()=>{finish();await Promise.resolve();await Promise.resolve()});
  expect(root.root.findAll(node=>node.props.title==='Venta confirmada')).not.toHaveLength(0);
  expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);await act(async()=>{root.unmount()});
});
