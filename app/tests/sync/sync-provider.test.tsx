import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SyncQueueProvider, useSyncQueue } from '@/features/sync/sync-queue-provider';
import { ApiError, ApiUnavailableError, apiRequest } from '@/services/api/api-client';
import { readEncryptedQueue, writeEncryptedQueue } from '@/services/storage/encrypted-queue-storage';

let mockSession = {accessToken: 'test-token', user: {businessId: 'business-a', userId: 'user-a'}};
jest.mock('@/features/auth/session/session-provider', () => ({
  useSession: () => ({session: mockSession}),
}));
jest.mock('@/services/storage/encrypted-queue-storage', () => ({
  readEncryptedQueue: jest.fn(async () => []),
  writeEncryptedQueue: jest.fn(async () => undefined),
}));
jest.mock('@/services/api/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {super(message);this.status=status;}
  },
  ApiUnavailableError: class ApiUnavailableError extends Error {},
}));
let latest: ReturnType<typeof useSyncQueue>;
function Probe() { const value = useSyncQueue(); useEffect(() => { latest = value; }, [value]); return null; }
function Tree() {return <SyncQueueProvider><Probe /></SyncQueueProvider>;}

beforeEach(() => {
  mockSession = { accessToken: 'test-token', user: { businessId: 'business-a', userId: 'user-a' } };
});

it('stores reception display context locally and sends only the commercial API body', async () => {
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  mockSession = { accessToken: 'test-token', user: { businessId: 'business-context', userId: 'user-context' } };
  jest.mocked(apiRequest).mockRejectedValueOnce(new ApiError('Missing', 404)).mockResolvedValueOnce({ id: 'central-reception' });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<Tree />); });
  const body = { clientOperationId: 'with-context', providerId: 'provider' };
  const receptionContext = { providerName: 'Proveedor QA', vehiclePlate: '', varieties: [{ id: 'variety', name: 'Papa' }] };
  await act(async () => { await latest.enqueue({ id: 'with-context', type: 'reception.create', path: '/receptions', method: 'POST', body, receptionContext }); });
  expect(latest.operations[0].receptionContext).toEqual(receptionContext);
  await act(async () => { await latest.sendQueued('with-context'); });
  expect(apiRequest).toHaveBeenLastCalledWith('/receptions', { body, method: 'POST', token: 'test-token' });
  expect(latest.operations[0].status).toBe('confirmed');
  await act(async () => { root.unmount(); });
});

it('keeps a late result in the initiating identity when the session changes', async () => {
  jest.useRealTimers();
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  let root!: ReactTestRenderer;
  let release!: (value: {resourceId: string}) => void;
  jest.mocked(apiRequest).mockImplementation(() => new Promise((resolve) => {release = resolve;}));
  await act(async () => {root = create(<Tree />);});
  await act(async () => {await latest.enqueue({id: 'operation-a', body: {clientOperationId: 'operation-a'}, method: 'POST', path: '/sales', type: 'sale.create'});});
  let sending!: Promise<void>;
  await act(async () => {sending = latest.synchronize();await Promise.resolve();});
  mockSession = {accessToken: 'test-token-b', user: {businessId: 'business-b', userId: 'user-b'}};
  await act(async () => {root.update(<Tree />);});
  expect(latest.operations).toEqual([]);
  await act(async () => {release({resourceId: 'central-a'});await sending;});
  expect(latest.operations).toEqual([]);
  expect(writeEncryptedQueue).toHaveBeenLastCalledWith(
    {businessId: 'business-a', userId: 'user-a'},
    [expect.objectContaining({id: 'operation-a', status: 'confirmed', centralReference: 'central-a'})],
  );
  await act(async () => {root.unmount();});
});

it('preserves both pending operations when callers enqueue concurrently', async () => {
  mockSession = {accessToken: 'test-token', user: {businessId: 'business-c', userId: 'user-c'}};
  let root!: ReactTestRenderer;
  await act(async () => {root = create(<Tree />);});
  await act(async () => {
    await Promise.all(['one', 'two'].map((id) => latest.enqueue({id, body: {clientOperationId: id}, method: 'POST', path: '/sales', type: 'sale.create'})));
  });
  expect(latest.operations.map((operation) => operation.id)).toEqual(['one', 'two']);
  expect(writeEncryptedQueue).toHaveBeenLastCalledWith(
    {businessId: 'business-c', userId: 'user-c'},
    [expect.objectContaining({id: 'one'}), expect.objectContaining({id: 'two'})],
  );
  await act(async () => {root.unmount();});
});

