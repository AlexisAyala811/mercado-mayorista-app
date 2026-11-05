import React from 'react';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {PurchaseFlowScreen} from '@/features/reception/screens/purchase-flow-screen';
import {addSack,closeWeighing,createReception,getPurchaseSettlement,getReception,getSacks,loadReceptionCatalogs} from '@/services/api/reception-api';
import type {Reception} from '@/domain/reception/reception';
import type {SyncOperation} from '@/domain/sync/sync-operation';
import { clearInitialPurchaseDraft, readInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';


const mockEnqueue=jest.fn();const mockSendQueued=jest.fn();const mockReplace=jest.fn();const mockInvalidate=jest.fn();
const mockPreventRemove=jest.fn(); const mockDispatch=jest.fn(); const mockBack=jest.fn(); const mockCanGoBack=jest.fn();
const mockBrowserTraversalGuard=jest.fn();
let mockQueuedOperations: SyncOperation[] = [];
let mockQueueLoading = false;
let mockQueueError: string | null = null;
let mockOfflineSession = false;
let mockIdIndex=0;
const mockIds=['00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000004'];
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued,operations:mockQueuedOperations,isLoadingQueue:mockQueueLoading,queueError:mockQueueError})}));
const mockSession={accessToken:'test-token',expiresAt:'2099-01-01T00:00:00Z',user:{businessId:'11111111-1111-4111-8111-111111111111',userId:'22222222-2222-4222-8222-222222222222',username:'Mayorista de prueba',role:'wholesaler',expiresAt:'2099-01-01T00:00:00Z'}};
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:mockSession,invalidateSession:mockInvalidate,isOfflineSession:mockOfflineSession})}));
jest.mock('expo-router',()=>({useRouter:()=>({replace:mockReplace,back:mockBack,canGoBack:mockCanGoBack}),useNavigation:()=>({dispatch:mockDispatch})}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:(...args:unknown[])=>mockPreventRemove(...args)}));
jest.mock('@/navigation/use-browser-traversal-guard',()=>({useBrowserTraversalGuard:(...args:unknown[])=>mockBrowserTraversalGuard(...args)}));
jest.mock('@/services/api/reception-api',()=>({addSack:jest.fn(),closeWeighing:jest.fn(),correctSack:jest.fn(),createReception:jest.fn(),getReception:jest.fn(),getSacks:jest.fn(),getPurchaseSettlement:jest.fn(),loadReceptionCatalogs:jest.fn()}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=>mockIds[mockIdIndex++]}));
jest.mock('@/features/reception/screens/reception-details-screen',()=>({ReceptionDetailsScreen:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'details'})}));
jest.mock('@/features/reception/screens/weighing-screen',()=>({WeighingScreen:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'weighing'})}));
jest.mock('@/features/reception/screens/settlement-screen',()=>({SettlementScreen:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'settlement'})}));
jest.mock('@/features/reception/screens/purchase-confirmation-screen',()=>({PurchaseConfirmationScreen:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'confirmation'})}));
jest.mock('@/features/catalog/screens/catalog-workspace',()=>({OperationReferenceEditor:(props:object)=>jest.requireActual('react').createElement('test-control',{...props,screenKind:'reference-editor'})}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);
  return {AppScreen:control,ChoiceDialog:control,ConfirmationDialog:control,FeedbackState:control,LoadingState:control};
});
beforeEach(()=>{
  clearInitialPurchaseDraft();
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockIdIndex=0;mockEnqueue.mockResolvedValue({id:mockIds[3],status:'pending'});
  mockCanGoBack.mockReturnValue(false);
  mockQueuedOperations = []; mockQueueLoading = false; mockQueueError = null; mockOfflineSession = false;
  mockSendQueued.mockImplementation(async(id:string)=>({id,status:'confirmed',centralReference:id===mockIds[3]?'central-purchase':id===mockIds[1]?'sack-id':'reception-id'}));
  jest.mocked(loadReceptionCatalogs).mockResolvedValue({providers:[{id:'provider-id',name:'Proveedor',phone:null}],vehicles:[],varieties:[{id:'variety-id',name:'Papa'}]});
  const reception:Reception={id:'reception-id',providerId:'provider-id',providerPhone:null,vehicleId:null,driverName:'Conductor',receivedOn:'2026-10-04',state:'draft',version:0,expectedVarieties:[{id:'variety-id',name:'Papa'}]};
  jest.mocked(createReception).mockResolvedValue(reception);
  jest.mocked(getReception).mockReset().mockResolvedValueOnce(reception).mockResolvedValueOnce({...reception,state:'weighing',version:1}).mockResolvedValue({...reception,state:'weighed',version:2});
  jest.mocked(closeWeighing).mockResolvedValue({...reception,state:'weighed',version:2});
  const sack={id:'sack-id',sequence:1,varietyId:'variety-id',grossWeightKg:'100.000',tareKg:'0.000',netWeightKg:'100.000'};
  jest.mocked(addSack).mockResolvedValue(sack);jest.mocked(getSacks).mockResolvedValue([sack]);
  jest.mocked(getPurchaseSettlement).mockResolvedValue({id:'central-purchase',grossAmountCents:'25000',freightAmountCents:'0',advancesCents:'0',discountsCents:'0',liquidAmountCents:'25000',paymentMode:'cash',state:'confirmed',version:1});
});
describe.each(['weighing','weighed'] as const)('route removal from recovered reception %s',state=>{
  async function open(){
    jest.mocked(getReception).mockReset().mockResolvedValue({id:'saved-reception',providerId:'provider-id',providerPhone:null,vehicleId:null,driverName:'Conductor',receivedOn:'2026-10-06',state,version:7,expectedVarieties:[{id:'variety-id',name:'Papa'}]});
    let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseFlowScreen initialReceptionId="saved-reception"/>);});return root;
  }
  const screen=(root:ReactTestRenderer)=>root.root.findAll(node=>node.props.screenKind===(state==='weighing'?'weighing':'settlement'))[0];
  const exit=(root:ReactTestRenderer)=>root.root.findAll(node=>node.props.confirmLabel===(state==='weighing'?'Salir sin guardar este peso':'Salir sin guardar estos datos'))[0];
  async function edit(root:ReactTestRenderer){await act(async()=>{if(state==='weighing')screen(root).props.onGrossWeightChange('51');else screen(root).props.onChangeLot(screen(root).props.lots[0].key,'unitPrice','2.50');});}
  function expectEdited(root:ReactTestRenderer){expect(state==='weighing'?screen(root).props.currentGrossWeight:(Object.values(screen(root).props.values.lots) as {unitPrice:string}[])[0]?.unitPrice).toBe(state==='weighing'?'51':'2.50');}
  it('does not block a clean recovered stage',async()=>{
    const root=await open();expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);expect(mockBrowserTraversalGuard.mock.calls.at(-1)![0]).toBe(false);await act(async()=>root.unmount());
  });
  it('preserves edits on cancel and dispatches the original native removal only on discard',async()=>{
    const root=await open();await edit(root);
    const [enabled,request]=mockPreventRemove.mock.calls.at(-1)!;expect(enabled).toBe(true);
    const action={type:'GO_BACK',source:'recovered-purchase'};
    await act(async()=>request({data:{action}}));expect(exit(root).props.visible).toBe(true);expect(mockDispatch).not.toHaveBeenCalled();
    await act(async()=>exit(root).props.onCancel());expectEdited(root);
    await act(async()=>mockPreventRemove.mock.calls.at(-1)![1]({data:{action}}));
    await act(async()=>exit(root).props.onConfirm());expect(mockDispatch).toHaveBeenCalledTimes(1);expect(mockDispatch).toHaveBeenCalledWith(action);
    expect(mockReplace).not.toHaveBeenCalled();expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>root.unmount());
  });
  it('resumes the intercepted web history traversal only after discard',async()=>{
    const root=await open();await edit(root);const leave=jest.fn();
    const [enabled,,request]=mockBrowserTraversalGuard.mock.calls.at(-1)!;expect(enabled).toBe(true);
    await act(async()=>request(leave));expect(exit(root).props.visible).toBe(true);expect(leave).not.toHaveBeenCalled();
    await act(async()=>exit(root).props.onCancel());expectEdited(root);
    await act(async()=>mockBrowserTraversalGuard.mock.calls.at(-1)![2](leave));await act(async()=>exit(root).props.onConfirm());
    expect(leave).toHaveBeenCalledTimes(1);expect(mockDispatch).not.toHaveBeenCalled();expect(mockReplace).not.toHaveBeenCalled();expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>root.unmount());
  });
});

