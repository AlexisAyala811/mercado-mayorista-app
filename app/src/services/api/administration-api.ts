import type { Page } from '@/domain/reception/reception';
import { apiRequest } from './api-client';
import type { AuditEventFilters } from '@/domain/audit/audit-filters';

export type Assistant = {
  id: string;
  businessId: string;
  username: string;
  role: 'assistant';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Delegation = {
  id: string;
  businessId: string;
  assistantUserId: string;
  authorizedByUserId: string;
  startsAt: string;
  expiresAt: string;
  reason: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  action: string;
  actorUserId: string | null;
  resourceId: string | null;
  resourceType: string;
  details: Record<string, unknown>;
  occurredAt: string;
  retentionUntil: string;
};

const auth = (token: string) => ({ token });

export const listAssistants = (token: string) => apiRequest<Page<Assistant>>('/identity/assistants?limit=100&offset=0', auth(token));
export const createAssistant = (token: string, body: { username: string; password: string }) => apiRequest<Assistant>('/identity/assistants', { body, method: 'POST', token });
export const resetAssistantPassword = (token: string, id: string, password: string) => apiRequest<void>(`/identity/assistants/${id}/password`, { body: { password }, method: 'PATCH', token });
export const deactivateAssistant = (token: string, id: string) => apiRequest<void>(`/identity/assistants/${id}`, { method: 'DELETE', token });
export const listDelegations = (token: string) => apiRequest<Page<Delegation>>('/identity/delegations?limit=100&offset=0', auth(token));
export const createDelegation = (token: string, assistantId: string, body: { startsAt: string; expiresAt: string; reason?: string }) => apiRequest<Delegation>(`/identity/assistants/${assistantId}/delegations`, { body, method: 'POST', token });
export const revokeDelegation = (token: string, id: string) => apiRequest<void>(`/identity/delegations/${id}`, { method: 'DELETE', token });

export function listAuditEvents(token: string, filters: AuditEventFilters, offset = 0) {
  const query = new URLSearchParams({ limit: '20', offset: String(offset) });
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
  return apiRequest<Page<AuditEvent>>(`/audit/events?${query.toString()}`, auth(token));
}
