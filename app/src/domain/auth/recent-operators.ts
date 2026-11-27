import type { UserRole } from '@/domain/auth/session';

// Spec 011 (RQ-ST12, CL-ST16): quick operator selection of the Stitch login.
// The list holds only who already signed in on this tablet: a username and
// its role, never a password or a token, and it is never asked to the server.
// Spec 023 (CL-23-06): it also keeps the business, so the tablet only
// remembers the people of the last business that signed in on it.
export type RecentOperator = { businessId?: string; role: UserRole; username: string };

export const maxRecentOperators = 4;

const same = (left: string, right: string) => left.trim().toLowerCase() === right.trim().toLowerCase();

export function parseRecentOperators(value: string | null): RecentOperator[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is RecentOperator =>
        Boolean(item) && typeof item.username === 'string' && item.username.trim().length > 0 && (item.role === 'assistant' || item.role === 'wholesaler'))
      .map((item) => (typeof item.businessId === 'string' ? { businessId: item.businessId, role: item.role, username: item.username } : { role: item.role, username: item.username }))
      .slice(0, maxRecentOperators);
  } catch {
    return [];
  }
}

// The latest operator goes first; the same username is kept once. Someone of
// another business starts the list again (CL-23-06): a merchant never sees
// the usernames of another merchant on a tablet that changed hands.
export function rememberOperator(list: readonly RecentOperator[], operator: RecentOperator): RecentOperator[] {
  const sameBusiness = list.filter((item) => item.businessId === operator.businessId);
  return [operator, ...sameBusiness.filter((item) => !same(item.username, operator.username))].slice(0, maxRecentOperators);
}

export function forgetOperator(list: readonly RecentOperator[], username: string): RecentOperator[] {
  return list.filter((item) => !same(item.username, username));
}

export function operatorInitials(username: string) {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : username.trim().slice(0, 2);
  return letters.toUpperCase();
}

export const operatorRoleLabel = (role: UserRole) => (role === 'wholesaler' ? 'Mayorista' : role === 'admin' ? 'Administrador' : 'Encargado');