describe('leaving initial purchase details', () => {
  it('retries only reference reads after a saved provider cannot be reloaded and retains the purchase fields',async()=>{
    let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseFlowScreen/>);});
    const details=()=>root.root.findAll(node=>node.props.screenKind==='details')[0]!;
    await act(async()=>details().props.onChange('driverName','Conductor conservado'));
    await act(async()=>details().props.referenceActions.props.onManage('providers'));
    jest.mocked(loadReceptionCatalogs).mockRejectedValueOnce(new Error('connection lost'));
    await act(async()=>root.root.findAll(node=>node.props.screenKind==='reference-editor')[0]!.props.onClose(true));
    const retry=details().props.referenceFeedback.props.onAction;
    expect(details().props.referenceFeedback.props.actionLabel).toBe('Reintentar opciones');
    let finish!:(value:Awaited<ReturnType<typeof loadReceptionCatalogs>>)=>void;
    jest.mocked(loadReceptionCatalogs).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
    await act(async()=>{retry();retry();});
    expect(loadReceptionCatalogs).toHaveBeenCalledTimes(3);
    expect(details().props.referenceFeedback.props.label).toBe('Actualizando opciones de la operación');
    await act(async()=>finish({providers:[{id:'new-provider',name:'Proveedor nuevo',phone:null}],vehicles:[],varieties:[{id:'variety-id',name:'Papa'}]}));
    expect(details().props.referenceFeedback).toBeNull();expect(details().props.values.driverName).toBe('Conductor conservado');
    await act(async()=>details().props.onSelectProvider());
    expect(root.root.findAll(node=>node.props.title==='Seleccionar proveedor')[0]!.props.choices).toContainEqual({id:'new-provider',label:'Proveedor nuevo'});
    expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();expect(getReception).not.toHaveBeenCalled();await act(async()=>root.unmount());
  });
  it('keeps an unsaved sack weight while retrying only the quality options',async()=>{
    let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseFlowScreen initialReceptionId="reception-id"/>);});
    const weighing=()=>root.root.findAll(node=>node.props.screenKind==='weighing')[0]!;
    const children=()=>React.Children.toArray(weighing().props.characteristics.props.children) as React.ReactElement<Record<string,unknown>>[];
    await act(async()=>weighing().props.onGrossWeightChange('52.500'));
    const actions=children().find(child=>child.props.kinds)!;
    await act(async()=>(actions.props.onManage as (kind:string)=>void)('qualities'));
    jest.mocked(loadReceptionCatalogs).mockRejectedValueOnce(new Error('connection lost'));
    await act(async()=>root.root.findAll(node=>node.props.screenKind==='reference-editor')[0]!.props.onClose(true));
    const feedback=children().find(child=>child.props.actionLabel==='Reintentar opciones')!;
    const readsBefore=jest.mocked(getReception).mock.calls.length;
    await act(async()=>(feedback.props.onAction as ()=>void)());
    expect(weighing().props.currentGrossWeight).toBe('52.500');expect(getReception).toHaveBeenCalledTimes(readsBefore);
    expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();await act(async()=>root.unmount());
  });
  it('manages a provider inside the operation without losing its driver or enqueueing a purchase',async()=>{
    let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseFlowScreen/>);});
    const details=()=>root.root.findAll(node=>node.props.screenKind==='details')[0]!;
    await act(async()=>details().props.onChange('driverName','Conservar conductor'));
    await act(async()=>details().props.referenceActions.props.onManage('providers'));
    const editor=()=>root.root.findAll(node=>node.props.screenKind==='reference-editor')[0]!;
    expect(editor().props.kind).toBe('providers');await act(async()=>editor().props.onEditingState(true,true));
    const action={type:'GO_BACK'};await act(async()=>mockPreventRemove.mock.calls.at(-1)![1]({data:{action}}));
    expect(mockDispatch).not.toHaveBeenCalled();expect(root.root.findAll(node=>node.props.confirmLabel==='Salir sin guardar la recepción')[0]!.props.visible).toBe(false);
    await act(async()=>editor().props.onEditingState(false,false));await act(async()=>editor().props.onClose(true));
    expect(loadReceptionCatalogs).toHaveBeenCalledTimes(2);expect(details().props.values.driverName).toBe('Conservar conductor');expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async()=>root.unmount());
  });
  it('stores selected characteristics with the sack and keeps them as visible defaults after durable capture',async()=>{
    const qualityId='33333333-3333-4333-8333-333333333333',originId='44444444-4444-4444-8444-444444444444';
    jest.mocked(loadReceptionCatalogs).mockResolvedValue({providers:[{id:'provider-id',name:'Proveedor',phone:null}],vehicles:[],varieties:[{id:'variety-id',name:'Papa'}],qualities:[{id:qualityId,name:'Calidad QA',kind:'quality',isActive:true}],origins:[{id:originId,name:'Origen QA',kind:'origin',isActive:true}]});
    mockSendQueued.mockResolvedValueOnce({id:mockIds[0],status:'pending'});
    let root!:ReactTestRenderer;await act(async()=>{root=create(<PurchaseFlowScreen initialReceptionId="reception-id"/>);});
    const screen=()=>root.root.findAll(node=>node.props.screenKind==='weighing')[0];
    const characteristics=()=>React.Children.toArray(screen().props.characteristics.props.children).find(child=>React.isValidElement(child)&&child.type===CharacteristicFields) as React.ReactElement<React.ComponentProps<typeof CharacteristicFields>>;
    await act(async()=>{characteristics().props.onChange('qualityId',qualityId);characteristics().props.onChange('originId',originId);screen().props.onGrossWeightChange('55');});
    await act(async()=>screen().props.onAddSack());
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({type:'reception.sack-add',body:expect.objectContaining({qualityId,originId}),sackCharacteristics:{qualityId,qualityName:'Calidad QA',originId,originName:'Origen QA'}}));
    expect(screen().props.currentGrossWeight).toBe('');expect(characteristics().props.value).toEqual({qualityId,originId});
    expect(screen().props.entries.at(-1).detailDisplay).toContain('Calidad QA');expect(screen().props.entries.at(-1).detailDisplay).toContain('Origen QA');
    expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);
    await act(async()=>characteristics().props.onChange('originId',null));expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(true);
    await act(async()=>root.unmount());
  });
  async function open() { let root!: ReactTestRenderer; await act(async () => { root = create(<PurchaseFlowScreen />); }); return root; }
  const screen = (root: ReactTestRenderer) => root.root.findAll(node => node.props.screenKind === 'details')[0];
  const exit = (root: ReactTestRenderer) => root.root.findAll(node => node.props.confirmLabel === 'Salir sin guardar la recepción')[0];
  it('restores edited fields after route removal without creating a reception and clears them on discard', async () => {
    const first = await open();
    await act(async () => { screen(first).props.onChange('driverName', 'Edición conservada'); });
    await act(async () => { first.unmount(); });
    const restored = await open();
    expect(screen(restored).props.values.driverName).toBe('Edición conservada');
    await act(async () => { screen(restored).props.onBack(); });
    await act(async () => { exit(restored).props.onConfirm(); });
    expect(readInitialPurchaseDraft(mockSession.accessToken)).toBeNull();
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { restored.unmount(); });
  });
  it.each([false, true])('leaves unchanged details without a discard prompt when history is %s', async hasHistory => {
    mockCanGoBack.mockReturnValue(hasHistory);
    const root = await open();
    await act(async () => { screen(root).props.onBack(); });
    if (hasHistory) { expect(mockBack).toHaveBeenCalledTimes(1); expect(mockReplace).not.toHaveBeenCalled(); }
    else expect(mockReplace).toHaveBeenCalledWith('/home');
    expect(exit(root).props.visible).toBe(false);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });
  it('preserves changed fields on cancellation and only leaves after explicit discard', async () => {
    const root = await open();
    await act(async () => { screen(root).props.onChange('driverName', 'Conductor en edición'); });
    await act(async () => { screen(root).props.onBack(); });
    expect(exit(root).props.visible).toBe(true); expect(mockReplace).not.toHaveBeenCalled();
    expect(screen(root).props.isInteractionBlocked).toBe(true);
    expect(screen(root).props.isSubmitting).toBe(false);
    await act(async () => { exit(root).props.onCancel(); });
    expect(screen(root).props.values.driverName).toBe('Conductor en edición');
    await act(async () => { screen(root).props.onBack(); });
    await act(async () => { exit(root).props.onConfirm(); });
    expect(mockReplace).toHaveBeenCalledWith('/home');
    expect(mockEnqueue).not.toHaveBeenCalled(); expect(mockSendQueued).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });
  it('continues the original intercepted navigation action only after discard', async () => {
    const root = await open();
    await act(async () => { screen(root).props.onChange('date', '2026-10-01'); });
    const [protectedExit, callback] = mockPreventRemove.mock.calls.at(-1)!;
    expect(protectedExit).toBe(true);
    const action = { type: 'GO_BACK', source: 'purchase-route' };
    await act(async () => { callback({ data: { action } }); });
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => { exit(root).props.onCancel(); });
    expect(screen(root).props.values.date).toBe('2026-10-01');
    await act(async () => { mockPreventRemove.mock.calls.at(-1)![1]({ data: { action } }); });
    await act(async () => { exit(root).props.onConfirm(); });
    expect(mockDispatch).toHaveBeenCalledWith(action);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });
});

