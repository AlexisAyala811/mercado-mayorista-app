import {readEncryptedRecord,writeEncryptedRecord} from '@/services/storage/encrypted-record-storage';
import {AESEncryptionKey,aesDecryptAsync} from 'expo-crypto';
import {readEncryptedQueue,writeEncryptedQueue} from '@/services/storage/encrypted-queue-storage';
import type {SyncOperation} from '@/domain/sync/sync-operation';

jest.mock('react-native',()=>{
  const actual=jest.requireActual('react-native');
  const descriptors=Object.getOwnPropertyDescriptors(actual);
  delete descriptors.Platform;
  return Object.defineProperties({Platform:{...actual.Platform,OS:'web'}},descriptors);
});
jest.mock('expo-file-system',()=>({File:jest.fn(),Paths:{document:'test-document'}}));
jest.mock('expo-secure-store',()=>({getItemAsync:jest.fn(),setItemAsync:jest.fn()}));
jest.mock('expo-crypto',()=>{
  const util=jest.requireActual('util');
  Object.defineProperty(globalThis,'TextEncoder',{value:util.TextEncoder,configurable:true});
  Object.defineProperty(globalThis,'TextDecoder',{value:util.TextDecoder,configurable:true});
  const key={encoded:jest.fn(async()=> 'fixture-key')};
  return {AESEncryptionKey:{import:jest.fn(async()=>key),generate:jest.fn(async()=>key)},AESSealedData:{fromCombined:jest.fn(value=>value)},aesDecryptAsync:jest.fn(),aesEncryptAsync:jest.fn(async()=>({combined:async()=>new Uint8Array([1,2,3])}))};
});
const scope={businessId:'business',userId:'user'};
const operation:SyncOperation={id:'operation',type:'sale.create',path:'/sales',method:'POST',body:{clientOperationId:'operation'},...scope,status:'pending',attempts:0,createdAt:'2026-10-04T00:00:00Z',updatedAt:'2026-10-04T00:00:00Z'};
const values=new Map<string,string>();
const mockStorage={getItem:jest.fn((key:string)=>values.get(key)??null),setItem:jest.fn((key:string,value:string)=>{values.set(key,value)})};
const dataName='mercado.queue.data.business.user';const keyName='mercado.queue.key.business.user';
beforeEach(()=>{
  jest.clearAllMocks();values.clear();
  Object.defineProperty(globalThis,'localStorage',{value:mockStorage,configurable:true});
  jest.mocked(aesDecryptAsync).mockResolvedValue(new TextEncoder().encode(JSON.stringify([operation])));
});
function stored(){values.set(dataName,'AQID');values.set(keyName,'fixture-key')}

it('does not generate a replacement key when stored pending data loses its key',async()=>{
  values.set(dataName,'AQID');
  await expect(readEncryptedQueue(scope)).rejects.toThrow('No se encontró la clave');
  await expect(writeEncryptedQueue(scope,[operation])).rejects.toThrow('No se encontró la clave');
  expect(AESEncryptionKey.generate).not.toHaveBeenCalled();expect(mockStorage.setItem).not.toHaveBeenCalled();
  expect(values.get(dataName)).toBe('AQID');
});
it('rejects a decrypted object instead of treating it as an empty queue',async()=>{
  stored();jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode('{}'));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('estructura válida');
  expect(mockStorage.setItem).not.toHaveBeenCalled();expect(values.get(dataName)).toBe('AQID');
});
it('refuses operations belonging to another identity without replacing stored data',async()=>{
  stored();jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify([{...operation,userId:'other-user'}])));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('otra identidad');
  await expect(writeEncryptedQueue(scope,[{...operation,businessId:'other-business'}])).rejects.toThrow('otra identidad');
  expect(mockStorage.setItem).not.toHaveBeenCalled();
});
it('rejects duplicated identities and impossible counters in recovered operations',async()=>{
  stored();jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify([operation,operation])));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('repetida');
  jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify([{...operation,attempts:-1}])));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('inválida');
  expect(mockStorage.setItem).not.toHaveBeenCalled();
});
it('reports unavailable browser storage instead of claiming a successful save',async()=>{
  Object.defineProperty(globalThis,'localStorage',{value:undefined,configurable:true});
  await expect(readEncryptedQueue(scope)).rejects.toThrow('no está disponible');
  await expect(writeEncryptedQueue(scope,[operation])).rejects.toThrow('no está disponible');
  expect(AESEncryptionKey.generate).not.toHaveBeenCalled();
});
it('allows a fresh key and restores a valid scoped queue through the storage adapter',async()=>{
  expect(await readEncryptedQueue(scope)).toEqual([]);
  await writeEncryptedQueue(scope,[operation]);
  expect(AESEncryptionKey.generate).toHaveBeenCalledTimes(1);expect(values.get(dataName)).toBe('AQID');
  expect(await readEncryptedQueue(scope)).toEqual([operation]);
  expect(AESEncryptionKey.import).toHaveBeenCalledWith('fixture-key','hex');
});