it('does not publish a pending operation when encrypted storage rejects its write', async () => {
  let root!: ReactTestRenderer;
  await act(async () => {root = create(<Tree />);});
  jest.mocked(writeEncryptedQueue).mockRejectedValueOnce(new Error('disk unavailable'));
  await act(async () => {
    await expect(latest.enqueue({id: 'failed-write', body: {}, method: 'POST', path: '/sales', type: 'sale.create'})).rejects.toThrow('disk unavailable');
  });
  expect(latest.operations).toEqual([]);
  await act(async () => {await latest.enqueue({id: 'retry-write', body: {}, method: 'POST', path: '/sales', type: 'sale.create'});});
  expect(latest.operations.map((item) => item.id)).toEqual(['retry-write']);
  await act(async () => {root.unmount();});
});
it('prevents replacing an unreadable queue with new pending operations', async () => {
  let root!: ReactTestRenderer;
  jest.mocked(readEncryptedQueue).mockRejectedValueOnce(new Error('cannot decrypt'));
  await act(async () => {root = create(<Tree />);});
  const writesBefore = jest.mocked(writeEncryptedQueue).mock.calls.length;
  await act(async () => {
    await expect(latest.enqueue({body: {}, method: 'POST', path: '/sales', type: 'sale.create'})).rejects.toThrow('No se pudo recuperar la cola cifrada');
  });
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore);
  await act(async () => {root.unmount();});
});
it('recovers an unreadable queue through a read retry without deleting its contents', async () => {
  let root!: ReactTestRenderer;
  jest.mocked(readEncryptedQueue).mockRejectedValueOnce(new Error('temporary read failure'));
  await act(async () => {root=create(<Tree />);});
  expect(latest.queueError).not.toBeNull();
  const writesBefore=jest.mocked(writeEncryptedQueue).mock.calls.length;
  jest.mocked(readEncryptedQueue).mockResolvedValueOnce([{
    id:'retained',businessId:mockSession.user.businessId,userId:mockSession.user.userId,
    type:'sale.return',path:'/sales/test/commercial-returns',method:'POST',body:{clientOperationId:'retained'},
    status:'syncing',attempts:1,createdAt:'2026-10-04T00:00:00Z',updatedAt:'2026-10-04T00:00:00Z',
  }]);
  await act(async () => {await latest.reloadQueue();});
  expect(latest.queueError).toBeNull();
  expect(latest.isLoadingQueue).toBe(false);
  expect(latest.operations).toEqual([expect.objectContaining({id:'retained',status:'pending',attempts:1})]);
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore);
  await act(async () => {root.unmount();});
});

it.each([['sale.return','sale-return'],['sale.void','sale-void'],['purchase.void','purchase-void'],['reception.void','reception-void'],['reception.sack-void','reception-sack-void']])('recovers %s without resubmitting its commercial request', async (type,queryType) => {
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset().mockResolvedValue({resourceId:'central-result'});
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{await latest.enqueue({id:'lost-response',type,method:'POST',path:'/sales/original/action',body:{clientOperationId:'lost-response'}})});
  await act(async()=>{await latest.synchronize()});
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith(`/operations/lost-response?type=${queryType}`,{token:mockSession.accessToken});
  expect(latest.operations).toEqual([expect.objectContaining({id:'lost-response',status:'confirmed',centralReference:'central-result'})]);
  expect(latest.pendingCount).toBe(0);
  await act(async()=>{root.unmount()});
});
it('confirms a centrally applied return instead of discarding it locally', async()=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset().mockResolvedValue({resourceId:'central-return'});
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{await latest.enqueue({id:'already-applied',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'already-applied'}})});
  await act(async()=>{await latest.discard('already-applied','No response received')});
  expect(latest.operations[0]).toMatchObject({status:'confirmed',centralReference:'central-return'});
  expect(apiRequest).toHaveBeenCalledTimes(1);
  await act(async()=>{root.unmount()});
});

