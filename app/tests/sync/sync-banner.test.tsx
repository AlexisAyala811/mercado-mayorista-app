import React from 'react';
import {act, create, type ReactTestRenderer} from 'react-test-renderer';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {SyncStatusBanner} from '@/features/sync/sync-status-banner';

jest.mock('expo-router', () => ({useRouter: () => ({push: jest.fn()})}));
jest.mock('@/features/auth/session/session-provider', () => ({useSession: () => ({session: {user: {userId:'test'}}})}));
jest.mock('@/features/sync/sync-queue-provider', () => ({useSyncQueue: () => ({queueError:'Cannot decrypt', operations:[],pendingCount:0})}));
it('announces a queue read failure instead of reporting synchronized data', async () => {
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<SafeAreaProvider initialMetrics={{frame:{x:0,y:0,width:1280,height:800},insets:{top:24,right:0,bottom:56,left:0}}}><SyncStatusBanner /></SafeAreaProvider>)});
  const rendered=JSON.stringify(root.toJSON());
  expect(rendered).toContain('No se pudieron recuperar los pendientes');
  expect(rendered).toContain('No se pudo recuperar la sincronización');
  expect(rendered).not.toContain('Datos sincronizados');
  await act(async()=>{root.unmount()});
});
