import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {SalesHistoryScreen} from '@/features/sales/screens/sales-history-screen';
import {getSale, listSales} from '@/services/api/sales-api';
import type {Sale} from '@/domain/sales/sale';
import {shareReceipt} from '@/services/receipts/receipt-sharing';
import {AccountPaymentDialog} from '@/features/history/account-payment-dialog';
import {usePreventRemove} from 'expo-router/react-navigation';
import { barButton, withChrome } from '../shared/with-chrome';

const mockEnqueue=jest.fn();
const mockSendQueued=jest.fn();
const mockPush=jest.fn();
const mockBack=jest.fn();const mockDispatch=jest.fn();
let mockSession:{accessToken:string}|null={accessToken:'test-token'};
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({enqueue:mockEnqueue,sendQueued:mockSendQueued})}));
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:mockSession})}));
jest.mock('expo-router',()=>({useRouter:()=>({push:mockPush,back:mockBack,canGoBack:()=>true}),useNavigation:()=>({dispatch:mockDispatch})}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:jest.fn()}));
jest.mock('@/services/api/sales-api',()=>({listSales:jest.fn(),getSale:jest.fn()}));
jest.mock('@/services/api/history-api',()=>({salesHistorySummary:jest.fn(async()=>({balanceCents:'0',counts:{all:1,debt:0,paid:1,voided:0},paidCents:'2500',totalCents:'2500'}))}));
jest.mock('@/services/receipts/receipt-sharing',()=>({shareReceipt:jest.fn()}));
jest.mock('@/features/history/account-payment-dialog',()=>({AccountPaymentDialog:()=>null}));
jest.mock('@/domain/reception/reception',()=>({...jest.requireActual('@/domain/reception/reception'),createOperationId:()=> 'stable-operation'}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');
  const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,ConfirmationDialog:control,EmptyState:control,FeedbackState:control,FormField:control,LoadingState:control,MetricTile:control,ScreenHeader:control};
});

// CL-ST32: a card opens its detail with ✎ (Editar venta), no longer with «Ver detalle».
// One entry per card (a Pressable shows up as several nested nodes with the same label).
const editButtons=(root:ReactTestRenderer)=>{const seen=new Set<unknown>();return root.root.findAll(node=>String(node.props.accessibilityLabel??'').startsWith('Editar venta de')&&typeof node.props.onPress==='function').filter(node=>{if(seen.has(node.props.onPress))return false;seen.add(node.props.onPress);return true;});};

beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();
  mockSession={accessToken:'test-token'};
  mockEnqueue.mockResolvedValue({id:'stable-operation',status:'pending'});
  mockSendQueued.mockResolvedValue({id:'stable-operation',status:'confirmed',centralReference:'central-sale'});
  const sale:Sale={id:'sale-id',buyerId:'buyer-id',version:3,state:'confirmed',destinationDepartment:'Lima',grossAmountCents:'2500',freightAmountCents:'0',discountsCents:'0',totalAmountCents:'2500',paymentMode:'cash',createdAt:'2026-10-04T00:00:00Z'};
  jest.mocked(listSales).mockResolvedValue({items:[sale],total:1} as Awaited<ReturnType<typeof listSales>>);
  jest.mocked(getSale).mockResolvedValue({sale,lines:[]} as Awaited<ReturnType<typeof getSale>>);
});

async function startVoid() {
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>{await editButtons(root)[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Motivo')[0].props.onChangeText('Error de registro')});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Anular venta')[0].props.onPress()});
  return root;
}

it('distinguishes frozen characteristics when reading two lines of the same variety before a return',async()=>{
  const previous=await getSale('test-token','sale-id');
  const line={varietyId:'variety-id',lotId:null,lotVersion:null,sacks:1,weightKg:'10.000',priceBasis:'kilogram' as const,unitPriceCents:'250',subtotalCents:'2500',originId:null,originName:null};
  jest.mocked(getSale).mockResolvedValue({...previous,lines:[{...line,id:'a',qualityId:'quality-a',qualityName:'Primera registrada'},{...line,id:'b',qualityId:'quality-b',qualityName:'Otra calidad registrada'}]});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>));});await act(async()=>editButtons(root)[0].props.onPress());
  const visible=JSON.stringify(root.toJSON());expect(visible).toContain('Primera registrada');expect(visible).toContain('Otra calidad registrada');expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>root.unmount());
});