describe('recovery of an existing reception', () => {
  const current: Reception = { id: 'saved-reception', providerId: 'provider-id', providerPhone: null, vehicleId: null, driverName: 'Conductor', receivedOn: '2026-10-06', state: 'weighing', version: 7, expectedVarieties: [{ id: 'variety-id', name: 'Papa' }] };
  async function open() {
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<PurchaseFlowScreen initialReceptionId="saved-reception" />); });
    return root;
  }

  it('rejects impossible dates and mismatched credit amounts before requesting central confirmation', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...current, state: 'weighed' });
    const root = await open();
    const screen = () => root.root.findAll(node => node.props.screenKind === 'settlement')[0];
    const confirm = () => root.root.findAll(node => node.props.confirmLabel === 'Liquidar compra')[0];
    await act(async () => { screen().props.onChangeLot(screen().props.lots[0].key,'unitPrice','2.50'); screen().props.onChange('paymentMode', 'credit'); screen().props.onAddInstallment(); });
    const id = screen().props.values.installments[0].id;
    await act(async () => { screen().props.onChangeInstallment(id, 'amount', '250'); screen().props.onChangeInstallment(id, 'dueOn', '2030-02-30'); });
    await act(async () => { screen().props.onSubmit(); });
    expect(confirm().props.visible).toBe(false); expect(screen().props.errorMessage).toContain('fecha existente');
    await act(async () => { screen().props.onChangeInstallment(id, 'dueOn', '2030-03-01'); screen().props.onChangeInstallment(id, 'amount', '249'); });
    await act(async () => { screen().props.onSubmit(); });
    expect(confirm().props.visible).toBe(false); expect(screen().props.errorMessage).toContain('sumar exactamente');
    await act(async () => { screen().props.onChangeInstallment(id, 'amount', '250'); });
    await act(async () => { screen().props.onSubmit(); });
    expect(confirm().props.visible).toBe(true); expect(screen().props.errorMessage).toBeUndefined();
    expect(confirm().props.message).toContain('Total líquido S/ 250.00');
    expect(confirm().props.message).toContain('Crédito con 1 cuota');
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('preserves edited settlement terms when cancelling navigation out of a closed reception', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...current, state: 'weighed' });
    const root = await open();
    const screen = () => root.root.findAll(node => node.props.screenKind === 'settlement')[0];
    await act(async () => { screen().props.onChangeLot(screen().props.lots[0].key,'unitPrice','2.50'); });
    await act(async () => { screen().props.onGoHome(); });
    const exit = root.root.findAll(node => node.props.confirmLabel === 'Salir sin guardar estos datos')[0];
    expect(exit.props.visible).toBe(true); expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { exit.props.onCancel(); });
    expect((Object.values(screen().props.values.lots) as {unitPrice:string}[])[0]?.unitPrice).toBe('2.50'); expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('displays recovered provider/date and separate variety totals excluding voided sacks', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...current, providerPhone: '987654321', expectedVarieties: [{ id: 'variety-id', name: 'Papa' }, { id: 'second-variety', name: 'Otra papa' }] });
    jest.mocked(getSacks).mockResolvedValue([
      { id: 'first', sequence: 1, varietyId: 'variety-id', grossWeightKg: '51', tareKg: '1', netWeightKg: '50' },
      { id: 'second', sequence: 2, varietyId: 'second-variety', grossWeightKg: '21', tareKg: '1', netWeightKg: '20' },
      { id: 'voided', sequence: 3, varietyId: 'variety-id', grossWeightKg: '100', tareKg: '0', netWeightKg: '100', voidedAt: '2026-10-06' },
    ]);
    const root = await open();
    const screen = root.root.findAll(node => node.props.screenKind === 'weighing')[0];
    expect(screen.props.displayContext).toEqual({ username: 'Mayorista de prueba', providerName: 'Proveedor', providerPhone: '987654321', receivedOn: '2026-10-06' });
    expect(screen.props.varietySummaries).toEqual([
      { varietyId: 'variety-id', varietyName: 'Papa', summary: { sackCountDisplay: '1', totalWeightDisplay: '50 kg', averageWeightDisplay: '50.0 kg' } },
      { varietyId: 'second-variety', varietyName: 'Otra papa', summary: { sackCountDisplay: '1', totalWeightDisplay: '20 kg', averageWeightDisplay: '20.0 kg' } },
    ]);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('requires confirmation before leaving an unsaved weight and preserves it when exit is cancelled', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue(current);
    const root = await open();
    const screen = () => root.root.findAll(node => node.props.screenKind === 'weighing')[0];
    const exit = () => root.root.findAll(node => node.props.confirmLabel === 'Salir sin guardar este peso')[0];
    await act(async () => { screen().props.onGrossWeightChange('51'); });
    await act(async () => { screen().props.onGoHome(); });
    expect(exit().props.visible).toBe(true); expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => { exit().props.onCancel(); });
    expect(exit().props.visible).toBe(false); expect(screen().props.currentGrossWeight).toBe('51');
    await act(async () => { screen().props.onGoHistory(); });
    await act(async () => { exit().props.onConfirm(); });
    expect(mockReplace).toHaveBeenCalledWith('/purchase-history');
    expect(mockEnqueue).not.toHaveBeenCalled(); expect(createReception).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('restores current sacks and submits to the same identity and version without creating another reception', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue(current);
    jest.mocked(getSacks).mockResolvedValue([
      { id: 'voided-sack', sequence: 3, varietyId: 'variety-id', grossWeightKg: '70', tareKg: '0', netWeightKg: '70', voidedAt: '2026-10-06' },
      { id: 'kept-sack', sequence: 2, varietyId: 'variety-id', grossWeightKg: '51', tareKg: '1', netWeightKg: '50' },
    ]);
    const root = await open();
    const screen = () => root.root.findAll(node => node.props.screenKind === 'weighing')[0];
    expect(screen().props.entries.map((entry: { id: string }) => entry.id)).toEqual(['kept-sack']);
    expect(screen().props.summary).toMatchObject({ sackCountDisplay: '1', totalWeightDisplay: '50 kg' });
    expect(mockEnqueue).not.toHaveBeenCalled(); expect(createReception).not.toHaveBeenCalled();
    await act(async () => { screen().props.onGrossWeightChange('55,5'); });
    await act(async () => { screen().props.onAddSack(); });
    expect(screen().props.errorMessage).toBe('Ingresa el bruto y la tara en kilos enteros, sin decimales.');
    expect(mockEnqueue).not.toHaveBeenCalled();
    mockSendQueued.mockResolvedValueOnce({ id: mockIds[0], status: 'pending' });
    await act(async () => { screen().props.onGrossWeightChange('55'); });
    await act(async () => { screen().props.onAddSack(); });
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ path: '/receptions/saved-reception/sacks', type: 'reception.sack-add', body: expect.objectContaining({ expectedReceptionVersion: 7, varietyId: 'variety-id' }) }));
    expect(screen().props.entries.map((entry: { sequence: number }) => entry.sequence)).toEqual([2, 4]);
    expect(screen().props.summary).toMatchObject({ sackCountDisplay: '2', totalWeightDisplay: '105 kg' });
    await act(async () => { root.unmount(); });
  });

  it('continues a closed weighing at settlement without closing or creating it again', async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...current, state: 'weighed' });
    const root = await open();
    expect(root.root.findAll(node => node.props.screenKind === 'settlement')).not.toHaveLength(0);
    expect(mockEnqueue).not.toHaveBeenCalled(); expect(closeWeighing).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('retries failed recovery using reads only', async () => {
    jest.mocked(getReception).mockReset().mockRejectedValueOnce(new Error('Read failed')).mockResolvedValue(current);
    const root = await open();
    expect(root.root.findAll(node => node.props.screenKind === 'details')).toHaveLength(0);
    await act(async () => { root.root.findAll(node => node.props.actionLabel === 'Reintentar recuperación')[0].props.onAction(); });
    expect(root.root.findAll(node => node.props.screenKind === 'weighing')).not.toHaveLength(0);
    expect(getReception).toHaveBeenCalledTimes(2); expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it.each(['settled', 'voided'] as const)('does not reopen a reception that changed to %s', async (state) => {
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...current, state });
    const root = await open();
    expect(root.root.findAll(node => node.props.title === 'No se pudo recuperar la recepción')).not.toHaveLength(0);
    expect(root.root.findAll(node => node.props.screenKind)).toHaveLength(0);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });

  it('blocks editable recovery while a related operation remains unresolved', async () => {
    mockQueuedOperations = [{ id: 'pending-sack', businessId: 'business', userId: 'user', path: '/receptions/saved-reception/sacks', method: 'POST', type: 'reception.sack-add', body: {}, status: 'pending', attempts: 1, createdAt: '2026-10-06', updatedAt: '2026-10-06' }];
    const root = await open();
    expect(getReception).not.toHaveBeenCalled(); expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { root.root.findAll(node => node.props.actionLabel === 'Revisar sincronización')[0].props.onAction(); });
    expect(mockReplace).toHaveBeenCalledWith('/sync-queue');
    await act(async () => { root.unmount(); });
  });

  it('waits for queue hydration and fails closed if its encrypted storage cannot be read', async () => {
    mockQueueLoading = true;
    const root = await open();
    expect(getReception).not.toHaveBeenCalled();
    mockQueueLoading = false; mockQueueError = 'Cola no recuperada';
    await act(async () => { root.update(<PurchaseFlowScreen initialReceptionId="saved-reception" />); });
    expect(root.root.findAll(node => node.props.message === 'Cola no recuperada')).not.toHaveLength(0);
    expect(getReception).not.toHaveBeenCalled();
    await act(async () => { root.unmount(); });
  });
});

