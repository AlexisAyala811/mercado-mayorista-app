import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {SyncQueueScreen} from '@/features/sync/sync-queue-screen';

const mockRetry=jest.fn();const mockSynchronize=jest.fn();const mockRevalidate=jest.fn();let mockOffline=false;let mockPendingCount=1;
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({isOfflineSession:mockOffline,retryBootstrap:mockRevalidate})}));
jest.mock('expo-router',()=>({useRouter:()=>({back:jest.fn()})}));
jest.mock('@/features/sync/sync-queue-provider',()=>({useSyncQueue:()=>({
  isLoadingQueue:false,queueError:null,pendingCount:mockPendingCount,
  operations:[{id:'last-response',type:'sale.return',status:'pending',attempts:5,createdAt:'2026-10-04T00:00:00Z'}],
  retry:mockRetry,synchronize:mockSynchronize,discard:jest.fn(),reloadQueue:jest.fn(),
})}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');
  const control=(props:object)=>react.createElement('test-control',props);
  return {AppButton:control,AppCard:control,AppScreen:control,EmptyState:control,FeedbackState:control,FormField:control,LoadingState:control,ScreenHeader:control};
});

beforeEach(()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  mockPendingCount=1;mockOffline=false;mockRevalidate.mockReset();mockSynchronize.mockReset().mockResolvedValue(undefined);
  mockRetry.mockReset().mockResolvedValue(undefined);
});

it('offers central recovery after five sends instead of hiding all retry actions',async()=>{
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<SyncQueueScreen/>)});
  expect(root.root.findAll(node=>node.props.label==='Reintentar')).toHaveLength(0);
  await act(async()=>{root.root.findAll(node=>node.props.label==='Comprobar resultado central')[0].props.onPress();await Promise.resolve()});
  expect(mockRetry).toHaveBeenCalledWith('last-response');
  await act(async()=>{root.unmount()});
});

it('shows a recovery error and keeps the central check available',async()=>{
  mockRetry.mockRejectedValueOnce(new Error('No se pudo consultar el resultado central'));
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<SyncQueueScreen/>)});
  await act(async()=>{root.root.findAll(node=>node.props.label==='Comprobar resultado central')[0].props.onPress();await Promise.resolve()});
  expect(root.root.findAll(node=>node.props.message==='No se pudo consultar el resultado central')).not.toHaveLength(0);
  expect(root.root.findAll(node=>node.props.label==='Comprobar resultado central')[0].props.disabled).toBe(false);
  await act(async()=>{root.unmount()});
});

it('revalidates an offline-restored identity after pending synchronization finishes',async()=>{
  mockOffline=true;let root!:ReactTestRenderer;await act(async()=>{root=create(<SyncQueueScreen/>)});
  await act(async()=>{await root.root.findAll(node=>node.props.label==='Sincronizar pendientes')[0].props.onPress();await Promise.resolve()});
  expect(mockSynchronize).toHaveBeenCalledTimes(1);expect(mockRevalidate).toHaveBeenCalledTimes(1);
  expect(mockSynchronize.mock.invocationCallOrder[0]).toBeLessThan(mockRevalidate.mock.invocationCallOrder[0]);
  await act(async()=>{root.unmount()});
});
it('keeps the offline identity unchanged when central recovery fails',async()=>{
  mockOffline=true;mockRetry.mockRejectedValueOnce(new Error('No central result'));let root!:ReactTestRenderer;await act(async()=>{root=create(<SyncQueueScreen/>)});
  await act(async()=>{await root.root.findAll(node=>node.props.label==='Comprobar resultado central')[0].props.onPress();await Promise.resolve()});
  expect(mockRevalidate).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});

it('offers explicit session revalidation independently of queued operations',async()=>{
  mockOffline=true;mockPendingCount=0;let root!:ReactTestRenderer;await act(async()=>{root=create(<SyncQueueScreen/>)});
  expect(root.root.findAll(node=>node.props.label==='Sincronizar pendientes')[0].props.disabled).toBe(true);
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Revalidar sesión')[0].props.onAction()});
  expect(mockRevalidate).toHaveBeenCalledTimes(1);expect(mockSynchronize).not.toHaveBeenCalled();expect(mockRetry).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
