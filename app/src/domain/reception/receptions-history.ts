import type { ReceptionState } from "./reception";
import { validateHistoryFilters } from "@/domain/shared/history-filters";

export type ReceptionsHistoryFilters = {
  from: string;
  to: string;
  search: string;
  state: "all" | ReceptionState;
};
export const emptyReceptionsHistoryFilters = (): ReceptionsHistoryFilters => ({
  from: "",
  to: "",
  search: "",
  state: "all",
});
export const validateReceptionsHistoryFilters = validateHistoryFilters;
export function receptionsHistoryQuery(filters: ReceptionsHistoryFilters) {
  return {
    from: filters.from.trim() || undefined,
    to: filters.to.trim() || undefined,
    search: filters.search.trim() || undefined,
    state: filters.state === "all" ? undefined : filters.state,
  };
}