describe('offline local recovery', () => {
  it('continues a saved local weighing without loading catalogs or sending old operations', async () => {
    mockQueuedOperations = [{ id: mockIds[0], businessId: 'business', userId: 'user', type: 'reception.create', path: '/receptions', method: 'POST', body: { providerId: 'provider-id', driverName: 'Conductor', receivedOn: '2026-10-06', expectedVarietyIds: ['variety-id'] }, receptionContext: { providerName: 'Proveedor', vehiclePlate: '', varieties: [{ id: 'variety-id', name: 'Papa guardada' }] }, status: 'pending', attempts: 0, createdAt: '2026-10-06', updatedAt: '2026-10-06' }];
    mockQueuedOperations.push({ ...mockQueuedOperations[0], receptionContext: undefined, id: mockIds[1], type: 'reception.sack-add', path: `/receptions/@${mockIds[0]}/sacks`, body: { expectedReceptionVersion: 0, varietyId: 'variety-id', grossWeightKg: '12', tareKg: '0' } });
    mockIdIndex = 2;
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<PurchaseFlowScreen initialReceptionId={`local:${mockIds[0]}`} />); });
    const screen = () => root.root.findAll(node => node.props.screenKind === 'weighing')[0];
    expect(screen().props).toMatchObject({ selectedVariety: 'Papa guardada', summary: { sackCountDisplay: '1', totalWeightDisplay: '12 kg' } });
    expect(screen().props.notice).toContain('almacenamiento cifrado');
    expect(loadReceptionCatalogs).not.toHaveBeenCalled(); expect(getReception).not.toHaveBeenCalled(); expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => { screen().props.onGrossWeightChange('10'); });
    await act(async () => { screen().props.onAddSack(); });
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ id: mockIds[2], path: `/receptions/@${mockIds[0]}/sacks`, body: expect.objectContaining({ expectedReceptionVersion: 1 }) }));
    expect(mockSendQueued).not.toHaveBeenCalled();
    expect(screen().props.summary).toMatchObject({ sackCountDisplay: '2', totalWeightDisplay: '22 kg' });
    await act(async () => { root.unmount(); });
  });
});

