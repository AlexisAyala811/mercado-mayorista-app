type AccountReference = {
  id: string;
  kind: "payable" | "receivable";
  state: "open" | "paid" | "voided";
  counterpartyId?: string;
  counterpartyType?: string;
  counterpartyName?: string | null;
};

export type AccountFilters = {
  search: string;
  kind: "all" | AccountReference["kind"];
  state: "all" | AccountReference["state"];
};
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-PE");
export function filterAccounts<T extends AccountReference>(
  accounts: T[],
  filters: AccountFilters,
): T[] {
  const search = normalize(filters.search.trim());
  return accounts.filter(
    (account) =>
      (filters.kind === "all" || account.kind === filters.kind) &&
      (filters.state === "all" || account.state === filters.state) &&
      (!search ||
        normalize(
          `${account.counterpartyName ?? ""} ${account.id} ${account.counterpartyId ?? ""}`,
        ).includes(search)),
  );
}
export function accountCounterpartyName(account: AccountReference) {
  return (
    account.counterpartyName?.trim() ||
    (account.counterpartyType === "provider"
      ? "Proveedor sin nombre disponible"
      : account.counterpartyType === "buyer"
        ? "Comprador sin nombre disponible"
        : "Contraparte no disponible")
  );
}