it.each([401,403,500])('preserves the pending return when central lookup fails with HTTP %s', async(status)=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset().mockRejectedValue(new ApiError('Central lookup failed',status));
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{await latest.enqueue({id:'uncertain-return',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'uncertain-return'}})});
  const writesBefore=jest.mocked(writeEncryptedQueue).mock.calls.length;
  await act(async()=>{await expect(latest.synchronize()).rejects.toThrow('Central lookup failed')});
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(latest.operations[0]).toMatchObject({id:'uncertain-return',status:'pending',attempts:0});
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore);
  await act(async()=>{root.unmount()});
});

it('sends the same operation identity only after central lookup reports absence',async()=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset().mockRejectedValueOnce(new ApiError('Not found',404)).mockResolvedValueOnce({saleReturn:{id:'new-return',totalRefundCents:'4500'},lines:[]});
  await act(async()=>{root=create(<Tree />)});
  const body={clientOperationId:'new-operation',reason:'Corrección aprobada'};
  await act(async()=>{await latest.enqueue({id:'new-operation',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body})});
  await act(async()=>{await latest.synchronize()});
  expect(apiRequest).toHaveBeenNthCalledWith(2,'/sales/original/commercial-returns',{body,method:'POST',token:mockSession.accessToken});
  expect(latest.operations[0]).toMatchObject({status:'confirmed',attempts:1,centralReference:'new-return'});
  await act(async()=>{root.unmount()});
});

it.each(['confirmed','discarded'] as const)('does not retry an operation already %s',async(status)=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset();
  jest.mocked(readEncryptedQueue).mockResolvedValueOnce([{
    id:'terminal',businessId:mockSession.user.businessId,userId:mockSession.user.userId,
    type:'sale.return',path:'/sales/original/commercial-returns',method:'POST',body:{clientOperationId:'terminal'},
    status,attempts:1,createdAt:'2026-10-04T00:00:00Z',updatedAt:'2026-10-04T00:00:00Z',
  }]);
  await act(async()=>{root=create(<Tree />)});
  const writesBefore=jest.mocked(writeEncryptedQueue).mock.calls.length;
  await act(async()=>{await latest.retry('terminal')});
  expect(apiRequest).not.toHaveBeenCalled();
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore);
  expect(latest.operations[0].status).toBe(status);
  await act(async()=>{root.unmount()});
});

it('waits for durable storage before sending and returns the backend return reference',async()=>{
  let root!:ReactTestRenderer;
  let finishWrite!:()=>void;
  jest.mocked(apiRequest).mockReset().mockRejectedValueOnce(new ApiError('Not found',404)).mockResolvedValueOnce({saleReturn:{id:'durable-return',totalRefundCents:'4500'},lines:[]});
  await act(async()=>{root=create(<Tree />)});
  jest.mocked(writeEncryptedQueue).mockImplementationOnce(()=>new Promise<void>(resolve=>{finishWrite=resolve}));
  let saving!:ReturnType<typeof latest.enqueue>;
  let sending!:ReturnType<typeof latest.sendQueued>;
  await act(async()=>{
    saving=latest.enqueue({id:'durable',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'durable'}});
    sending=latest.sendQueued('durable');
    await Promise.resolve();
  });
  expect(apiRequest).not.toHaveBeenCalled();
  expect(latest.operations).toEqual([]);
  await act(async()=>{finishWrite();await saving;expect(await sending).toMatchObject({id:'durable',status:'confirmed',centralReference:'durable-return'})});
  expect(jest.mocked(writeEncryptedQueue).mock.calls.slice(-3).map((call)=>call[1][0].status)).toEqual(['pending','syncing','confirmed']);
  await act(async()=>{root.unmount()});
});

it('refuses to send an operation that could not be stored',async()=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset();
  await act(async()=>{root=create(<Tree />)});
  jest.mocked(writeEncryptedQueue).mockRejectedValueOnce(new Error('Storage full'));
  await act(async()=>{
    await expect(latest.enqueue({id:'not-stored',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'not-stored'}})).rejects.toThrow('Storage full');
    await expect(latest.sendQueued('not-stored')).rejects.toThrow('La operación no está guardada');
  });
  expect(apiRequest).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});

