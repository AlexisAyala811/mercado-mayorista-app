import type { UserRole } from '@/domain/auth/session';

export type ModuleId =
  | 'accounts'
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
  | 'sales-history';

const assistantModules = new Set<ModuleId>(['purchases', 'sales']);

export function canAccessModule(role: UserRole, module: ModuleId) {
  // Reserved legacy module; retired by the approved no-inventory scope.
  if (module === 'inventory' || module === 'catalog') return false;
  return role === 'wholesaler' || (role === 'assistant' && assistantModules.has(module));
}

export function isWholesaler(role: UserRole | undefined): role is 'wholesaler' {
  return role === 'wholesaler';
}
