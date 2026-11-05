import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SessionProvider, useSession } from '@/features/auth/session/session-provider';
import { ApiError, ApiUnavailableError, createSession, revokeSession, subscribeToUnauthorizedResponse, getCurrentSession } from '@/services/api/api-client';
import { clearStoredSession, writeStoredSession, readStoredSession } from '@/services/storage/session-storage';
import type { AuthenticatedSession } from '@/domain/auth/session';

jest.mock('@/services/api/api-client', () => ({ ...jest.requireActual('@/services/api/api-client'), createSession: jest.fn(), getCurrentSession: jest.fn(), revokeSession: jest.fn(async () => undefined), subscribeToUnauthorizedResponse: jest.fn(() => () => undefined) }));
jest.mock('@/services/storage/session-storage', () => ({ readStoredSession: jest.fn(), writeStoredSession: jest.fn(async () => undefined), clearStoredSession: jest.fn(async () => undefined) }));

const stored: AuthenticatedSession = { accessToken: 'test-token', expiresAt: '2026-10-06T18:01:00Z', user: { businessId: 'business', businessName: 'Mercado QA', userId: 'user', username: 'mayorista', role: 'wholesaler', sessionId: 'session', expiresAt: '2026-10-06T18:01:00Z' } };
let latest: ReturnType<typeof useSession>;
function Probe() { const value = useSession(); useEffect(() => { latest = value; }, [value]); return null; }
async function open() { let root!: ReactTestRenderer; await act(async () => { root = create(<SessionProvider><Probe /></SessionProvider>); }); return root; }

beforeEach(() => {
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useFakeTimers(); jest.setSystemTime(new Date('2026-10-06T18:00:00Z')); jest.clearAllMocks();
  jest.mocked(readStoredSession).mockResolvedValue(stored);
  jest.mocked(clearStoredSession).mockResolvedValue(undefined);
});

it('offers recovery and blocks new credentials while a local removal remains failed', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());
  const root = await open();
  jest.mocked(clearStoredSession).mockRejectedValueOnce(new Error('Storage failure'));
  await act(async () => { await latest.logout(); });
  expect(latest.hasPendingSessionRemoval).toBe(true);
  await act(async () => { await latest.login({ username: 'Test', password: 'test-only' }); });
  expect(createSession).not.toHaveBeenCalled();
  expect(latest.session).toBeNull();
  expect(latest.loginError).toContain('Reintenta el cierre');
  await act(async () => { await latest.retrySessionRemoval(); });
  expect(latest).toMatchObject({ hasPendingSessionRemoval: false, isClearingLocalSession: false, session: null, loginError: null });
  jest.mocked(createSession).mockResolvedValueOnce(stored);
  await act(async () => { await latest.login({ username: 'Test', password: 'test-only' }); });
  expect(latest.session).toEqual(stored);
  await act(async () => { root.unmount(); });
});

it('does not restore old offline credentials when revalidation retries a failed removal', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());
  const root = await open();
  jest.mocked(clearStoredSession).mockRejectedValue(new Error('Storage failure'));
  await act(async () => { await latest.logout(); });
  jest.mocked(readStoredSession).mockClear();
  jest.mocked(getCurrentSession).mockClear();
  await act(async () => { latest.retryBootstrap(); await Promise.resolve(); });
  expect(readStoredSession).not.toHaveBeenCalled();
  expect(getCurrentSession).not.toHaveBeenCalled();
  expect(latest).toMatchObject({ session: null, hasPendingSessionRemoval: true, isClearingLocalSession: false, isOfflineSession: false });
  expect(latest.loginError).toContain('No se pudo retirar');
  await act(async () => { root.unmount(); });
});

it('keeps access blocked while retrying local removal and clears the recovery state only on success', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());
  const root = await open();
  jest.mocked(clearStoredSession).mockRejectedValueOnce(new Error('Storage failure'));
  await act(async () => { await latest.logout(); });
  const removing = deferred<void>();
  jest.mocked(clearStoredSession).mockReturnValueOnce(removing.promise);
  let retry!: Promise<void>;
  await act(async () => { retry = latest.retrySessionRemoval(); await Promise.resolve(); });
  expect(latest).toMatchObject({ session: null, hasPendingSessionRemoval: true, isClearingLocalSession: true });
  await act(async () => { removing.resolve(); await retry; });
  expect(latest).toMatchObject({ session: null, hasPendingSessionRemoval: false, isClearingLocalSession: false });
  await act(async () => { root.unmount(); });
});