async function confirm(root:ReactTestRenderer) {
  await act(async()=>{
    root.root.findAll(node=>node.props.confirmLabel==='Anular venta')[0].props.onConfirm();
    await Promise.resolve();
  });
}

it('saves the sale void before sending and refreshes only after central confirmation',async()=>{
  const root=await startVoid();
  await confirm(root);
  expect(mockEnqueue).toHaveBeenCalledWith({id:'stable-operation',type:'sale.void',method:'POST',path:'/sales/sale-id/void',body:{clientOperationId:'stable-operation',expectedSaleVersion:3,reason:'Error de registro'}});
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(mockSendQueued.mock.invocationCallOrder[0]);
  expect(mockSendQueued).toHaveBeenCalledWith('stable-operation');
  expect(mockPush).not.toHaveBeenCalled();
  expect(getSale).toHaveBeenCalledTimes(2);
  expect(root.root.findAll(node=>node.props.message==='Venta anulada. Se conservaron los movimientos compensatorios.')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('keeps the screen and does not send when saving the operation fails',async()=>{
  mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));
  const root=await startVoid();
  await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(root.root.findAll(node=>node.props.message==='Storage full')).not.toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('opens recovery instead of announcing success for an uncertain saved operation',async()=>{
  mockSendQueued.mockResolvedValueOnce({id:'stable-operation',status:'pending'});
  const root=await startVoid();
  await confirm(root);
  expect(mockPush).toHaveBeenCalledWith('/sync-queue');
  expect(getSale).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).toHaveLength(0);
  await act(async()=>{root.unmount()});
});

it('keeps the confirmed return reference available for its receipt',async()=>{
  const original=await getSale('test-token','sale-id');
  jest.mocked(getSale).mockResolvedValue({...original,lines:[{id:'line-id',varietyId:'variety-id',lotId:'lot-id',sacks:1,weightKg:'10.000',priceBasis:'kilogram',unitPriceCents:'250',subtotalCents:'2500',lotVersion:1}]});
  jest.mocked(getSale).mockClear();
  mockSendQueued.mockResolvedValueOnce({id:'stable-operation',status:'confirmed',centralReference:'confirmed-return'});
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>{await editButtons(root)[0].props.onPress()});
  await act(async()=>{
    for(const [label,value] of [['Motivo','Devolución comercial acordada'],['Sacos devueltos','1'],['Peso devuelto','10'],['Importe bruto autorizado (S/)','25']]) {
      root.root.findAll(node=>node.props.label===label)[0].props.onChangeText(value);
    }
  });
  await act(async()=>{root.root.findAll(node=>node.props.label==='Confirmar devolución comercial')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.confirmLabel==='Confirmar devolución')[0].props.onConfirm();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({type:'sale.return',path:'/sales/sale-id/commercial-returns',body:expect.objectContaining({clientOperationId:'stable-operation',lines:[{saleLineId:'line-id',sacks:1,weightKg:'10',authorizedGrossCents:2500}]})}));
  expect(root.root.findAll(node=>node.props.label==='Compartir comprobante')).not.toHaveLength(0);
  jest.mocked(shareReceipt).mockResolvedValueOnce('Comprobante compartido');
  await act(async()=>{root.root.findAll(node=>node.props.label==='Compartir comprobante')[0].props.onPress()});
  expect(shareReceipt).toHaveBeenCalledWith('sale-returns','confirmed-return','test-token',expect.any(Function));
  expect(jest.mocked(shareReceipt).mock.calls[0][3]!()).toBe(true);
  expect(mockPush).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
  expect(jest.mocked(shareReceipt).mock.calls[0][3]!()).toBe(false);
});

it('paginates the central filtered result and does not reset criteria when advancing',async()=>{
  const detail=await getSale('test-token','sale-id');
  jest.mocked(listSales).mockResolvedValueOnce({items:Array.from({length:20},(_,index)=>({...detail.sale,id:`sale-${index}`})),limit:20,offset:0,total:25});
  jest.mocked(listSales).mockResolvedValueOnce({items:Array.from({length:5},(_,index)=>({...detail.sale,id:`page-two-${index}`})),limit:20,offset:20,total:25});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>{await root.root.findAll(node=>node.props.label==='Página siguiente')[0].props.onPress();await Promise.resolve()});
  expect(listSales).toHaveBeenLastCalledWith('test-token',{limit:20,offset:20});
  await act(async()=>{root.unmount()});
});
// CL-ST32: the date is picked in the calendar, so an invalid date cannot be typed.
it('filters the list by the day picked in the calendar and clears it',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>{root.root.findAll(node=>node.props.accessibilityLabel==='Fecha: todas'&&typeof node.props.onPress==='function')[0].props.onPress()});
  await act(async()=>{root.root.findAll(node=>node.props.title==='Fecha de las ventas'&&typeof node.props.onPick==='function')[0].props.onPick('2026-11-07')});
  expect(listSales).toHaveBeenLastCalledWith('test-token',expect.objectContaining({from:'2026-11-07',to:'2026-11-07',offset:0}));
  await act(async()=>{root.root.findAll(node=>node.props.accessibilityLabel==='Quitar fecha'&&typeof node.props.onPress==='function')[0].props.onPress()});
  expect(listSales).toHaveBeenLastCalledWith('test-token',expect.objectContaining({from:undefined,to:undefined}));
  await act(async()=>root.unmount());
});
it('does not send from a closed workspace after the queue finishes conserving the operation',async()=>{
  let finish!:(value:{id:string;status:string})=>void;
  mockEnqueue.mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
  const root=await startVoid();await confirm(root);
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.editable).toBe(false);
  expect(barButton(root,'Volver al historial').props.disabled).toBe(true);
  await act(async()=>root.unmount());await act(async()=>finish({id:'stable-operation',status:'pending'}));
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).not.toHaveBeenCalled();expect(mockPush).not.toHaveBeenCalled();
});
it.each(['pending','confirmed'])('does not navigate or publish an old %s central outcome in a new session',async status=>{
  let finish!:(value:{id:string;status:string})=>void;
  mockSendQueued.mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
  const root=await startVoid();await confirm(root);
  mockSession={accessToken:'next-token'};await act(async()=>root.update(<SalesHistoryScreen allowReturns/>));
  expect(listSales).toHaveBeenLastCalledWith('next-token',{limit:20,offset:0});
  await act(async()=>finish({id:'stable-operation',status}));
  expect(mockPush).not.toHaveBeenCalled();expect(getSale).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Motivo')).toHaveLength(0);
  await act(async()=>root.unmount());
});
it('clears edited filters and ignores detail responses from the previous session',async()=>{
  let finish!:(value:Awaited<ReturnType<typeof getSale>>)=>void;
  const previous=await getSale('test-token','sale-id');jest.mocked(getSale).mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>root.root.findAll(node=>node.props.label==='Buscar ventas')[0].props.onChangeText('Comprador anterior'));
  await act(async()=>{editButtons(root)[0].props.onPress();});
  mockSession={accessToken:'next-token'};await act(async()=>root.update(<SalesHistoryScreen allowReturns/>));
  await act(async()=>finish(previous));
  expect(root.root.findAll(node=>node.props.title==='Detalle y devoluciones')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Buscar ventas')[0].props.value).toBe('');
  mockSession=null;await act(async()=>root.update(<SalesHistoryScreen allowReturns/>));expect(root.toJSON()).toBeNull();
  await act(async()=>root.unmount());
});
it('keeps a dirty detail on cancel and discards it before opening a different sale',async()=>{
  const previous=await getSale('test-token','sale-id');
  const other={...previous,sale:{...previous.sale,id:'other-sale',buyerName:'Otra contraparte'}};
  jest.mocked(listSales).mockResolvedValue({items:[previous.sale,other.sale],total:2,limit:20,offset:0});
  jest.mocked(getSale).mockImplementation(async(_token,id)=>id==='other-sale'?other:previous);
  const root=await startVoid();
  await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Anular venta')[0].props.onCancel());
  await act(async()=>root.root.findAll(node=>node.props.label==='Ajuste de flete (S/)')[0].props.onChangeText('12.50'));
  await act(async()=>barButton(root,'Volver al historial').props.onPress());
  const exit=()=>root.root.findAll(node=>node.props.confirmLabel==='Descartar edición')[0];
  expect(exit().props.visible).toBe(true);expect(mockBack).not.toHaveBeenCalled();
  await act(async()=>exit().props.onCancel());
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.value).toBe('Error de registro');
  expect(root.root.findAll(node=>node.props.label==='Ajuste de flete (S/)')[0].props.value).toBe('12.50');
  await act(async()=>barButton(root,'Volver al historial').props.onPress());
  await act(async()=>exit().props.onConfirm());
  await act(async()=>editButtons(root)[1].props.onPress());
  expect(getSale).toHaveBeenLastCalledWith('test-token','other-sale');
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.value).toBe('');
  expect(root.root.findAll(node=>node.props.label==='Ajuste de flete (S/)')[0].props.value).toBe('0');
  expect(mockEnqueue).not.toHaveBeenCalled();expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});
