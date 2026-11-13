import { loadCollectionPages } from "./collection-pages";
import { apiRequest } from "./api-client";

export type Account = {
  id: string;
  kind: "payable" | "receivable";
  state: "open" | "paid" | "voided";
  sourceType: string;
  sourceId: string;
  counterpartyType?: string;
  counterpartyId?: string;
  counterpartyName?: string | null;
  nextDueOn?: string | null;
  lastMovementAt?: string | null;
  initialAmountCents: string;
  balanceCents: string;
  version: number;
  createdAt: string;
};
export type Installment = {
  id: string;
  dueOn: string;
  initialAmountCents: string;
  balanceCents: string;
  state: "open" | "paid" | "voided";
};
export type Payment = {
  id: string;
  amountCents: string;
  isReversal: boolean;
  reversedPaymentId?: string | null;
  reason: string | null;
  createdAt: string;
};
export type AccountDetail = {
  account: Account;
  installments: Installment[];
  payments: Payment[];
};
export type CashMovement = {
  id: string;
  direction: "in" | "out";
  category: string;
  amountCents: string;
  sourceType: string;
  sourceId: string;
  createdByUserId: string;
  createdAt: string;
};
export type Carrier = { id: string; name: string; phone: string | null };
export type LogisticsVehicle = {
  id: string;
  plate: string;
  carrierId: string | null;
  description: string | null;
  carrier?: Carrier | null;
};
export type CommercialSummary = {
  purchases: { count: number; liquidAmountCents: string };
  sales: { count: number; totalAmountCents: string };
  accounts: { payableBalanceCents: string; receivableBalanceCents: string };
  cash: { incomingCents: string; outgoingCents: string; netCents: string };
  costs: {
    purchaseFreightCents: string;
    saleFreightCents: string;
    stowageCents: string;
  };
  generatedAt: string;
};
export type OperationOverview = {
  operation: 'purchase' | 'sale';
  period: { from: string; to: string };
  operationCount: string;
  counterpartyCount?: string;
  varietyCount?: string;
  totalAmountCents: string;
  sacks: string;
  weightKg: string;
  currentBalanceCents: string;
  openAccountCount: string;
  returnCount: string;
  returnAmountCents: string;
  generatedAt: string;
  balanceScope: 'current-for-period-operations';
  returnsScope: 'confirmed-in-period';
};
export type CommercialMargin = {
  estimatedCommercialMarginCents: string;
  indicatorName: string;
  undeterminedCostOperations: unknown[];
  components: {
    costOfGoodsSoldCents: string;
    netMerchandiseRevenueCents: string;
    saleFreightChargedCents: string;
    settledSaleFreightCostCents: string;
    settledStowageCostCents: string;
  };
};
export type ReportAlerts = {
  accountAlerts: {
    accountId: string;
    installmentId?: string;
    kind: "payable" | "receivable";
    dueOn: string;
    balanceCents: string;
    status: "overdue" | "due_soon";
  }[];
};
export type PriceHistoryItem = {
  qualityId?: string | null;
  qualityName?: string | null;
  originId?: string | null;
  originName?: string | null;
  sourceLineId?: string | null;
  operationType: "purchase" | "sale";
  operationId: string;
  occurredAt: string;
  varietyId: string;
  varietyName: string;
  counterpartyId: string;
  counterpartyName: string;
  priceBasis: "sack" | "kilogram";
  unitPriceCents: string;
};
export type PriceHistory = { items: PriceHistoryItem[]; generatedAt: string };
export type FreightEntry = {
  id: string;
  operationType: "purchase" | "sale";
  carrierId: string | null;
  basis: "kilogram" | "sack";
  derivedSacks: number;
  derivedWeightKg: string;
  amountCents: string;
  state: "pending" | "settled" | "voided";
};
export type WorkGroup = { id: string; name: string };
export type StowageEntry = {
  id: string;
  workGroupId: string;
  operationType: "purchase" | "sale";
  operationId: string;
  activity: "load" | "unload";
  amountCents: string;
  occurredOn: string;
  state: "pending" | "settled";
};

const auth = (token: string) => ({ token });
export const listAccounts = (token: string) =>
  loadCollectionPages<Account>("/accounts", token);
export const findAccountBySource = (
  token: string,
  sourceType: "purchase-settlement" | "sale",
  sourceId: string,
) => {
  const query = new URLSearchParams({ sourceType, sourceId });
  return apiRequest<{ account: Account | null }>(
    `/accounts/by-source?${query}`,
    auth(token),
  );
};
export const listCashMovements = (token: string) =>
  loadCollectionPages<CashMovement>("/accounts/cash/movements", token);
export const getAccount = (token: string, id: string) =>
  apiRequest<AccountDetail>(`/accounts/${id}`, auth(token));