it('restores the optional display context from the encrypted payload', async () => {
  const reception = { ...operation, type: 'reception.create', path: '/receptions', receptionContext: { providerName: 'Proveedor QA', vehiclePlate: 'QA-123', varieties: [{ id: 'variety', name: 'Canchán QA' }] } };
  await writeEncryptedQueue(scope, [reception]);
  jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify([reception])));
  expect(await readEncryptedQueue(scope)).toEqual([reception]);
});

it('refuses malformed or misplaced recovery context without replacing the ciphertext', async () => {
  stored();
  const writesBefore = mockStorage.setItem.mock.calls.length;
  await expect(writeEncryptedQueue(scope, [{ ...operation, receptionContext: { providerName: 'QA', vehiclePlate: '', varieties: [] } }])).rejects.toThrow('inválida');
  jest.mocked(aesDecryptAsync).mockResolvedValueOnce(new TextEncoder().encode(JSON.stringify([{ ...operation, type: 'reception.create', receptionContext: { providerName: 'QA', vehiclePlate: '', varieties: [{ id: 'v', name: 'Papa' }, { id: 'v', name: 'Otra' }] } }])));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('inválida');
  expect(mockStorage.setItem).toHaveBeenCalledTimes(writesBefore);
});

it('keeps catalog ciphertext and keys separate from existing pending operations',async()=>{
  stored();
  await writeEncryptedRecord(scope,'sale-catalog',{version:1,marker:'catalog fixture'});
  expect(values.get(dataName)).toBe('AQID');expect(values.get(keyName)).toBe('fixture-key');
  expect(values.get('mercado.sale-catalog.data.business.user')).toBe('AQID');
  expect(values.get('mercado.sale-catalog.key.business.user')).toBe('fixture-key');
  expect(AESEncryptionKey.generate).toHaveBeenCalledTimes(1);
  expect(JSON.stringify([...values.values()])).not.toContain('catalog fixture');
});
it('serializes first writes to the same catalog so concurrent requests do not replace their key',async()=>{
  await Promise.all([writeEncryptedRecord(scope,'sale-catalog',{revision:1}),writeEncryptedRecord(scope,'sale-catalog',{revision:2})]);
  expect(AESEncryptionKey.generate).toHaveBeenCalledTimes(1);
  expect(AESEncryptionKey.import).toHaveBeenCalledTimes(1);
});
it('never reads another user catalog or silently recreates a lost catalog key',async()=>{
  values.set('mercado.sale-catalog.data.business.user','AQID');
  await expect(readEncryptedRecord(scope,'sale-catalog')).rejects.toThrow('No se encontró la clave');
  expect(await readEncryptedRecord({...scope,userId:'other-user'},'sale-catalog')).toBeUndefined();
  expect(values.get('mercado.sale-catalog.data.business.user')).toBe('AQID');
  expect(AESEncryptionKey.generate).not.toHaveBeenCalled();
});
