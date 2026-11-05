import type { SyncOperation } from '@/domain/sync/sync-operation';

export function hasUnresolvedReceptionWrites(operations: readonly SyncOperation[], receptionId: string): boolean {
  const references = new Set([receptionId]);
  for (const operation of operations) {
    if (operation.type === 'reception.create' && operation.centralReference === receptionId) {
      references.add(`@${operation.id}`);
    }
  }
  return operations.some((operation) => {
    if (operation.status === 'confirmed' || operation.status === 'discarded') return false;
    const match = /^\/(?:purchases\/)?receptions\/([^/]+)(?:\/|$)/.exec(operation.path);
    return Boolean(match && references.has(match[1]));
  });
}