it('exposes retry rather than rejecting bootstrap when a rejected central session cannot be removed', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiError('Rejected', 401));
  jest.mocked(clearStoredSession).mockRejectedValueOnce(new Error('Storage failure'));
  const root = await open();
  expect(latest).toMatchObject({ session: null, hasPendingSessionRemoval: true, isBootstrapping: false });
  expect(latest.loginError).toContain('No se pudo retirar');
  await act(async () => { root.unmount(); });
});
afterEach(() => { jest.useRealTimers(); });

it('restores a previously verified unexpired identity provisionally when the server cannot be reached', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());
  const root = await open();
  expect(latest).toMatchObject({ session: stored, isOfflineSession: true, bootstrapError: null, isBootstrapping: false });
  expect(clearStoredSession).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('blocks an expired cached session without making a server request', async () => {
  jest.setSystemTime(new Date('2026-10-06T18:02:00Z'));
  const root = await open();
  expect(latest.session).toBeNull(); expect(latest.isOfflineSession).toBe(false);
  expect(getCurrentSession).not.toHaveBeenCalled(); expect(clearStoredSession).toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each([401, 403, 500])('does not treat a central %s response as permission for offline restoration', async (status) => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiError('Central rejection', status));
  const root = await open();
  expect(latest.session).toBeNull(); expect(latest.isOfflineSession).toBe(false);
  if (status === 401) expect(clearStoredSession).toHaveBeenCalled();
  else expect(latest.bootstrapError).toBe('Central rejection');
  await act(async () => { root.unmount(); });
});

it('expires the offline session locally while preserving the pending-data storage', async () => {
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());
  const root = await open();
  await act(async () => { jest.advanceTimersByTime(60_001); });
  expect(latest.session).toBeNull(); expect(latest.isOfflineSession).toBe(false);
  expect(latest.loginError).toContain('venció'); expect(clearStoredSession).toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('revalidates the offline-restored identity without deleting pending data when connectivity returns',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();expect(latest.isOfflineSession).toBe(true);
  const current={...stored.user,businessName:'Nombre actualizado'};jest.mocked(getCurrentSession).mockResolvedValueOnce(current);
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(latest.isOfflineSession).toBe(false);expect(latest.session?.user.businessName).toBe('Nombre actualizado');expect(latest.isBootstrapping).toBe(false);expect(clearStoredSession).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});

function deferred<T>(){let resolve!:(value:T)=>void;const promise=new Promise<T>(done=>{resolve=done});return {promise,resolve};}
it('keeps initial bootstrap separate from revalidation of an existing offline session',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const response=deferred<typeof stored.user>();jest.mocked(getCurrentSession).mockReturnValueOnce(response.promise);
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(latest).toMatchObject({isBootstrapping:false,isRevalidating:true,session:stored});
  await act(async()=>{response.resolve(stored.user);await response.promise});
  expect(latest).toMatchObject({isBootstrapping:false,isRevalidating:false,isOfflineSession:false});
  await act(async()=>{root.unmount()});
});
it.each(['logout','invalidate'] as const)('does not restore or save a late session response after %s',async(action)=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const response=deferred<typeof stored.user>();jest.mocked(getCurrentSession).mockReturnValueOnce(response.promise);
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  await act(async()=>{if(action==='logout')await latest.logout();else await latest.invalidateSession()});
  await act(async()=>{response.resolve(stored.user);await response.promise});
  expect(latest.session).toBeNull();expect(latest.isRevalidating).toBe(false);
  expect(writeStoredSession).not.toHaveBeenCalled();expect(clearStoredSession).toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
it('rejects a late response after the local expiry timer has removed the identity',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const response=deferred<typeof stored.user>();jest.mocked(getCurrentSession).mockReturnValueOnce(response.promise);
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  await act(async()=>{jest.advanceTimersByTime(60001);await Promise.resolve()});
  await act(async()=>{response.resolve(stored.user);await response.promise});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();
  await act(async()=>{root.unmount()});
});
it('clears credentials after an already-running write rather than allowing it to survive logout',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const writing=deferred<void>();let persisted:AuthenticatedSession|null=stored;
  jest.mocked(writeStoredSession).mockImplementationOnce(async(value)=>{await writing.promise;persisted=value});
  jest.mocked(clearStoredSession).mockImplementationOnce(async()=>{persisted=null});
  jest.mocked(getCurrentSession).mockResolvedValueOnce({...stored.user,businessName:'Updated'});
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(writeStoredSession).toHaveBeenCalledTimes(1);
  let closing!:Promise<void>;await act(async()=>{closing=latest.logout();await Promise.resolve()});
  expect(latest.session).toBeNull();expect(clearStoredSession).not.toHaveBeenCalled();
  await act(async()=>{writing.resolve();await closing});
  expect(persisted).toBeNull();expect(latest.session).toBeNull();
  expect(clearStoredSession).toHaveBeenCalledTimes(1);await act(async()=>{root.unmount()});
});
it('does not persist a login response received after the user has closed the session',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const response=deferred<AuthenticatedSession>();jest.mocked(createSession).mockReturnValueOnce(response.promise);
  let signingIn!:Promise<void>;await act(async()=>{signingIn=latest.login({username:'QA',password:'fixture'});await Promise.resolve()});
  await act(async()=>{await latest.logout()});
  await act(async()=>{response.resolve({...stored,accessToken:'late-token'});await signingIn});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();expect(latest.isSubmitting).toBe(false);
  await act(async()=>{root.unmount()});
});
it('keeps a central revalidation rejection blocked instead of switching to offline permission',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiError('Central rejection',403));
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(latest.bootstrapError).toBe('Central rejection');expect(latest.session).toBe(stored);
  expect(writeStoredSession).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});
