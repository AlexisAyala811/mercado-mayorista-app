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
  receptionContext?: {
    qualities?: import('@/domain/catalog/commercial-characteristic').CommercialCharacteristic[];
    origins?: import('@/domain/catalog/commercial-characteristic').CommercialCharacteristic[];
    providerName: string;
    vehiclePlate: string;
    varieties: { id: string; name: string }[];
  };
  sackCharacteristics?:import('@/domain/catalog/commercial-characteristic').CommercialSnapshot;
};

export function transitionOperation(operation: SyncOperation, event: 'start' | 'network-failure' | 'confirm' | 'recover' | 'discard' | 'reject' | 'conflict', details?: { centralReference?: string; message?: string }) {
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
  if (event === 'conflict') return { ...operation, message: details?.message, status: 'review' as const, updatedAt: now };
  return { ...operation, message: details?.message, status: 'rejected' as const, updatedAt: now };
}

export function recoverInterruptedOperations(operations: SyncOperation[]) {
  return operations.map((operation) => operation.status === 'syncing'
    ? { ...operation, status: 'pending' as const, message: 'El envío anterior se interrumpió. Se comprobará el resultado central antes de reintentar.' }
    : operation);
}
