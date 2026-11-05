import type {AuthenticatedSession} from '@/domain/auth/session';
import {ApiError,ApiUnavailableError} from '@/services/api/api-client';
import {loadOperationCatalogs} from '@/services/catalogs/operation-catalog-cache';
import {readEncryptedRecord,writeEncryptedRecord} from '@/services/storage/encrypted-record-storage';
jest.mock('@/services/storage/encrypted-record-storage',()=>({readEncryptedRecord:jest.fn(),writeEncryptedRecord:jest.fn()}));
const businessId='11111111-1111-4111-8111-111111111111';
const userId='22222222-2222-4222-8222-222222222222';
const varietyId='33333333-3333-4333-8333-333333333333';
const buyerId='44444444-4444-4444-8444-444444444444';
const session:AuthenticatedSession={accessToken:'fixture-token',expiresAt:'2099-01-01T00:00:00Z',user:{businessId,userId,businessName:'QA',username:'QA',sessionId:'session',role:'wholesaler',expiresAt:'2099-01-01T00:00:00Z'}};
const data={buyers:[{id:buyerId,name:'Comprador QA',phone:null,destinationDepartment:'Lima',creditLimitCents:null}],vehicles:[],varieties:[{id:varietyId,name:'Papa QA'}]};
const snapshot=()=>({version:1,kind:'sale',businessId,userId,savedAt:'2026-10-07T12:00:00Z',data});
it('migrates a version-one cache without inventing historical characteristics',async()=>{
  const result=await loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError();});
  expect(result.qualities).toEqual([]);expect(result.origins).toEqual([]);expect(result.catalogNotice).toContain('copia anterior');
});
it('rejects missing characteristic lists in a version-two cache instead of treating corruption as legacy data',async()=>{
  jest.mocked(readEncryptedRecord).mockResolvedValue({...snapshot(),version:2});
  await expect(loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError();})).rejects.toThrow('incompleta');
});
beforeEach(()=>{jest.resetAllMocks();jest.mocked(writeEncryptedRecord).mockResolvedValue(undefined);jest.mocked(readEncryptedRecord).mockResolvedValue(snapshot());});
it('saves only needed fields in a separate scoped encrypted namespace after a complete central fetch',async()=>{
  const result=await loadOperationCatalogs('sale',session,async()=>({...data,buyers:[{...data.buyers[0],unused:'private extra'}]}));
  expect(result.catalogSource).toBe('central');expect(readEncryptedRecord).not.toHaveBeenCalled();
  expect(writeEncryptedRecord).toHaveBeenCalledWith({businessId,userId},'sale-catalog',expect.objectContaining({version:2,kind:'sale',data:{...data,qualities:[],origins:[]}}));
  expect(JSON.stringify(jest.mocked(writeEncryptedRecord).mock.calls[0][2])).not.toContain('fixture-token');
  expect(JSON.stringify(jest.mocked(writeEncryptedRecord).mock.calls[0][2])).not.toContain('private extra');
});
it('recovers a saved snapshot for the same identity only after connection failure',async()=>{
  const result=await loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError()});
  expect(result.buyers).toEqual(data.buyers);expect(result.catalogSource).toBe('local');expect(result.catalogNotice).toContain('revalidará');
  expect(readEncryptedRecord).toHaveBeenCalledWith({businessId,userId},'sale-catalog');expect(writeEncryptedRecord).not.toHaveBeenCalled();
});
it.each([401,403,422,500])('never recovers local permissions or data instead of central rejection %s',async(status)=>{
  await expect(loadOperationCatalogs('sale',session,async()=>{throw new ApiError('Rejected',status)})).rejects.toThrow('Rejected');
  expect(readEncryptedRecord).not.toHaveBeenCalled();expect(writeEncryptedRecord).not.toHaveBeenCalled();
});
it('preserves central usable results and reports a failed cache write',async()=>{
  jest.mocked(writeEncryptedRecord).mockRejectedValueOnce(new Error('Storage full'));
  const result=await loadOperationCatalogs('sale',session,async()=>data);
  expect(result.buyers).toEqual(data.buyers);expect(result.catalogSource).toBe('central');expect(result.catalogNotice).toContain('No se pudo guardar');
});
it.each([{businessId:'55555555-5555-4555-8555-555555555555'},{userId:'66666666-6666-4666-8666-666666666666'},{version:2},{data:{...data,varieties:[data.varieties[0],data.varieties[0]]}}])('rejects corrupted or foreign snapshots %j without overwriting them',async(change)=>{
  jest.mocked(readEncryptedRecord).mockResolvedValueOnce({...snapshot(),...change});
  await expect(loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError()})).rejects.toThrow(/copia local/i);
  expect(writeEncryptedRecord).not.toHaveBeenCalled();
});
it('distinguishes a legitimate empty snapshot from absence',async()=>{
  jest.mocked(readEncryptedRecord).mockResolvedValueOnce({...snapshot(),data:{buyers:[],vehicles:[],varieties:[]}});
  expect((await loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError()})).buyers).toEqual([]);
  jest.mocked(readEncryptedRecord).mockResolvedValueOnce(undefined);
  await expect(loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError()})).rejects.toThrow('No hay una copia');
});
it('denies an expired session before reading, fetching or saving catalogs',async()=>{
  const fetcher=jest.fn(async()=>data);
  await expect(loadOperationCatalogs('sale',{...session,expiresAt:'2000-01-01T00:00:00Z'},fetcher)).rejects.toMatchObject({status:401});
  expect(fetcher).not.toHaveBeenCalled();expect(readEncryptedRecord).not.toHaveBeenCalled();expect(writeEncryptedRecord).not.toHaveBeenCalled();
});
it('rechecks expiry after a failed connection before decrypting a saved snapshot',async()=>{
  const expiring={...session,user:{...session.user}};
  await expect(loadOperationCatalogs('sale',expiring,async()=>{expiring.expiresAt='2000-01-01T00:00:00Z';throw new ApiUnavailableError()})).rejects.toMatchObject({status:401});
  expect(readEncryptedRecord).not.toHaveBeenCalled();
});
it('does not permit an unknown role to recover a sale catalog',async()=>{
  await expect(loadOperationCatalogs('sale',{...session,user:{...session.user,role:'unknown' as typeof session.user.role}},async()=>data)).rejects.toMatchObject({status:403});
  expect(readEncryptedRecord).not.toHaveBeenCalled();
});

