import {writeEncryptedRecord} from '@/services/storage/encrypted-record-storage';
import { aesDecryptAsync } from 'expo-crypto';
import { readEncryptedQueue, writeEncryptedQueue } from '@/services/storage/encrypted-queue-storage';
import type { SyncOperation } from '@/domain/sync/sync-operation';

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  const descriptors = Object.getOwnPropertyDescriptors(actual);
  delete descriptors.Platform;
  return Object.defineProperties({ Platform: { ...actual.Platform, OS: 'android' } }, descriptors);
});
const mockFiles = new Map<string, Uint8Array>();
let mockFailure = '';
jest.mock('expo-file-system', () => ({
  Paths: { document: 'document' },
  File: class {
    name: string;
    constructor(_root: string, name: string) { this.name = name; }
    get exists() { return mockFiles.has(this.name); }
    create() { mockFiles.set(this.name, new Uint8Array()); }
    write(bytes: Uint8Array) {
      mockFiles.set(this.name, bytes.slice());
      if (mockFailure === 'short-write') mockFiles.set(this.name, bytes.slice(0, 1));
      if (mockFailure === 'write') {
        mockFiles.set(this.name, bytes.slice(0, 1));
        throw new Error('interrupted write');
      }
    }
    async bytes() { return mockFiles.get(this.name)!.slice(); }
    async copy(destination: { name: string }) {
      if (mockFailure === 'copy') throw new Error('backup failed');
      mockFiles.set(destination.name, mockFiles.get(this.name)!.slice());
    }
    async move(destination: { name: string }) {
      if (mockFailure === 'move') {
        mockFiles.delete(destination.name);
        throw new Error('interrupted move');
      }
      mockFiles.set(destination.name, mockFiles.get(this.name)!.slice());
      mockFiles.delete(this.name);
      if (mockFailure === 'short-move') mockFiles.set(destination.name, new Uint8Array([4]));
    }
  },
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'fixture-key'), setItemAsync: jest.fn() }));
jest.mock('expo-crypto', () => {
  const util = jest.requireActual('util');
  Object.defineProperty(globalThis, 'TextEncoder', { value: util.TextEncoder, configurable: true });
  Object.defineProperty(globalThis, 'TextDecoder', { value: util.TextDecoder, configurable: true });
  const key = { encoded: async () => 'fixture-key' };
  return {
    AESEncryptionKey: { import: jest.fn(async () => key), generate: jest.fn(async () => key) },
    AESSealedData: { fromCombined: (value: Uint8Array) => value },
    aesDecryptAsync: jest.fn(),
    aesEncryptAsync: jest.fn(async () => ({ combined: async () => new Uint8Array([4, 5, 6]) })),
  };
});
const scope = { businessId: 'business', userId: 'user' };
const operation: SyncOperation = { ...scope, id: 'operation', type: 'sale.create', path: '/sales', method: 'POST', body: {}, status: 'pending', attempts: 0, createdAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z' };
const name = 'mercado-queue-business.user.bin';
beforeEach(() => {
  jest.clearAllMocks(); mockFiles.clear(); mockFailure = '';
  jest.mocked(aesDecryptAsync).mockResolvedValue(new TextEncoder().encode(JSON.stringify([operation])));
});
it('keeps the committed file intact when the staged write is interrupted', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3])); mockFailure = 'write';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow('interrupted write');
  expect(mockFiles.get(name)).toEqual(new Uint8Array([1, 2, 3]));
  expect(await readEncryptedQueue(scope)).toEqual([operation]);
});
it('keeps the committed file when its backup cannot be saved', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3])); mockFailure = 'copy';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow('backup failed');
  expect(mockFiles.get(name)).toEqual(new Uint8Array([1, 2, 3]));
});
it('detects a silent incomplete staged write before touching the committed file', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3])); mockFailure = 'short-write';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow('verificar');
  expect(mockFiles.get(name)).toEqual(new Uint8Array([1, 2, 3]));
});
it('does not report persistence success after an incomplete destination copy', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3])); mockFailure = 'short-move';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow('verificar');
  expect(mockFiles.get(`${name}.previous`)).toEqual(new Uint8Array([1, 2, 3]));
});
it('recovers the previous committed ciphertext if replacement loses the destination', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3])); mockFailure = 'move';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow('interrupted move');
  expect(mockFiles.get(`${name}.previous`)).toEqual(new Uint8Array([1, 2, 3]));
  expect(await readEncryptedQueue(scope)).toEqual([operation]);
  expect(aesDecryptAsync).toHaveBeenCalledWith(new Uint8Array([1, 2, 3]), expect.anything());
});
it('blocks an interrupted first save instead of returning an empty queue', async () => {
  mockFailure = 'write';
  await expect(writeEncryptedQueue(scope, [operation])).rejects.toThrow();
  await expect(readEncryptedQueue(scope)).rejects.toThrow('guardado interrumpido');
});
it('commits the verified ciphertext and preserves the previous copy', async () => {
  mockFiles.set(name, new Uint8Array([1, 2, 3]));
  await writeEncryptedQueue(scope, [operation]);
  expect(mockFiles.get(name)).toEqual(new Uint8Array([4, 5, 6]));
  expect(mockFiles.get(`${name}.previous`)).toEqual(new Uint8Array([1, 2, 3]));
  expect(mockFiles.has(`${name}.writing`)).toBe(false);
});
it('does not silently fall back to older operations when the current ciphertext is corrupt', async () => {
  mockFiles.set(name, new Uint8Array([0])); mockFiles.set(`${name}.previous`, new Uint8Array([1, 2, 3]));
  jest.mocked(aesDecryptAsync).mockRejectedValueOnce(new Error('invalid authentication tag'));
  await expect(readEncryptedQueue(scope)).rejects.toThrow('invalid authentication tag');
  expect(aesDecryptAsync).toHaveBeenCalledTimes(1);
  expect(mockFiles.get(name)).toEqual(new Uint8Array([0]));
});

it('writes native catalog ciphertext separately and leaves the legacy queue file intact',async()=>{
  mockFiles.set(name,new Uint8Array([1,2,3]));
  await writeEncryptedRecord(scope,'sale-catalog',{version:1});
  expect(mockFiles.get(name)).toEqual(new Uint8Array([1,2,3]));
  expect(mockFiles.get(`mercado-sale-catalog-${scope.businessId}.${scope.userId}.bin`)).toEqual(new Uint8Array([4,5,6]));
});
