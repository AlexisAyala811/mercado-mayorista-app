import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {Modal} from 'react-native';
import {RootNavigator} from '@/app/_layout';
import { clearInitialPurchaseDraft, readInitialPurchaseDraft, rememberInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';
let mockMounts=0;let mockUnmounts=0;
let mockContext={session:{accessToken:'fixture',user:{role:'wholesaler'}} as { accessToken:string; user:{ role:string } } | null,isBootstrapping:false,isRevalidating:false,bootstrapError:null as string|null,retryBootstrap:jest.fn()};
jest.mock('@/features/auth/session/session-provider',()=>({SessionProvider:()=>null,useSession:()=>mockContext}));
jest.mock('@/features/sync/sync-queue-provider',()=>({SyncQueueProvider:()=>null}));
jest.mock('@/features/sync/use-sync-status',()=>({useSyncStatus:()=>null}));
jest.mock('@/ui/navigation/bottom-nav',()=>({BottomNav:()=>null}));
jest.mock('expo-status-bar',()=>({StatusBar:()=>null}));
jest.mock('react-native',()=>{const react=jest.requireActual('react');const actual=jest.requireActual('react-native');const descriptors=Object.getOwnPropertyDescriptors(actual);delete descriptors.Modal;delete descriptors.View;const control=(props:object)=>react.createElement('test-native',props);return Object.defineProperties({Modal:control,View:control},descriptors);});
jest.mock('@/ui/components',()=>{const react=jest.requireActual('react');const control=(props:object)=>react.createElement('test-control',props);return {AppScreen:control,FeedbackState:control,LoadingState:control};});
jest.mock('expo-router',()=>{
  const react=jest.requireActual('react');
  const Stack=(props:React.PropsWithChildren)=>{
    const [route,setRoute]=react.useState('home');
    react.useEffect(()=>{mockMounts++;return()=>{mockUnmounts++;};},[]);
    return react.createElement('navigation-state',{route,onMove:()=>setRoute('sync-queue')},props.children);
  };
  Stack.Screen=()=>null;Stack.Protected=({guard,children}:React.PropsWithChildren<{guard:boolean}>)=>guard?children:null;
  return {Stack,usePathname:()=>"/home",useRouter:()=>({back:jest.fn(),canGoBack:()=>false,replace:jest.fn()})};
});
beforeEach(()=>{(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;mockMounts=0;mockUnmounts=0;mockContext={session:{accessToken:'fixture',user:{role:'wholesaler'}},isBootstrapping:false,isRevalidating:false,bootstrapError:null,retryBootstrap:jest.fn()};});
it('preserves navigator state behind a blocking modal throughout session revalidation',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<RootNavigator/>)});
  await act(async()=>{root.root.find(node=>typeof node.props.onMove==='function').props.onMove()});
  mockContext={...mockContext,isRevalidating:true};await act(async()=>{root.update(<RootNavigator/>)});
  expect(root.root.find(node=>typeof node.props.onMove==='function').props.route).toBe('sync-queue');expect(mockMounts).toBe(1);expect(mockUnmounts).toBe(0);
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  root.root.findByType(Modal).props.onRequestClose();expect(root.root.findByType(Modal).props.visible).toBe(true);
  mockContext={...mockContext,isRevalidating:false};await act(async()=>{root.update(<RootNavigator/>)});
  expect(root.root.findByType(Modal).props.visible).toBe(false);expect(root.root.find(node=>typeof node.props.onMove==='function').props.route).toBe('sync-queue');expect(mockMounts).toBe(1);
  await act(async()=>{root.unmount()});
});
it('keeps a rejected revalidation blocked without destroying the existing navigator',async()=>{
  let root!:ReactTestRenderer;await act(async()=>{root=create(<RootNavigator/>)});
  await act(async()=>{root.root.find(node=>typeof node.props.onMove==='function').props.onMove()});
  mockContext={...mockContext,bootstrapError:'Central rejection'};await act(async()=>{root.update(<RootNavigator/>)});
  expect(root.root.findByType(Modal).props.visible).toBe(true);expect(root.root.find(node=>typeof node.props.onMove==='function').props.route).toBe('sync-queue');
  expect(root.root.findAll(node=>node.props.title==='No se pudo revalidar la sesión')).not.toHaveLength(0);expect(mockMounts).toBe(1);
  await act(async()=>{root.unmount()});
});
it('does not mount protected navigation during the initial bootstrap',async()=>{
  mockContext={...mockContext,isBootstrapping:true};let root!:ReactTestRenderer;await act(async()=>{root=create(<RootNavigator/>)});
  expect(root.root.findAll(node=>typeof node.props.onMove==='function')).toHaveLength(0);expect(mockMounts).toBe(0);await act(async()=>{root.unmount()});
});

const editingDraft = { details: { date: '2026-10-12', driverName: 'QA edición', expectedVarieties: '', providerName: '', providerPhone: '', vehiclePlate: '' }, providerId: '', vehicleId: '', expectedVarietyIds: [] };
it.each(['logout', 'replace'] as const)('clears the old editing copy when session lifecycle is %s', async change => {
  clearInitialPurchaseDraft();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<RootNavigator />); });
  rememberInitialPurchaseDraft('fixture', editingDraft);
  mockContext = { ...mockContext, session: change === 'logout' ? null : { accessToken: 'new-fixture', user: { role: 'wholesaler' } } };
  await act(async () => { root.update(<RootNavigator />); });
  expect(readInitialPurchaseDraft('fixture')).toBeNull();
  await act(async () => { root.unmount(); });
});
it('retains the editing copy during revalidation of the same session', async () => {
  clearInitialPurchaseDraft();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<RootNavigator />); });
  rememberInitialPurchaseDraft('fixture', editingDraft);
  mockContext = { ...mockContext, isRevalidating: true };
  await act(async () => { root.update(<RootNavigator />); });
  expect(readInitialPurchaseDraft('fixture')?.details.driverName).toBe('QA edición');
  await act(async () => { root.unmount(); });
});