it('reports damaged ciphertext without overwriting it or exposing internal details',async()=>{
  jest.mocked(readEncryptedRecord).mockRejectedValueOnce(new Error('internal authentication tag and private path'));
  await expect(loadOperationCatalogs('sale',session,async()=>{throw new ApiUnavailableError()})).rejects.toThrow('No se pudo recuperar la copia cifrada');
  expect(writeEncryptedRecord).not.toHaveBeenCalled();
});

it('allows authorized assistant capture catalogs without changing privileged module access',async()=>{
  const assistant={...session,user:{...session.user,userId:'55555555-5555-4555-8555-555555555555',role:'assistant' as const}};
  const result=await loadOperationCatalogs('sale',assistant,async()=>data);
  expect(result.catalogSource).toBe('central');expect(result.buyers).toEqual(data.buyers);
  expect(writeEncryptedRecord).toHaveBeenCalledWith({businessId,userId:assistant.user.userId},'sale-catalog',expect.objectContaining({userId:assistant.user.userId}));
});
it('recovers only the assistant own snapshot while its verified identity remains valid',async()=>{
  const assistant={...session,user:{...session.user,userId:'55555555-5555-4555-8555-555555555555',role:'assistant' as const}};
  jest.mocked(readEncryptedRecord).mockResolvedValueOnce({...snapshot(),userId:assistant.user.userId});
  const result=await loadOperationCatalogs('sale',assistant,async()=>{throw new ApiUnavailableError()});
  expect(result.catalogSource).toBe('local');expect(readEncryptedRecord).toHaveBeenCalledWith({businessId,userId:assistant.user.userId},'sale-catalog');
});
