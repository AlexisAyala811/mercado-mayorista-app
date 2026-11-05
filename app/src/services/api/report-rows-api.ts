import { apiRequest } from './api-client';
import type { ReportSelection } from '@/services/reports/report-sharing';

export interface OperationReportRow {
  id: string; date: string; counterpartyId: string; counterparty: string;
  gross: string; freight: string; discounts: string; advances: string;
  amount: string; balance: string; sacks: string; weight: string;
}
export interface VarietyReportRow {
  id: string; name: string; operations: string; sacks: string; weight: string; subtotal: string | null;
}
type PageMetadata = { operation: 'purchase' | 'sale'; period: { from: string; to: string }; generatedAt: string; limit: number; offset: number; total: string };
export type ReportRowsPage = PageMetadata & (
  { report: 'detail'; items: OperationReportRow[] } | { report: 'variety'; items: VarietyReportRow[] }
);
export function listReportRows(token: string, selection: ReportSelection, report: 'detail' | 'variety', offset: number) {
  const query = new URLSearchParams({ ...selection, report, limit: '20', offset: String(offset) });
  return apiRequest<ReportRowsPage>(`/reports/rows?${query}`, { token });
}
