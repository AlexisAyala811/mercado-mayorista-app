import type { UserRole } from '@/domain/auth/session';

export type ModuleId =
  | 'debts'
  | 'collections'
  | 'messaging'
  | 'analytics'
  | 'administration'
  | 'audit'
  | 'catalog'
  | 'inventory'
  | 'logistics'
  | 'logistics-costs'
  | 'purchase-history'
  | 'purchases'
  | 'receipts'
  | 'reports'
  | 'sales'
  | 'sales-history'
  | 'sync-queue';

// The Encargado records weighings, purchases and sales with a valid replacement,
// and reviews the operations saved on the tablet; the server still decides.
const assistantModules = new Set<ModuleId>(['purchases', 'sales', 'sync-queue']);

export function canAccessModule(role: UserRole, module: ModuleId) {
  // Reserved legacy module; retired by the approved no-inventory scope.
  if (module === 'inventory' || module === 'catalog') return false;
  return role === 'wholesaler' || (role === 'assistant' && assistantModules.has(module));
}

export function isWholesaler(role: UserRole | undefined): role is 'wholesaler' {
  return role === 'wholesaler';
}