it('replays the original route removal only after confirming draft discard',async()=>{
  const root=await startVoid();await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Anular venta')[0].props.onCancel());
  const hook=jest.mocked(usePreventRemove).mock.calls.at(-1)!;
  expect(hook[0]).toBe(true);
  const action={type:'GO_BACK',source:'history-route'};
  await act(async()=>hook[1]({data:{action}}));
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Descartar edición')[0].props.onConfirm());
  expect(mockDispatch).toHaveBeenCalledWith(action);expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});
it('removes the unsaved draft after successful conservation while keeping the original queue payload',async()=>{
  let finish!:(value:{id:string;status:string})=>void;
  mockSendQueued.mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
  const root=await startVoid();await confirm(root);
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.value).toBe('');
  expect(mockEnqueue.mock.calls[0][0].body.reason).toBe('Error de registro');
  expect(jest.mocked(usePreventRemove).mock.calls.at(-1)![0]).toBe(true);
  await act(async()=>jest.mocked(usePreventRemove).mock.calls.at(-1)![1]({data:{action:{type:'GO_BACK'}}}));
  expect(root.root.findAll(node=>node.props.confirmLabel==='Descartar edición')[0].props.visible).toBe(false);
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async()=>finish({id:'stable-operation',status:'confirmed'}));
  expect(jest.mocked(usePreventRemove).mock.calls.at(-1)![0]).toBe(false);
  await act(async()=>barButton(root,'Volver al historial').props.onPress());
  expect(root.root.findAll(node=>node.props.label==='Motivo')).toHaveLength(0);
  await act(async()=>root.unmount());
});
it('protects a line-only edit and stops warning when its original zero value is restored',async()=>{
  const previous=await getSale('test-token','sale-id');
  jest.mocked(getSale).mockResolvedValue({...previous,lines:[{id:'line-id',varietyId:'variety-id',sacks:1,weightKg:'10.000',priceBasis:'kilogram',unitPriceCents:'250',subtotalCents:'2500'}]} as Awaited<ReturnType<typeof getSale>>);
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
  await act(async()=>editButtons(root)[0].props.onPress());
  await act(async()=>root.root.findAll(node=>node.props.label==='Peso devuelto')[0].props.onChangeText('2.125'));
  expect(jest.mocked(usePreventRemove).mock.calls.at(-1)![0]).toBe(true);
  await act(async()=>barButton(root,'Volver al historial').props.onPress());
  await act(async()=>root.root.findAll(node=>node.props.confirmLabel==='Descartar edición')[0].props.onCancel());
  expect(root.root.findAll(node=>node.props.label==='Peso devuelto')[0].props.value).toBe('2.125');
  await act(async()=>root.root.findAll(node=>node.props.label==='Peso devuelto')[0].props.onChangeText('0'));
  expect(jest.mocked(usePreventRemove).mock.calls.at(-1)![0]).toBe(false);
  expect(mockEnqueue).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('keeps central confirmation and retries only the detail read after refresh failure',async()=>{
  const original=await getSale('test-token','sale-id');const root=await startVoid();
  jest.mocked(getSale).mockRejectedValueOnce(new Error('Consulta temporalmente no disponible'));
  await confirm(root);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Anular venta')[0].props.disabled).toBe(true);
  expect(root.root.findAll(node=>node.props.label==='Motivo')[0].props.editable).toBe(false);
  jest.mocked(getSale).mockResolvedValueOnce({...original,sale:{...original.sale,state:'voided',version:4}});
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta del detalle')[0].props.onAction());
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='Detalle pendiente de actualización')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Versión')[0].props.value).toBe('4');
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).not.toHaveLength(0);
  await act(async()=>root.unmount());
});
it('ignores a late confirmed-detail retry after returning to the history',async()=>{
  const original=await getSale('test-token','sale-id');const root=await startVoid();
  jest.mocked(getSale).mockRejectedValueOnce(new Error('Detail unavailable'));await confirm(root);
  let finish!:(value:Awaited<ReturnType<typeof getSale>>)=>void;
  jest.mocked(getSale).mockImplementationOnce(()=>new Promise(done=>{finish=done;}));
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta del detalle')[0].props.onAction());
  await act(async()=>barButton(root,'Volver al historial').props.onPress());
  await act(async()=>finish({...original,sale:{...original.sale,state:'voided',version:4}}));
  expect(root.root.findAll(node=>node.props.title==='Detalle y devoluciones')).toHaveLength(0);
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());
});

