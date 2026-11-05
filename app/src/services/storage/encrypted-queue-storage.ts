import type { SyncOperation } from "@/domain/sync/sync-operation";
import { validateStoredQueue } from "@/domain/sync/queue-validation";
import {
  readEncryptedRecord,
  writeEncryptedRecord,
  type StorageScope,
} from "./encrypted-record-storage";

export async function readEncryptedQueue(
  scope: StorageScope,
): Promise<SyncOperation[]> {
  const value = await readEncryptedRecord(scope, "queue");
  return value === undefined ? [] : validateStoredQueue(value, scope);
}
export async function writeEncryptedQueue(
  scope: StorageScope,
  operations: SyncOperation[],
) {
  validateStoredQueue(operations, scope);
  await writeEncryptedRecord(scope, "queue", operations);
}