async function prepare(stop:'details'|'weighing'|'settlement'='settlement'){
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<PurchaseFlowScreen/>)});
  const screen=(kind:string)=>root.root.findAll(node=>node.props.screenKind===kind)[0];
  await act(async()=>{screen('details').props.onChange('driverName','Conductor');screen('details').props.onSelectProvider()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar proveedor')[0].props.onSelect({id:'provider-id'})});
  await act(async()=>{screen('details').props.onSelectVarieties()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar variedades')[0].props.onSelect({id:'variety-id'})});
  if(stop==='details')return root;
  await act(async()=>{screen('details').props.onContinue();await Promise.resolve()});
  await act(async()=>{screen('weighing').props.onGrossWeightChange('100');screen('weighing').props.onSelectVariety()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Seleccionar variedad')[0].props.onSelect({id:'variety-id'})});
  if(stop==='weighing')return root;
  await act(async()=>{screen('weighing').props.onAddSack();await Promise.resolve()});
  await act(async()=>{screen('weighing').props.onContinue()});
  await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Cerrar pesaje')[0].props.onConfirm();await Promise.resolve()});
  await act(async()=>{screen('settlement').props.onChangeLot(screen('settlement').props.lots[0].key,'unitPrice','2.50')});
  await act(async()=>{screen('settlement').props.onSubmit()});
  return root;
}
async function confirm(root:ReactTestRenderer){await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Liquidar compra')[0].props.onConfirm();await Promise.resolve()})}

it('stores the settlement before sending and queries the confirmed detail',async()=>{
  const root=await prepare();await confirm(root);
  expect(mockEnqueue).toHaveBeenCalledWith({id:mockIds[3],method:'POST',path:'/purchases/receptions/reception-id/settlement',type:'purchase.settle',body:{advancesCents:0,clientOperationId:mockIds[3],discountsCents:0,expectedReceptionVersion:2,installments:[],paymentMode:'cash',lots:[{varietyId:'variety-id',qualityId:null,priceBasis:'kilogram',unitPriceCents:250}]}});
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[0]);
  expect(getPurchaseSettlement).toHaveBeenCalledWith('test-token','reception-id');expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='confirmation')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('keeps the settlement form and does not send when storage fails',async()=>{
  const root=await prepare();mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));await confirm(root);
  expect(mockSendQueued).toHaveBeenCalledTimes(3);expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='settlement')[0].props.errorMessage).toBe('Storage full');
  await act(async()=>{root.unmount()});
});
it('opens recovery for a saved pending settlement without announcing success',async()=>{
  const root=await prepare();mockSendQueued.mockResolvedValueOnce({id:'purchase-operation',status:'pending'});await confirm(root);
  expect(mockReplace).toHaveBeenCalledWith('/sync-queue');expect(getPurchaseSettlement).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='confirmation')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});
it('keeps the purchase confirmed while retrying only its failed detail lookup',async()=>{
  const root=await prepare();jest.mocked(getPurchaseSettlement).mockRejectedValueOnce(new Error('Detail lookup failed'));await confirm(root);
  expect(root.root.findAll(node=>node.props.title==='Compra confirmada')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.screenKind==='settlement')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta de liquidación')[0].props.onAction();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledTimes(4);expect(mockSendQueued).toHaveBeenCalledTimes(4);expect(getPurchaseSettlement).toHaveBeenCalledTimes(2);
  expect(root.root.findAll(node=>node.props.screenKind==='confirmation')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('keeps offline weighing, closure and settlement dependent on the local reception identity',async()=>{
  mockSendQueued.mockResolvedValueOnce({id:mockIds[0],status:'pending'});
  const root=await prepare();await confirm(root);
  expect(mockEnqueue.mock.calls.map(call=>({id:call[0].id,type:call[0].type,path:call[0].path}))).toEqual([
    {id:mockIds[0],type:'reception.create',path:'/receptions'},
    {id:mockIds[1],type:'reception.sack-add',path:`/receptions/@${mockIds[0]}/sacks`},
    {id:mockIds[2],type:'reception.close',path:`/receptions/@${mockIds[0]}/close-weighing`},
    {id:mockIds[3],type:'purchase.settle',path:`/purchases/receptions/@${mockIds[0]}/settlement`},
  ]);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);expect(getPurchaseSettlement).not.toHaveBeenCalled();
  expect(mockReplace).toHaveBeenCalledWith('/sync-queue');
  expect(root.root.findAll(node=>node.props.screenKind==='confirmation')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('keeps reception details editable without sending when initial storage fails',async()=>{
  const root=await prepare('details');mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='details')[0].props.onContinue();await Promise.resolve()});
  expect(mockSendQueued).not.toHaveBeenCalled();expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='details')[0].props).toMatchObject({errorMessage:'Storage full',isSubmitting:false});
  await act(async()=>{root.unmount()});
});
it('keeps an unsaved sack in the form and releases the busy state',async()=>{
  const root=await prepare('weighing');mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onAddSack();await Promise.resolve()});
  expect(mockSendQueued).toHaveBeenCalledTimes(1);expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='weighing')[0].props).toMatchObject({errorMessage:'Storage full',isSubmitting:false,currentGrossWeight:'100',entries:[]});
  await act(async()=>{root.unmount()});
});
it('does not close weighing when its durable write fails',async()=>{
  const root=await prepare('weighing');
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onAddSack();await Promise.resolve()});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onContinue()});
  mockEnqueue.mockRejectedValueOnce(new Error('Closure storage failed'));
  await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Cerrar pesaje')[0].props.onConfirm();await Promise.resolve()});
  expect(mockSendQueued).toHaveBeenCalledTimes(2);expect(mockReplace).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.screenKind==='settlement')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.screenKind==='weighing')[0].props).toMatchObject({errorMessage:'Closure storage failed',isSubmitting:false});
  await act(async()=>{root.unmount()});
});
it('stores a sack correction with its original path and version before sending',async()=>{
  const root=await prepare('weighing');
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onAddSack();await Promise.resolve()});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onEditEntry({id:'sack-id'})});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onGrossWeightChange('110')});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onAddSack();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenLastCalledWith({id:mockIds[2],method:'PATCH',path:'/receptions/reception-id/sacks/sack-id',type:'reception.sack-correct',sackCharacteristics:{qualityId:null,qualityName:null,originId:null,originName:null},body:{clientOperationId:mockIds[2],expectedReceptionVersion:1,grossWeightKg:'110',tareKg:'0',varietyId:'variety-id',qualityId:null,originId:null}});
  expect(mockEnqueue.mock.invocationCallOrder[2]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[2]);
  await act(async()=>{root.unmount()});
});

