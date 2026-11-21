export type SyncStatus = 'pending' | 'syncing' | 'confirmed' | 'discarded' | 'rejected' | 'review';
export type SyncOperation = {
  id: string;
  businessId: string;
  userId: string;
  type: string;
  path: string;
  method: 'DELETE' | 'PATCH' | 'POST';
  body: unknown;
  status: SyncStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  centralReference?: string;
  message?: string;
  // Spec 005: set when the server answered 409 with this code. The central
  // record under this identifier holds other data, so the operation is neither
  // sent again nor recovered from it.
  conflictCode?: string;
  receptionContext?: {
    qualities?: import('@/domain/catalog/commercial-characteristic').CommercialCharacteristic[];
    origins?: import('@/domain/catalog/commercial-characteristic').CommercialCharacteristic[];
    providerName: string;
    vehiclePlate: string;
    varieties: { id: string; name: string }[];
  };
  sackCharacteristics?:import('@/domain/catalog/commercial-characteristic').CommercialSnapshot;
};

export const operationIdConflict = 'operation-id-conflict';

export function transitionOperation(operation: SyncOperation, event: 'start' | 'network-failure' | 'confirm' | 'recover' | 'discard' | 'reject' | 'conflict', details?: { centralReference?: string; message?: string; code?: string }) {
  const now = new Date().toISOString();
  if (event === 'recover') {
    if (!['pending', 'rejected', 'review'].includes(operation.status) || !details?.centralReference) throw new Error('La recuperación requiere una operación sin confirmar y una referencia central.');
    return { ...operation, centralReference: details.centralReference, message: undefined, status: 'confirmed' as const, updatedAt: now };
  }
  if (event === 'discard') {
    if (!['pending', 'rejected', 'review'].includes(operation.status)) throw new Error('La operación no admite descarte.');
    return { ...operation, message: details?.message, status: 'discarded' as const, updatedAt: now };
  }
  if (event === 'start' && !['pending', 'rejected', 'review'].includes(operation.status)) throw new Error('La operación no admite sincronización.');
  if (event === 'start' && operation.attempts >= 5) throw new Error('Se alcanzó el límite de cinco envíos. Comprueba el resultado central.');
  if (event !== 'start' && operation.status !== 'syncing') throw new Error('La operación no está sincronizando.');
  if (event === 'start') return { ...operation, attempts: operation.attempts + 1, status: 'syncing' as const, updatedAt: now };
  if (event === 'network-failure') return { ...operation, message: details?.message, status: 'pending' as const, updatedAt: now };
  if (event === 'confirm') return { ...operation, centralReference: details?.centralReference, message: undefined, status: 'confirmed' as const, updatedAt: now };
  if (event === 'conflict') return { ...operation, conflictCode: details?.code, message: details?.message, status: 'review' as const, updatedAt: now };
  return { ...operation, message: details?.message, status: 'rejected' as const, updatedAt: now };
}

// Spec 005: copy of an operation whose identifier the server already holds with
// other data. The copy gets a new identifier (also in its body) and starts from
// zero sends; operations that waited on the original now wait on the copy.
export function resendWithNewIdentity(operations: SyncOperation[], id: string, newId: string) {
  const original = operations.find((item) => item.id === id);
  if (!original || original.status !== 'review' || original.conflictCode !== operationIdConflict) throw new Error('Solo se reenvía como nueva una operación cuyo identificador ya está registrado con otros datos.');
  const now = new Date().toISOString();
  const body = original.body && typeof original.body === 'object' && (original.body as { clientOperationId?: unknown }).clientOperationId === id ? { ...(original.body as object), clientOperationId: newId } : original.body;
  const copy: SyncOperation = { ...original, body, id: newId, attempts: 0, createdAt: now, status: 'pending', updatedAt: now };
  delete copy.conflictCode;
  delete copy.centralReference;
  delete copy.message;
  const retired = transitionOperation(original, 'discard', { message: 'Reenviada como operación nueva: el identificador anterior ya estaba registrado con otros datos.' });
  return operations.flatMap((item) => item.id === id ? [retired, copy] : [{ ...item, path: item.path.split(`@${id}`).join(`@${newId}`) }]);
}

export function recoverInterruptedOperations(operations: SyncOperation[]) {
  return operations.map((operation) => operation.status === 'syncing'
    ? { ...operation, status: 'pending' as const, message: 'El envío anterior se interrumpió. Se comprobará el resultado central antes de reintentar.' }
    : operation);
}
