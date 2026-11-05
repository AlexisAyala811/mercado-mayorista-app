import type { SyncOperation } from './sync-operation';

// A persisted historic agreement is evidence, not an invitation to rewrite
// its quantities, pricing or UUID into the new commercial contract.
export function retiredContractReason(operation: Pick<SyncOperation, 'type' | 'body'>): string | null {
  if (operation.type === 'inventory.adjustment')
    return 'El control de existencias fue retirado. Conserva esta operación histórica y comprueba su resultado central antes de descartarla.';
  if (operation.type !== 'sale.create' || !operation.body || typeof operation.body !== 'object' || Array.isArray(operation.body)) return null;
  const lines = (operation.body as Record<string, unknown>).lines;
  if (!Array.isArray(lines)) return null;
  const historical = lines.some(line => line && typeof line === 'object' && ('lotId' in line || 'expectedLotVersion' in line));
  return historical ? 'Esta venta usa el contrato anterior con lotes. Sus datos y UUID se conservan; comprueba el resultado central y revisa el acuerdo antes de registrar una venta por variedades.' : null;
}