it('limits sends to five while still recovering a lost final response',async()=>{
  let root!:ReactTestRenderer;
  jest.mocked(apiRequest).mockReset().mockImplementation(async(path)=>{
    if(path.startsWith('/operations/'))throw new ApiError('Not found',404);
    throw new ApiUnavailableError();
  });
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{await latest.enqueue({id:'five-attempts',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'five-attempts'}})});
  for(let attempt=0;attempt<5;attempt++)await act(async()=>{await latest.retry('five-attempts')});
  expect(latest.operations[0]).toMatchObject({status:'pending',attempts:5});
  await act(async()=>{await latest.retry('five-attempts');await latest.synchronize()});
  expect(jest.mocked(apiRequest).mock.calls.filter(call=>call[0]==='/sales/original/commercial-returns')).toHaveLength(5);
  expect(latest.operations[0]).toMatchObject({status:'pending',attempts:5,message:expect.stringContaining('No hay confirmación central')});
  jest.mocked(apiRequest).mockResolvedValueOnce({resourceId:'fifth-send-confirmed'});
  await act(async()=>{await latest.retry('five-attempts')});
  expect(latest.operations[0]).toMatchObject({status:'confirmed',attempts:5,centralReference:'fifth-send-confirmed'});
  expect(jest.mocked(apiRequest).mock.calls.filter(call=>call[0]==='/sales/original/commercial-returns')).toHaveLength(5);
  await act(async()=>{root.unmount()});
});

it('restores a stored interrupted send and recovers its result after remount',async()=>{
  let root!:ReactTestRenderer;
  let stored: Parameters<typeof writeEncryptedQueue>[1]=[];
  jest.mocked(writeEncryptedQueue).mockImplementation(async(_scope,items)=>{stored=JSON.parse(JSON.stringify(items))});
  jest.mocked(apiRequest).mockReset().mockRejectedValueOnce(new ApiError('Not found',404)).mockResolvedValueOnce({saleReturn:{id:'central-after-restart'},lines:[]});
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{await latest.enqueue({id:'restart-return',type:'sale.return',method:'POST',path:'/sales/original/commercial-returns',body:{clientOperationId:'restart-return'}})});
  // The send marker is durable, but recording the successful response fails.
  jest.mocked(writeEncryptedQueue).mockImplementationOnce(async(_scope,items)=>{stored=JSON.parse(JSON.stringify(items))}).mockRejectedValueOnce(new Error('Interrupted confirmation write'));
  await act(async()=>{await expect(latest.sendQueued('restart-return')).rejects.toThrow('Interrupted confirmation write')});
  expect(stored[0]).toMatchObject({id:'restart-return',status:'syncing',attempts:1});
  await act(async()=>{root.unmount()});
  jest.mocked(readEncryptedQueue).mockResolvedValueOnce(stored);
  jest.mocked(apiRequest).mockReset().mockResolvedValue({resourceId:'central-after-restart'});
  await act(async()=>{root=create(<Tree />)});
  expect(latest.operations[0]).toMatchObject({id:'restart-return',status:'pending',attempts:1,body:{clientOperationId:'restart-return'}});
  await act(async()=>{await latest.synchronize()});
  expect(apiRequest).toHaveBeenCalledTimes(1);
  expect(apiRequest).toHaveBeenCalledWith('/operations/restart-return?type=sale-return',{token:mockSession.accessToken});
  expect(latest.operations[0]).toMatchObject({status:'confirmed',attempts:1,centralReference:'central-after-restart'});
  expect(stored[0]).toMatchObject({status:'confirmed',centralReference:'central-after-restart'});
  jest.mocked(writeEncryptedQueue).mockImplementation(async()=>undefined);
  await act(async()=>{root.unmount()});
});

it('keeps one local operation when two callers save the same identity concurrently',async()=>{
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<Tree />)});
  const writesBefore=jest.mocked(writeEncryptedQueue).mock.calls.length;
  const input={id:'same-identity',type:'sale.create',method:'POST' as const,path:'/sales',body:{clientOperationId:'same-identity',buyerId:'buyer'}};
  await act(async()=>{const saved=await Promise.all([latest.enqueue(input),latest.enqueue(input)]);expect(saved[0]).toEqual(saved[1])});
  expect(latest.operations).toHaveLength(1);
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore+1);
  await act(async()=>{root.unmount()});
});

