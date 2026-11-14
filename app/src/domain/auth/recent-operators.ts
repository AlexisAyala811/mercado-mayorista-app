import type { UserRole } from '@/domain/auth/session';

// Spec 011 (RQ-ST12, CL-ST16): quick operator selection of the Stitch login.
// The list holds only who already signed in on this tablet: a username and
// its role, never a password or a token, and it is never asked to the server.
export type RecentOperator = { role: UserRole; username: string };

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
      .map((item) => ({ role: item.role, username: item.username }))
      .slice(0, maxRecentOperators);
  } catch {
    return [];
  }
}

// The latest operator goes first; the same username is kept once.
export function rememberOperator(list: readonly RecentOperator[], operator: RecentOperator): RecentOperator[] {
  return [operator, ...list.filter((item) => !same(item.username, operator.username))].slice(0, maxRecentOperators);
}

export function forgetOperator(list: readonly RecentOperator[], username: string): RecentOperator[] {
  return list.filter((item) => !same(item.username, username));
}

export function operatorInitials(username: string) {
  const parts = username.trim().split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[1]![0]}` : username.trim().slice(0, 2);
  return letters.toUpperCase();
}

export const operatorRoleLabel = (role: UserRole) => (role === 'wholesaler' ? 'Mayorista' : 'Encargado');