it('rejects central identity changes for the same opaque token',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  jest.mocked(getCurrentSession).mockResolvedValueOnce({...stored.user,businessId:'other-business'});
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});
it('still revokes centrally if removing local credentials fails and exposes the failure',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  jest.mocked(clearStoredSession).mockRejectedValueOnce(new Error('Storage failure'));
  await act(async()=>{await latest.logout()});
  expect(revokeSession).toHaveBeenCalledWith(stored.accessToken);expect(latest.session).toBeNull();expect(latest.loginError).toContain('No se pudo retirar');
  await act(async()=>{root.unmount()});
});

it('cancels a late successful refresh after another API request reports unauthorized',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const response=deferred<typeof stored.user>();jest.mocked(getCurrentSession).mockReturnValueOnce(response.promise);
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  await act(async()=>{jest.mocked(subscribeToUnauthorizedResponse).mock.calls[0][0](stored.accessToken);await Promise.resolve()});
  await act(async()=>{response.resolve(stored.user);await response.promise});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});
it('keeps a new session when the previous token receives a late unauthorized response',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  const next={...stored,accessToken:'next-token',user:{...stored.user,sessionId:'next-session'}};
  jest.mocked(createSession).mockResolvedValueOnce(next);
  await act(async()=>{await latest.login({username:'Test',password:'test-only'});});
  jest.mocked(clearStoredSession).mockClear();
  await act(async()=>{jest.mocked(subscribeToUnauthorizedResponse).mock.calls[0][0](stored.accessToken);});
  expect(latest.session).toEqual(next);expect(clearStoredSession).not.toHaveBeenCalled();
  await act(async()=>{jest.mocked(subscribeToUnauthorizedResponse).mock.calls[0][0](next.accessToken);});
  expect(latest.session).toBeNull();expect(clearStoredSession).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());
});
it('rejects a stored session which expires while the initial central validation is pending',async()=>{
  const response=deferred<typeof stored.user>();jest.mocked(getCurrentSession).mockReturnValueOnce(response.promise);const root=await open();
  await act(async()=>{jest.setSystemTime(new Date('2026-10-06T18:02:00Z'));response.resolve(stored.user);await response.promise});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();expect(clearStoredSession).toHaveBeenCalled();await act(async()=>{root.unmount()});
});
it('does not admit an unexpected role from central revalidation',async()=>{
  jest.mocked(getCurrentSession).mockRejectedValueOnce(new ApiUnavailableError());const root=await open();
  jest.mocked(getCurrentSession).mockResolvedValueOnce({...stored.user,role:'unknown' as typeof stored.user.role});
  await act(async()=>{latest.retryBootstrap();await Promise.resolve()});
  expect(latest.session).toBeNull();expect(writeStoredSession).not.toHaveBeenCalled();await act(async()=>{root.unmount()});
});