export const registerPayment = (
  token: string,
  id: string,
  body: {
    clientOperationId: string;
    expectedAccountVersion: number;
    amountCents: number;
  },
) =>
  apiRequest<Payment>(`/accounts/${id}/payments`, {
    body,
    method: "POST",
    token,
  });
export const reversePayment = (
  token: string,
  accountId: string,
  paymentId: string,
  body: {
    clientOperationId: string;
    expectedAccountVersion: number;
    reason: string;
  },
) =>
  apiRequest<Payment>(`/accounts/${accountId}/payments/${paymentId}/reversal`, {
    body,
    method: "POST",
    token,
  });
export const listCarriers = (token: string) =>
  loadCollectionPages<Carrier>("/logistics/carriers", token);
export const listVehicles = (token: string) =>
  loadCollectionPages<LogisticsVehicle>("/logistics/vehicles", token);
export const createCarrier = (
  token: string,
  body: { name: string; phone?: string },
) =>
  apiRequest<Carrier>("/logistics/carriers", { body, method: "POST", token });
export const createVehicle = (
  token: string,
  body: { plate: string; carrierId?: string; description?: string },
) =>
  apiRequest<LogisticsVehicle>("/logistics/vehicles", {
    body,
    method: "POST",
    token,
  });
export const updateCarrier = (
  token: string,
  id: string,
  body: { name?: string; phone?: string },
) =>
  apiRequest<Carrier>(`/logistics/carriers/${id}`, {
    body,
    method: "PATCH",
    token,
  });
export const deactivateCarrier = (token: string, id: string) =>
  apiRequest<void>(`/logistics/carriers/${id}`, { method: "DELETE", token });
export const updateVehicle = (
  token: string,
  id: string,
  body: { plate?: string; carrierId?: string | null; description?: string },
) =>
  apiRequest<LogisticsVehicle>(`/logistics/vehicles/${id}`, {
    body,
    method: "PATCH",
    token,
  });
export const deactivateVehicle = (token: string, id: string) =>
  apiRequest<void>(`/logistics/vehicles/${id}`, { method: "DELETE", token });
export const commercialSummary = (token: string, from: string, to: string) =>
  apiRequest<CommercialSummary>(
    `/reports/commercial-summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    auth(token),
  );
export const operationOverview = (token: string, operation: 'purchase' | 'sale', from: string, to: string) =>
  apiRequest<OperationOverview>(`/reports/operation-overview?operation=${encodeURIComponent(operation)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, auth(token));
export const commercialMargin = (token: string, from: string, to: string) =>
  apiRequest<CommercialMargin>(
    `/reports/commercial-margin?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    auth(token),
  );
export const reportAlerts = (token: string, asOf: string, through: string) =>
  apiRequest<ReportAlerts>(
    `/reports/alerts?asOf=${encodeURIComponent(asOf)}&through=${encodeURIComponent(through)}`,
    auth(token),
  );
export const priceHistory = (
  token: string,
  from: string,
  to: string,
  filters: { buyerId?: string; providerId?: string; varietyId?: string; qualityId?: string; originId?: string } = {},
) => {
  const query = new URLSearchParams({ from, to });
  if (filters.varietyId) query.set("varietyId", filters.varietyId);
  if (filters.providerId) query.set("providerId", filters.providerId);
  if (filters.buyerId) query.set("buyerId", filters.buyerId);
  if (filters.qualityId) query.set("qualityId", filters.qualityId);
  if (filters.originId) query.set("originId", filters.originId);
  return apiRequest<PriceHistory>(
    `/reports/price-history?${query.toString()}`,
    auth(token),
  );
};
export const listFreightEntries = (token: string) =>
  loadCollectionPages<FreightEntry>("/freight/entries", token);
export const settleFreight = (
  token: string,
  body: { clientOperationId: string; settledOn: string; entryIds: string[] },
) => apiRequest("/freight/settlements", { body, method: "POST", token });
export const listWorkGroups = (token: string) =>
  loadCollectionPages<WorkGroup>("/stowage/groups", token);
export const createWorkGroup = (token: string, name: string) =>
  apiRequest<WorkGroup>("/stowage/groups", {
    body: { name },
    method: "POST",
    token,
  });
export const deactivateWorkGroup = (token: string, id: string) =>
  apiRequest<void>(`/stowage/groups/${id}`, { method: "DELETE", token });
export const listStowageEntries = (token: string) =>
  loadCollectionPages<StowageEntry>("/stowage/entries", token);
export const createStowageEntry = (
  token: string,
  body: {
    clientOperationId: string;
    workGroupId: string;
    operationType: "purchase" | "sale";
    operationId: string;
    activity: "load" | "unload";
    amountCents: number;
    occurredOn: string;
  },
) =>
  apiRequest<StowageEntry>("/stowage/entries", { body, method: "POST", token });
export const settleStowage = (
  token: string,
  body: { clientOperationId: string; settledOn: string; entryIds: string[] },
) => apiRequest("/stowage/settlements", { body, method: "POST", token });
