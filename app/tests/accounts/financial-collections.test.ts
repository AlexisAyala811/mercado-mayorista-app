import { ApiUnavailableError, apiRequest } from "@/services/api/api-client";
import { loadCollectionPages } from "@/services/api/collection-pages";
import { listAllReceptions } from "@/services/api/reception-api";
import { listAllSales } from "@/services/api/sales-api";
import {
  listAccounts,
  listCashMovements,
  listCarriers,
  listVehicles,
  listFreightEntries,
  listWorkGroups,
  listStowageEntries,
} from "@/services/api/operations-api";

jest.mock("@/services/api/api-client", () => ({
  ...jest.requireActual("@/services/api/api-client"),
  apiRequest: jest.fn(),
}));
beforeEach(() => jest.resetAllMocks());

it.each([
  ["/accounts", listAccounts],
  ["/accounts/cash/movements", listCashMovements],
  ["/logistics/carriers", listCarriers],
  ["/logistics/vehicles", listVehicles],
  ["/freight/entries", listFreightEntries],
  ["/stowage/groups", listWorkGroups],
  ["/stowage/entries", listStowageEntries],
  ["/receptions", listAllReceptions],
  ["/sales", listAllSales],
] as const)(
  "loads the record beyond 100 for %s without omitting authorization",
  async (path, load) => {
    jest.mocked(apiRequest).mockResolvedValueOnce({
      items: Array.from({ length: 100 }, (_, i) => ({ id: `item-${i}` })),
      total: 101,
    });
    jest
      .mocked(apiRequest)
      .mockResolvedValueOnce({ items: [{ id: "item-100" }], total: 101 });
    const page = await load("verified-token");
    expect(page).toMatchObject({ limit: 101, offset: 0, total: 101 });
    expect(page.items).toHaveLength(101);
    expect(page.items[100].id).toBe("item-100");
    expect(apiRequest).toHaveBeenNthCalledWith(
      2,
      `${path}?limit=100&offset=100`,
      { token: "verified-token" },
    );
  },
);

it("propagates a failed second page instead of publishing partial financial history", async () => {
  jest
    .mocked(apiRequest)
    .mockResolvedValueOnce({ items: [{ id: "one" }], total: 2 });
  jest.mocked(apiRequest).mockRejectedValueOnce(new ApiUnavailableError());
  await expect(
    loadCollectionPages("/accounts", "token"),
  ).rejects.toBeInstanceOf(ApiUnavailableError);
});
it("rejects a changing central total instead of declaring the collection complete", async () => {
  jest
    .mocked(apiRequest)
    .mockResolvedValueOnce({ items: [{ id: "one" }], total: 2 });
  jest
    .mocked(apiRequest)
    .mockResolvedValueOnce({ items: [{ id: "two" }], total: 3 });
  await expect(loadCollectionPages("/accounts", "token")).rejects.toThrow(
    "cambió",
  );
});
it("rejects a repeated record which would conceal a missing financial entry", async () => {
  jest
    .mocked(apiRequest)
    .mockResolvedValueOnce({ items: [{ id: "one" }], total: 2 });
  jest
    .mocked(apiRequest)
    .mockResolvedValueOnce({ items: [{ id: "one" }], total: 2 });
  await expect(loadCollectionPages("/accounts", "token")).rejects.toThrow(
    "repetidos",
  );
});
it("assembles an actual empty collection with no invented financial records", async () => {
  jest.mocked(apiRequest).mockResolvedValueOnce({ items: [], total: 0 });
  await expect(loadCollectionPages("/accounts", "token")).resolves.toEqual({
    items: [],
    total: 0,
    limit: 0,
    offset: 0,
  });
});
