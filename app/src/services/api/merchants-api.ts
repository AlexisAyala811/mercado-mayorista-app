import type { Page } from '@/domain/reception/reception';

import { apiRequest } from './api-client';

// Spec 023: account support for the Administrator. These routes never return
// a merchant's operations, only its business and its Wholesaler's account.
export type Merchant = {
  createdAt: string;
  displayName: string;
  id: string;
  isActive: boolean;
  wholesaler: {
    id: string;
    isActive: boolean;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
    username: string;
  } | null;
};

export type MerchantStatus = {
  activeAssistants: number;
  failedLoginAttempts: number;
  lastFailedLoginAt: string | null;
  merchant: Merchant;
  openSessions: number;
};

type Action = { clientOperationId: string; reason: string };

export function listMerchants(token: string, search = '', offset = 0) {
  const query = new URLSearchParams({ limit: '50', offset: String(offset) });
  if (search.trim()) query.set('search', search.trim());
  return apiRequest<Page<Merchant>>(`/admin/merchants?${query.toString()}`, { token });
}

export const getMerchantStatus = (token: string, id: string) =>
  apiRequest<MerchantStatus>(`/admin/merchants/${id}/status`, { token });

export const createMerchant = (
  token: string,
  body: { businessName: string; clientOperationId: string; temporaryPassword: string; username: string },
) => apiRequest<Merchant>('/admin/merchants', { body, method: 'POST', token });

export const suspendMerchant = (token: string, id: string, body: Action) =>
  apiRequest<Merchant>(`/admin/merchants/${id}/suspend`, { body, method: 'POST', token });

export const reactivateMerchant = (token: string, id: string, body: Action) =>
  apiRequest<Merchant>(`/admin/merchants/${id}/reactivate`, { body, method: 'POST', token });

export const resetMerchantPassword = (token: string, id: string, body: Action & { temporaryPassword: string }) =>
  apiRequest<Merchant>(`/admin/merchants/${id}/password-reset`, { body, method: 'POST', token });

export const revokeMerchantSessions = (token: string, id: string, body: Action) =>
  apiRequest<{ merchantId: string; revokedSessions: number }>(`/admin/merchants/${id}/sessions/revoke`, { body, method: 'POST', token });
