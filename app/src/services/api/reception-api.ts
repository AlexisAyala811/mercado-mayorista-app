import { loadCollectionPages } from "./collection-pages";
import type { AuthenticatedSession } from "@/domain/auth/session";
import { loadOperationCatalogs } from "@/services/catalogs/operation-catalog-cache";
import { loadCatalogPages } from "./catalog-pages";
import type {CommercialCharacteristic,CommercialInput} from '@/domain/catalog/commercial-characteristic';
import type {
  Page,
  PotatoVariety,
  Provider,
  PurchaseSettlement,
  Reception,
  ReceptionSack,
  ReceptionState,
  Vehicle,
} from "@/domain/reception/reception";
import { apiRequest } from "@/services/api/api-client";

export type CreateReceptionInput = {
  clientOperationId: string;
  providerId: string;
  providerPhone?: string;
  vehicleId?: string;
  driverName: string;
  receivedOn: string;
  expectedVarietyIds: string[];
};

export type SackInput = CommercialInput&{
  clientOperationId: string;
  expectedReceptionVersion: number;
  varietyId: string;
  grossWeightKg: string;
  tareKg?: string;
};

export type SettlementInput = {
  clientOperationId: string;
  expectedReceptionVersion: number;
  lots: { varietyId: string; qualityId: string | null; priceBasis: "kilogram" | "sack"; unitPriceCents: number; name?: string }[];
  freightBasis?: "kilogram" | "sack";
  freightRateCents?: number;
  freightChargedTo?: "provider" | "wholesaler";
  advancesCents: number;
  discountsCents: number;
  paymentMode: "cash" | "credit";
  installments: { dueOn: string; amountCents: number }[];
};

const auth = (token: string) => ({ token });

export async function loadReceptionCatalogs(
  token: string,
  session: AuthenticatedSession,
) {
  return loadOperationCatalogs("reception", session, async () => {
    const [providers, varieties, vehicles,qualities,origins] = await Promise.all([
      loadCatalogPages<Provider>("/catalog/providers", token),
      loadCatalogPages<PotatoVariety>("/catalog/varieties", token),
      loadCatalogPages<Vehicle>("/logistics/vehicles", token),
      loadCatalogPages<CommercialCharacteristic>('/catalog/qualities',token),
      loadCatalogPages<CommercialCharacteristic>('/catalog/origins',token),
    ]);
    return { providers, varieties, vehicles,qualities,origins };
  });
}

export const createReception = (token: string, input: CreateReceptionInput) =>
  apiRequest<Reception>("/receptions", { body: input, method: "POST", token });

export const getReception = (token: string, id: string) =>
  apiRequest<Reception>(`/receptions/${id}`, auth(token));

export type ReceptionsHistoryQuery = {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  search?: string;
  providerId?: string;
  state?: ReceptionState;
};
export const listReceptions = (
  token: string,
  query: ReceptionsHistoryQuery = {},
) => {
  const params = new URLSearchParams({
    limit: String(query.limit ?? 100),
    offset: String(query.offset ?? 0),
  });
  for (const key of ["from", "to", "search", "providerId", "state"] as const) {
    if (query[key]) params.set(key, query[key]);
  }
  return apiRequest<Page<Reception>>(`/receptions?${params}`, auth(token));
};

export const getPurchaseSettlement = (token: string, receptionId: string) =>
  apiRequest<PurchaseSettlement>(
    `/purchases/receptions/${receptionId}/settlement`,
    auth(token),
  );

export const getSacks = (token: string, id: string) =>
  apiRequest<ReceptionSack[]>(`/receptions/${id}/sacks`, auth(token));

export const addSack = (token: string, id: string, input: SackInput) =>
  apiRequest<ReceptionSack>(`/receptions/${id}/sacks`, {
    body: input,
    method: "POST",
    token,
  });

export const correctSack = (
  token: string,
  receptionId: string,
  sackId: string,
  input: SackInput,
) =>
  apiRequest<ReceptionSack>(`/receptions/${receptionId}/sacks/${sackId}`, {
    body: input,
    method: "PATCH",
    token,
  });

export const closeWeighing = (
  token: string,
  id: string,
  expectedReceptionVersion: number,
  clientOperationId: string,
) =>
  apiRequest<Reception>(`/receptions/${id}/close-weighing`, {
    body: { clientOperationId, expectedReceptionVersion },
    method: "POST",
    token,
  });

export const settlePurchase = (
  token: string,
  id: string,
  input: SettlementInput,
) =>
  apiRequest<PurchaseSettlement>(`/purchases/receptions/${id}/settlement`, {
    body: input,
    method: "POST",
    token,
  });

export const voidReception = (
  token: string,
  id: string,
  body: {
    clientOperationId: string;
    expectedReceptionVersion: number;
    reason: string;
  },
) =>
  apiRequest<Reception>(`/receptions/${id}/void`, {
    body,
    method: "POST",
    token,
  });

export const voidSack = (
  token: string,
  receptionId: string,
  sackId: string,
  body: {
    clientOperationId: string;
    expectedReceptionVersion: number;
    reason: string;
  },
) =>
  apiRequest<ReceptionSack>(`/receptions/${receptionId}/sacks/${sackId}/void`, {
    body,
    method: "POST",
    token,
  });

export const correctClosedSack = (
  token: string,
  receptionId: string,
  sackId: string,
  body: SackInput & { reason: string },
) =>
  apiRequest<ReceptionSack>(
    `/receptions/${receptionId}/sacks/${sackId}/correct-closed`,
    { body, method: "POST", token },
  );

export const voidPurchase = (
  token: string,
  purchaseId: string,
  body: {
    clientOperationId: string;
    expectedPurchaseVersion: number;
    expectedReceptionVersion: number;
    reason: string;
  },
) =>
  apiRequest<PurchaseSettlement>(`/purchases/${purchaseId}/void`, {
    body,
    method: "POST",
    token,
  });


export const listAllReceptions = (token: string) =>
  loadCollectionPages<Reception>("/receptions", token);