it.each(['success','failure'])('ignores a late %s detail refresh after changing the session',async outcome=>{
  const original=await getSale('test-token','sale-id');const root=await startVoid();
  jest.mocked(getSale).mockRejectedValueOnce(new Error('Detail unavailable'));await confirm(root);
  let finish!:(value:Awaited<ReturnType<typeof getSale>>)=>void;
  let fail!:(cause:Error)=>void;
  jest.mocked(getSale).mockImplementationOnce(()=>new Promise((resolve,reject)=>{finish=resolve;fail=reject;}));
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar consulta del detalle')[0].props.onAction());
  mockSession={accessToken:'next-token'};
  await act(async()=>root.update(<SalesHistoryScreen allowReturns/>));
  await act(async()=>{
    if(outcome==='success')finish({...original,sale:{...original.sale,state:'voided',version:4}});
    else fail(new Error('Private previous-session detail failure'));
  });
  expect(listSales).toHaveBeenLastCalledWith('next-token',{limit:20,offset:0});
  expect(root.root.findAll(node=>node.props.title==='Detalle y devoluciones')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.title==='Operación confirmada')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.message?.includes?.('Private previous-session detail failure'))).toHaveLength(0);
  expect(mockEnqueue).toHaveBeenCalledTimes(1);expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(mockPush).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});

