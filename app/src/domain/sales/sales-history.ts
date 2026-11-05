import { validateHistoryFilters } from "@/domain/shared/history-filters";
export type SalesHistoryFilters = {
  from: string;
  to: string;
  search: string;
  state: "all" | "confirmed" | "voided";
};
export const emptySalesHistoryFilters = (): SalesHistoryFilters => ({
  from: "",
  to: "",
  search: "",
  state: "all",
});
export const validateSalesHistoryFilters = validateHistoryFilters;
export function salesHistoryQuery(filters: SalesHistoryFilters) {
  return {
    from: filters.from.trim() || undefined,
    to: filters.to.trim() || undefined,
    search: filters.search.trim() || undefined,
    state: filters.state === "all" ? undefined : filters.state,
  };
}
export function formatSaleDate(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date)
    : "Fecha no disponible";
}