it('keeps closure and settlement queued behind an uncertain sack on a central reception',async()=>{
  const root=await prepare('weighing');mockSendQueued.mockResolvedValueOnce({id:mockIds[1],status:'pending'});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onAddSack();await Promise.resolve()});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='weighing')[0].props.onContinue()});
  await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Cerrar pesaje')[0].props.onConfirm();await Promise.resolve()});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='settlement')[0].props.onChangeLot(root.root.findAll(node=>node.props.screenKind==='settlement')[0].props.lots[0].key,'unitPrice','2.50')});
  await act(async()=>{root.root.findAll(node=>node.props.screenKind==='settlement')[0].props.onSubmit()});
  await confirm(root);
  expect(mockEnqueue.mock.calls.slice(1).map(call=>({type:call[0].type,version:call[0].body.expectedReceptionVersion}))).toEqual([{type:'reception.sack-add',version:0},{type:'reception.close',version:1},{type:'purchase.settle',version:2}]);
  expect(mockSendQueued).toHaveBeenCalledTimes(2);
  expect(mockReplace).toHaveBeenCalledWith('/sync-queue');expect(getPurchaseSettlement).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});

it('uses the opening date for a new reception after midnight and preserves a date already entered', async () => {
  jest.useFakeTimers({ now: new Date(2030, 8, 30, 23, 55), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
  let first: ReactTestRenderer | undefined;
  let second: ReactTestRenderer | undefined;
  try {
    await act(async () => { first = create(<PurchaseFlowScreen />); });
    const details = () => first!.root.findAll(node => node.props.screenKind === 'details')[0];
    expect(details().props.values.date).toBe('2030-09-30');
    await act(async () => { details().props.onChange('date', '2030-09-29'); });
    jest.setSystemTime(new Date(2030, 9, 1, 0, 5));
    await act(async () => { first!.update(<PurchaseFlowScreen />); });
    expect(details().props.values.date).toBe('2030-09-29');
    clearInitialPurchaseDraft(); // A deliberately fresh form, without a prior editing copy.
    await act(async () => { second = create(<PurchaseFlowScreen />); });
    expect(second!.root.findAll(node => node.props.screenKind === 'details')[0].props.values.date).toBe('2030-10-01');
    expect(mockEnqueue).not.toHaveBeenCalled();
  } finally {
    await act(async () => { first?.unmount(); second?.unmount(); });
    jest.useRealTimers();
  }
});