it('rejects changed content for a stored operation identity without replacing its evidence',async()=>{
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<Tree />)});
  const input={id:'immutable-identity',type:'sale.create',method:'POST' as const,path:'/sales',body:{buyerId:'original-buyer'}};
  await act(async()=>{await latest.enqueue(input)});
  const writesBefore=jest.mocked(writeEncryptedQueue).mock.calls.length;
  await act(async()=>{await expect(latest.enqueue({...input,body:{buyerId:'other-buyer'}})).rejects.toThrow('otros datos')});
  expect(latest.operations).toEqual([expect.objectContaining({id:'immutable-identity',body:{buyerId:'original-buyer'}})]);
  expect(jest.mocked(writeEncryptedQueue).mock.calls).toHaveLength(writesBefore);
  await act(async()=>{root.unmount()});
});

it('synchronizes reception, sacks, closure and purchase in order with central references',async()=>{
  let root!:ReactTestRenderer;
  const ids=[1,2,3,4,5].map(value=>`00000000-0000-4000-8000-${String(value).padStart(12,'0')}`);
  jest.mocked(apiRequest).mockReset().mockImplementation(async(path)=>{
    if(path.startsWith('/operations/'))throw new ApiError('Not found',404);
    return {id:path==='/receptions'?'central-reception':path.endsWith('/settlement')?'central-purchase':'central-sack-or-close'};
  });
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{
    await latest.enqueue({id:ids[0],type:'reception.create',path:'/receptions',method:'POST',body:{clientOperationId:ids[0]}});
    for(const index of [1,2])await latest.enqueue({id:ids[index],type:'reception.sack-add',path:`/receptions/@${ids[0]}/sacks`,method:'POST',body:{clientOperationId:ids[index],expectedReceptionVersion:index-1}});
    await latest.enqueue({id:ids[3],type:'reception.close',path:`/receptions/@${ids[0]}/close-weighing`,method:'POST',body:{clientOperationId:ids[3],expectedReceptionVersion:2}});
    await latest.enqueue({id:ids[4],type:'purchase.settle',path:`/purchases/receptions/@${ids[0]}/settlement`,method:'POST',body:{clientOperationId:ids[4],expectedReceptionVersion:3}});
  });
  await act(async()=>{await latest.synchronize()});
  const sends=jest.mocked(apiRequest).mock.calls.filter(call=>call[1]?.method==='POST');
  expect(sends.map(call=>call[0])).toEqual(['/receptions','/receptions/central-reception/sacks','/receptions/central-reception/sacks','/receptions/central-reception/close-weighing','/purchases/receptions/central-reception/settlement']);
  expect(sends.map(call=>call[1]?.body)).toEqual(ids.map((id,index)=>({clientOperationId:id,...(index?{expectedReceptionVersion:index-1}:{})})));
  expect(latest.operations.map(item=>item.status)).toEqual(Array(5).fill('confirmed'));
  await act(async()=>{root.unmount()});
});

