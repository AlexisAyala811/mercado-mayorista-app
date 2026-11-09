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
// Spec 011 (CL-ST10): one row per day in Lima, for the bars of Reportes.
export interface DailyReportRow {
  id: string; date: string; operations: string; sacks: string; weight: string; amount: string;
}
export type ReportRowsPage = PageMetadata & (
  { report: 'detail'; items: OperationReportRow[] } | { report: 'variety'; items: VarietyReportRow[] }
);
export function listReportRows(token: string, selection: ReportSelection, report: 'detail' | 'variety', offset: number) {
  const query = new URLSearchParams({ ...selection, report, limit: '20', offset: String(offset) });
  return apiRequest<ReportRowsPage>(`/reports/rows?${query}`, { token });
}

// Every row of the variety or the daily report, page after page (the server
// serves 20 per page).
export async function listAllReportRows<Report extends 'variety' | 'daily'>(token: string, selection: ReportSelection, report: Report) {
  type Row = Report extends 'daily' ? DailyReportRow : VarietyReportRow;
  const items: Row[] = [];
  for (let offset = 0; ; offset += 20) {
    const query = new URLSearchParams({ ...selection, report, limit: '20', offset: String(offset) });
    const page = await apiRequest<PageMetadata & { items: Row[] }>(`/reports/rows?${query}`, { token });
    items.push(...page.items);
    if (!page.items.length || items.length >= Number(page.total)) return items;
  }
}
