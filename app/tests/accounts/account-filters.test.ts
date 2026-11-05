import {
  accountCounterpartyName,
  filterAccounts,
} from "@/domain/accounts/account-filters";
const accounts = [
  {
    id: "account-1",
    kind: "payable" as const,
    state: "open" as const,
    counterpartyName: "José Álvarez",
    counterpartyType: "provider",
    counterpartyId: "provider-1",
  },
  {
    id: "account-2",
    kind: "receivable" as const,
    state: "paid" as const,
    counterpartyName: "Rosa",
    counterpartyType: "buyer",
    counterpartyId: "buyer-1",
  },
];
it("combines literal name/reference search with kind and state without changing input", () => {
  expect(
    filterAccounts(accounts, {
      search: "JOSE ALVAREZ",
      kind: "payable",
      state: "open",
    }),
  ).toEqual([accounts[0]]);
  expect(
    filterAccounts(accounts, {
      search: "account-2",
      kind: "all",
      state: "all",
    }),
  ).toEqual([accounts[1]]);
  expect(
    filterAccounts(accounts, { search: "buyer-1", kind: "all", state: "all" }),
  ).toEqual([accounts[1]]);
  expect(
    filterAccounts(accounts, {
      search: "Jose",
      kind: "receivable",
      state: "all",
    }),
  ).toEqual([]);
  expect(accounts).toHaveLength(2);
});
it("does not invent names for absent historical counterparties", () => {
  expect(
    accountCounterpartyName({ ...accounts[0], counterpartyName: null }),
  ).toBe("Proveedor sin nombre disponible");
  expect(
    accountCounterpartyName({ ...accounts[1], counterpartyName: "" }),
  ).toBe("Comprador sin nombre disponible");
});
