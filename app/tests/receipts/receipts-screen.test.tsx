import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import type {ReceiptHistoryRow} from '@/domain/receipts/receipt';
import {ReceiptsScreen} from '@/features/receipts/screens/receipts-screen';
import {listReceiptHistory} from '@/services/api/receipts-api';
import {downloadReceipt,releaseReceiptUri} from '@/services/receipts/receipt-sharing';
const mockSession={accessToken:'receipt-session',user:{role:'wholesaler'}};
const mockInvalidate=jest.fn();
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:mockSession,invalidateSession:mockInvalidate})}));
jest.mock('expo-router',()=>({useRouter:()=>({back:jest.fn(),canGoBack:()=>true})}));
jest.mock('@/services/api/receipts-api',()=>({listReceiptHistory:jest.fn()}));
jest.mock('@/services/receipts/receipt-sharing',()=>({downloadReceipt:jest.fn(),shareReceipt:jest.fn(),releaseReceiptUri:jest.fn()}));
jest.mock('@/features/receipts/components/receipt-preview',()=>{const react=jest.requireActual('react');return {ReceiptPreview:(props:object)=>react.createElement('test-preview',props)};});
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppButton:control,AppCard:control,AppScreen:control,EmptyState:control,FeedbackState:control,LoadingState:control,ScreenHeader:control};});
const sale:ReceiptHistoryRow={id:'sale',state:'confirmed',amountCents:'1200',occurredOn:'2026-10-12',reference:'sale',counterpartyName:'Comprador QA'};
beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.clearAllMocks();mockSession.accessToken='receipt-session';
  jest.mocked(listReceiptHistory).mockImplementation(async(_token,kind,offset)=>({items:kind==='sales'?[sale]:[],total:kind==='sales'?1:0,limit:20,offset}));
});
const button=(root:ReactTestRenderer,label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
const preview=(root:ReactTestRenderer)=>root.root.findAll(node=>String(node.type)==='test-preview')[0]!;
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(<ReceiptsScreen/>);});return root;}
it('distinguishes failed history and retries the original document action without reloading lists',async()=>{
  jest.mocked(listReceiptHistory).mockRejectedValueOnce(new Error('history unavailable'));
  const root=await open();expect(JSON.stringify(root.toJSON())).not.toContain('Sin ventas');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar historial')[0]!.props.onAction());
  jest.mocked(downloadReceipt).mockRejectedValueOnce(new Error('download failed')).mockResolvedValue({filename:'receipt.pdf',uri:'blob:receipt'});
  await act(async()=>button(root,'Vista previa').props.onPress());expect(JSON.stringify(root.toJSON())).toContain('Documento no disponible');
  const reads=jest.mocked(listReceiptHistory).mock.calls.length;
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar documento')[0]!.props.onAction());
  expect(listReceiptHistory).toHaveBeenCalledTimes(reads);expect(downloadReceipt).toHaveBeenLastCalledWith('sales','sale','receipt-session');expect(preview(root).props.uri).toBe('blob:receipt');
  await act(async()=>preview(root).props.onClose());expect(releaseReceiptUri).toHaveBeenCalledWith('blob:receipt');await act(async()=>root.unmount());
});
it('does not open a late download in another session and releases its web resource',async()=>{
  let resolve!:(file:Awaited<ReturnType<typeof downloadReceipt>>)=>void;
  jest.mocked(downloadReceipt).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const root=await open();await act(async()=>{button(root,'Vista previa').props.onPress();});
  mockSession.accessToken='new-session';await act(async()=>root.update(<ReceiptsScreen/>));
  await act(async()=>resolve({filename:'old.pdf',uri:'blob:old-session'}));
  expect(preview(root).props.uri).toBeNull();expect(releaseReceiptUri).toHaveBeenCalledWith('blob:old-session');await act(async()=>root.unmount());
});
it('allows only one simultaneous download despite repeated presses',async()=>{
  let resolve!:(file:Awaited<ReturnType<typeof downloadReceipt>>)=>void;
  jest.mocked(downloadReceipt).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const root=await open();const press=button(root,'Vista previa').props.onPress;
  await act(async()=>{press();press();});expect(downloadReceipt).toHaveBeenCalledTimes(1);
  await act(async()=>resolve({filename:'one.pdf',uri:'blob:one'}));await act(async()=>root.unmount());expect(releaseReceiptUri).toHaveBeenCalledWith('blob:one');
});

it('recovers documents past the first hundred rows while keeping purchase pagination independent',async()=>{
  jest.mocked(listReceiptHistory).mockImplementation(async(_token,kind,offset)=>({items:kind==='sales'?Array.from({length:offset===100?1:20},(_,index)=>({...sale,id:`s${offset+index}`})):[],total:kind==='sales'?101:0,limit:20,offset}));
  const root=await open();for(let page=0;page<5;page++)await act(async()=>button(root,'Ventas siguientes').props.onPress());
  expect(listReceiptHistory).toHaveBeenCalledWith('receipt-session','sales',100);expect(listReceiptHistory).toHaveBeenLastCalledWith('receipt-session','purchases',0);
  expect(button(root,'Ventas siguientes').props.disabled).toBe(true);expect(button(root,'Ventas anteriores').props.disabled).toBe(false);
  jest.mocked(downloadReceipt).mockResolvedValue({filename:'last.pdf',uri:'blob:last'});await act(async()=>button(root,'Vista previa').props.onPress());
  expect(downloadReceipt).toHaveBeenLastCalledWith('sales','s100','receipt-session');await act(async()=>preview(root).props.onClose());
  expect(button(root,'Ventas siguientes').props.disabled).toBe(true);await act(async()=>root.unmount());
});