it('hides commercial returns by default and keeps the sale void for the Mayorista (CL-FM14)',async()=>{
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(withChrome(<SalesHistoryScreen/>))});
  await act(async()=>{await editButtons(root)[0].props.onPress()});
  expect(root.root.findAll(node=>node.props.title==='Detalle de la venta')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Confirmar devolución comercial')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Ajuste de flete (S/)')).toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Anular venta')).not.toHaveLength(0);
  await act(async()=>root.unmount());
});

// Spec 011, CL-ST32: the buttons of a sale card in «Ver ventas».
describe('buttons of the sale card (CL-ST32)',()=>{
  const byLabel=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>String(node.props.accessibilityLabel??'').startsWith(label)&&typeof node.props.onPress==='function')[0];
  it('shares the sale ticket and opens «Cobrar / Liquidar» on this screen',async()=>{
    const {sale}=await getSale('test-token','sale-id');
    jest.mocked(listSales).mockResolvedValue({items:[{...sale,paymentState:'debt',balanceCents:'1000',paidCents:'0'}],total:1,limit:20,offset:0} as never);
    let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
    await act(async()=>{byLabel(root,'Ver ticket de')!.props.onPress();await Promise.resolve();});
    expect(shareReceipt).toHaveBeenCalledWith('sales',sale.id,'test-token',expect.any(Function));
    await act(async()=>{byLabel(root,'Cobrar a')!.props.onPress();});
    expect(root.root.findAllByType(AccountPaymentDialog)).toHaveLength(1);
    expect(mockPush).not.toHaveBeenCalledWith(expect.objectContaining({pathname:'/collections'}));
    await act(async()=>root.unmount());
  });
  it('opens the detail from the trash can already at the reason of the void',async()=>{
    const {sale}=await getSale('test-token','sale-id');
    let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<SalesHistoryScreen allowReturns/>))});
    await act(async()=>{byLabel(root,'Anular venta de')!.props.onPress();await Promise.resolve();await Promise.resolve();});
    expect(getSale).toHaveBeenLastCalledWith('test-token',sale.id);
    expect(root.root.findAll(node=>node.props.label==='Motivo')).not.toHaveLength(0);
    await act(async()=>root.unmount());
  });
});
