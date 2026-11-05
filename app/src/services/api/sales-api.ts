import { loadCollectionPages } from "./collection-pages";
import type { AuthenticatedSession } from "@/domain/auth/session";
import { loadOperationCatalogs } from "@/services/catalogs/operation-catalog-cache";
import { loadCatalogPages } from "./catalog-pages";
import type {CommercialCharacteristic,CommercialInput,CommercialSnapshot} from '@/domain/catalog/commercial-characteristic';
import type {
  Page,
  PotatoVariety,
  Vehicle,
} from "@/domain/reception/reception";
import type { Buyer, Sale } from "@/domain/sales/sale";
import { apiRequest } from "@/services/api/api-client";

export type CreateSaleInput = {
  clientOperationId: string;
  buyerId: string;
  destinationDepartment: string;
  vehicleId?: string;
  driverName?: string;
  lines: (CommercialInput&{
    varietyId: string;
    sacks: number;
    weightKg: string;
    priceBasis: "kilogram" | "sack";
    unitPriceCents: number;
  })[];
  freightBasis?: "kilogram" | "sack";
  freightRateCents?: number;
  freightIncludedInTotal: boolean;
  discountsCents: number;
  paymentMode: "cash" | "credit";
  installments: { dueOn: string; amountCents: number }[];
};

const auth = (token: string) => ({ token });

export async function loadSaleCatalogs(
  token: string,
  session: AuthenticatedSession,
) {
  return loadOperationCatalogs("sale", session, async () => {
    const [buyers, vehicles, varieties,qualities,origins] = await Promise.all([
      loadCatalogPages<Buyer>("/catalog/buyers", token),
      loadCatalogPages<Vehicle>("/logistics/vehicles", token),
      loadCatalogPages<PotatoVariety>("/catalog/varieties", token),
      loadCatalogPages<CommercialCharacteristic>('/catalog/qualities',token),
      loadCatalogPages<CommercialCharacteristic>('/catalog/origins',token),
    ]);
    return { buyers, vehicles, varieties,qualities,origins };
  });
}

export const createSale = (token: string, input: CreateSaleInput) =>
  apiRequest<Sale>("/sales", { body: input, method: "POST", token });

export type SalesHistoryQuery = {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  search?: string;
  buyerId?: string;
  state?: "confirmed" | "voided";
};
export const listSales = (token: string, query: SalesHistoryQuery = {}) => {
  const params = new URLSearchParams({
    limit: String(query.limit ?? 100),
    offset: String(query.offset ?? 0),
  });
  for (const key of ["from", "to", "search", "buyerId", "state"] as const)
    if (query[key]) params.set(key, query[key]!);
  return apiRequest<Page<Sale>>(`/sales?${params.toString()}`, auth(token));
};

export type SaleLine = Partial<CommercialSnapshot>&{
  id: string;
  varietyId: string;
  lotId: string | null;
  sacks: number;
  weightKg: string;
  priceBasis: "kilogram" | "sack";
  unitPriceCents: string;
  subtotalCents: string;
  lotVersion: number | null;
};
export type SaleDetail = { sale: Sale; lines: SaleLine[] };
export const getSale = (token: string, id: string) =>
  apiRequest<SaleDetail>(`/sales/${id}`, auth(token));
export const voidSale = (
  token: string,
  id: string,
  body: {
    clientOperationId: string;
    expectedSaleVersion: number;
    reason: string;
  },
) => apiRequest<Sale>(`/sales/${id}/void`, { body, method: "POST", token });
export type CommercialReturnResult = {
  saleReturn: { id: string; totalRefundCents: string };
  lines: unknown[];
};
export const createCommercialReturn = (
  token: string,
  id: string,
  body: {
    clientOperationId: string;
    expectedSaleVersion: number;
    reason: string;
    freightAdjustmentCents: number;
    lines: {
      saleLineId: string;
      sacks: number;
      weightKg: string;
      authorizedGrossCents: number;
    }[];
  },
) =>
  apiRequest<CommercialReturnResult>(`/sales/${id}/commercial-returns`, {
    body,
    method: "POST",
    token,
  });


export const listAllSales = (token: string) =>
  loadCollectionPages<Sale>("/sales", token);