it.each([500,409])('blocks closure and purchase after a sack response HTTP %s while unrelated sales continue',async(status)=>{
  let root!:ReactTestRenderer;
  const parent='00000000-0000-4000-8000-000000000011';
  jest.mocked(apiRequest).mockReset().mockImplementation(async(path)=>{
    if(path.startsWith('/operations/'))throw new ApiError('Not found',404);
    if(path.endsWith('/sacks'))throw new ApiError('Sack outcome requires recovery',status);
    return {id:path==='/receptions'?'central-reception':'independent-sale'};
  });
  await act(async()=>{root=create(<Tree />)});
  await act(async()=>{
    await latest.enqueue({id:parent,type:'reception.create',path:'/receptions',method:'POST',body:{clientOperationId:parent}});
    await latest.enqueue({id:'uncertain-sack',type:'reception.sack-add',path:`/receptions/@${parent}/sacks`,method:'POST',body:{clientOperationId:'uncertain-sack',expectedReceptionVersion:0}});
    await latest.enqueue({id:'dependent-close',type:'reception.close',path:`/receptions/@${parent}/close-weighing`,method:'POST',body:{clientOperationId:'dependent-close',expectedReceptionVersion:1}});
    await latest.enqueue({id:'dependent-purchase',type:'purchase.settle',path:`/purchases/receptions/@${parent}/settlement`,method:'POST',body:{clientOperationId:'dependent-purchase',expectedReceptionVersion:2}});
    await latest.enqueue({id:'independent',type:'sale.create',path:'/sales',method:'POST',body:{clientOperationId:'independent'}});
  });
  await act(async()=>{await latest.synchronize();await latest.retry('dependent-close')});
  expect(jest.mocked(apiRequest).mock.calls.filter(call=>call[1]?.method==='POST').map(call=>call[0])).toEqual(['/receptions','/receptions/central-reception/sacks','/sales']);
  expect(latest.operations.find(item=>item.id==='uncertain-sack')?.status).toBe(status===500?'pending':'review');
  for(const id of ['dependent-close','dependent-purchase'])expect(latest.operations.find(item=>item.id===id)).toMatchObject({status:'pending',attempts:0,message:expect.stringContaining('operación anterior')});
  expect(latest.operations.find(item=>item.id==='independent')?.status).toBe('confirmed');
  jest.mocked(apiRequest).mockResolvedValueOnce({resourceId:'recovered-sack'});
  await act(async()=>{await latest.retry('uncertain-sack');await latest.synchronize()});
  expect(latest.operations.find(item=>item.id==='uncertain-sack')).toMatchObject({status:'confirmed',attempts:1,centralReference:'recovered-sack'});
  for(const id of ['dependent-close','dependent-purchase'])expect(latest.operations.find(item=>item.id===id)).toMatchObject({status:'confirmed',attempts:1});
  expect(jest.mocked(apiRequest).mock.calls.filter(call=>call[1]?.method==='POST').map(call=>call[0])).toEqual(['/receptions','/receptions/central-reception/sacks','/sales','/receptions/central-reception/close-weighing','/purchases/receptions/central-reception/settlement']);
  await act(async()=>{root.unmount()});
});

it.each(['sale.create','inventory.adjustment'])('keeps the retired %s contract for review after confirming central absence, without sending it',async type=>{
  let root!:ReactTestRenderer;jest.mocked(apiRequest).mockReset().mockRejectedValueOnce(new ApiError('Missing',404));
  await act(async()=>{root=create(<Tree/>)});
  const body={clientOperationId:'historic',lines:[{lotId:'lot',expectedLotVersion:1,sacks:30,weightKg:'1500',unitPriceCents:150}]};
  await act(async()=>{await latest.enqueue({id:'historic',type,method:'POST',path:type==='sale.create'?'/sales':'/inventory/lots/lot/adjustments',body})});
  await act(async()=>{await latest.sendQueued('historic')});
  expect(apiRequest).toHaveBeenCalledTimes(1);expect(apiRequest).toHaveBeenCalledWith(expect.stringContaining('/operations/historic?type='),{token:mockSession.accessToken});
  expect(latest.operations[0]).toMatchObject({id:'historic',body,status:'review',attempts:0});expect(latest.operations[0].message).toMatch(/retirado|contrato anterior/);
  await act(async()=>{root.unmount()});
});
it('recovers a previously applied historic sale before inspecting its retired payload',async()=>{
  let root!:ReactTestRenderer;jest.mocked(apiRequest).mockReset().mockResolvedValueOnce({resourceId:'historic-central-sale'});
  await act(async()=>{root=create(<Tree/>)});
  const body={clientOperationId:'historic-applied',lines:[{lotId:'lot',expectedLotVersion:1}]};
  await act(async()=>{await latest.enqueue({id:'historic-applied',type:'sale.create',method:'POST',path:'/sales',body});await latest.sendQueued('historic-applied')});
  expect(apiRequest).toHaveBeenCalledTimes(1);expect(latest.operations[0]).toMatchObject({id:'historic-applied',body,status:'confirmed',centralReference:'historic-central-sale',attempts:0});
  await act(async()=>{root.unmount()});
});
