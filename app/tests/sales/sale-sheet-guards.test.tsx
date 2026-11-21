import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import type { Sale } from "@/domain/sales/sale";
import { SaleFlowScreen } from "@/features/sales/screens/sale-flow-screen";
import { getSale, loadSaleCatalogs } from "@/services/api/sales-api";
import { shareReceipt } from "@/services/receipts/receipt-sharing";
import { withChrome } from "../shared/with-chrome";

// Spec 019 (CL-19-01): the sale is always the Stitch sheet. These tests moved
// here from the old form: credit terms, durable saving before sending, the
// confirmation and its receipt, recovery and the exit guards.
let mockDistinctIds = false;
let mockNextId = 0;
const mockPreventRemove = jest.fn();
const mockBack = jest.fn();
const mockDispatch = jest.fn();
const mockEnqueue = jest.fn();
const mockSendQueued = jest.fn();
const mockReplace = jest.fn();
const mockInvalidate = jest.fn();
jest.mock("expo-symbols", () => ({ SymbolView: () => null }));
jest.mock("@/features/sync/sync-queue-provider", () => ({
  useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued }),
}));
const mockSession = {
  accessToken: "test-token",
  expiresAt: "2099-01-01T00:00:00Z",
  user: {
    businessId: "11111111-1111-4111-8111-111111111111",
    userId: "22222222-2222-4222-8222-222222222222",
    username: "Mayorista de prueba",
    role: "wholesaler",
    expiresAt: "2099-01-01T00:00:00Z",
  },
};
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({
    session: mockSession,
    invalidateSession: mockInvalidate,
  }),
}));
jest.mock("expo-router", () => ({
  useNavigation: () => ({ dispatch: mockDispatch }),
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: () => true,
  }),
}));
jest.mock("expo-router/react-navigation", () => ({
  usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args),
}));
jest.mock("@/navigation/use-browser-traversal-guard", () => ({
  useBrowserTraversalGuard: jest.fn(),
}));
jest.mock("@/services/api/sales-api", () => ({
  getSale: jest.fn(),
  loadSaleCatalogs: jest.fn(),
}));
jest.mock("@/services/api/catalog-api", () => ({
  createCatalogItem: jest.fn(),
  updateCatalogItem: jest.fn(),
}));
jest.mock("@/services/receipts/receipt-sharing", () => ({
  shareReceipt: jest.fn(async () => "file://sale.pdf"),
}));
jest.mock("@/domain/reception/reception", () => ({
  ...jest.requireActual("@/domain/reception/reception"),
  createOperationId: () =>
    mockDistinctIds ? `sale-operation-${++mockNextId}` : "sale-operation",
}));
function mockScreen(screenKind: string) {
  return (props: object) =>
    jest
      .requireActual("react")
      .createElement("test-control", { ...props, screenKind });
}
jest.mock("@/features/sales/screens/sale-sheet", () => ({
  SaleSheet: mockScreen("sheet"),
}));
jest.mock("@/features/sales/components/lot-dialog", () => ({
  LotDialog: mockScreen("lot"),
}));
jest.mock("@/features/catalog/screens/catalog-workspace", () => ({
  OperationReferenceEditor: mockScreen("reference-editor"),
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => react.createElement("test-control", props);
  return {
    AppButton: control,
    AppCard: control,
    AppScreen: (props: { children?: React.ReactNode }) =>
      react.createElement("test-screen", props, props.children),
    ChoiceDialog: control,
    ConfirmationDialog: control,
    FeedbackState: control,
    FormField: control,
    LoadingState: control,
    MetricTile: control,
    ScreenHeader: control,
    SelectionField: control,
    StepProgress: control,
  };
});

beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockDistinctIds = false;
  mockNextId = 0;
  mockEnqueue.mockResolvedValue({ id: "sale-operation", status: "pending" });
  mockSendQueued.mockResolvedValue({
    id: "sale-operation",
    status: "confirmed",
    centralReference: "central-sale",
  });
  jest
    .mocked(loadSaleCatalogs)
    .mockResolvedValue({
      buyers: [
        {
          id: "buyer",
          name: "Comprador",
          phone: null,
          destinationDepartment: "Lima",
          creditLimitCents: null,
        },
      ],
      vehicles: [],
      varieties: [{ id: "variety", name: "Papa" }],
    });
  const sale: Sale = {
    id: "central-sale",
    buyerId: "buyer",
    destinationDepartment: "Lima",
    grossAmountCents: "2500",
    freightAmountCents: "0",
    discountsCents: "0",
    totalAmountCents: "2500",
    paymentMode: "cash",
    state: "confirmed",
    version: 1,
    createdAt: "2026-10-04T00:00:00Z",
  };
  jest.mocked(getSale).mockResolvedValue({ sale, lines: [] });
});

const sheet = (root: ReactTestRenderer) =>
  root.root.findAll((node) => node.props.screenKind === "sheet")[0]!;
const review = (root: ReactTestRenderer) =>
  root.root.findAll((node) => node.props.title === "¿Confirmar la venta?")[0]!;
const exitPrompt = (root: ReactTestRenderer) =>
  root.root.findAll((node) => node.props.title === "¿Salir de la venta?")[0]!;
const confirmed = (root: ReactTestRenderer) =>
  root.root.findAll(
    (node) =>
      node.props.title === "Venta confirmada" ||
      node.props.testID === "confirmation-card",
  );

// A sale to «Comprador» with one lot of one sack of 10 kg at S/ 2.50, under review.
async function prepare() {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(withChrome(<SaleFlowScreen />));
  });
  await act(async () => {
    sheet(root).props.onPickBuyer("buyer");
  });
  const lineId = sheet(root).props.lines[0].id;
  await act(async () => {
    sheet(root).props.onChangeSlots(lineId, ["10"]);
    sheet(root).props.onChangeLine(lineId, "unitPrice", "2.50");
  });
  await act(async () => {
    sheet(root).props.onSave();
  });
  return root;
}
async function confirm(root: ReactTestRenderer) {
  await act(async () => {
    review(root).props.onConfirm();
    await Promise.resolve();
  });
}

it("reviews credit due dates and exact installment amounts without sending the sale", async () => {
  const root = await prepare();
  try {
    await act(async () => review(root).props.onCancel());
    await act(async () => {
      sheet(root).props.onChange("paymentMode", "credit");
    });
    await act(async () => {
      sheet(root).props.onAddInstallment();
    });
    const id = sheet(root).props.installments[0].id;
    await act(async () => {
      sheet(root).props.onChangeInstallment(id, "dueOn", "2099-10-31");
      sheet(root).props.onChangeInstallment(id, "amount", "24.00");
    });
    await act(async () => {
      sheet(root).props.onSave();
    });
    expect(review(root).props.visible).toBe(false);
    expect(sheet(root).props.errorMessage).toBe(
      "Las cuotas deben sumar exactamente el total de venta.",
    );
    await act(async () => {
      sheet(root).props.onChangeInstallment(id, "amount", "25.00");
    });
    await act(async () => {
      sheet(root).props.onSave();
    });
    expect(review(root).props.visible).toBe(true);
    expect(review(root).props.message).toContain(
      "Cuota 1: 2099-10-31 · S/ 25.00.",
    );
    await act(async () => review(root).props.onCancel());
    expect(sheet(root).props.installments[0].amount).toBe("25.00");
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(mockSendQueued).not.toHaveBeenCalled();
  } finally {
    await act(async () => root.unmount());
  }
});

it("saves the complete sale before sending, loads the confirmed detail and shares its receipt", async () => {
  const root = await prepare();
  await confirm(root);
  expect(mockEnqueue).toHaveBeenCalledWith(
    expect.objectContaining({
      id: "sale-operation",
      method: "POST",
      path: "/sales",
      type: "sale.create",
      body: expect.objectContaining({
        buyerId: "buyer",
        clientOperationId: "sale-operation",
        lines: [
          expect.objectContaining({
            varietyId: "variety",
            qualityId: null,
            originId: null,
            priceBasis: "kilogram",
            sacks: 1,
            unitPriceCents: 250,
            weightKg: "10",
          }),
        ],
      }),
    }),
  );
  expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(
    mockSendQueued.mock.invocationCallOrder[0]!,
  );
  expect(getSale).toHaveBeenCalledWith("test-token", "central-sale");
  expect(mockReplace).not.toHaveBeenCalled();
  // Spec 011 (RQ-ST04): one card with the receipt to share and the next sale.
  expect(
    root.root.findAll((node) => node.props.testID === "confirmation-card"),
  ).not.toHaveLength(0);
  await act(async () =>
    root.root
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "Compartir comprobante" &&
          node.props.onPress,
      )[0]!
      .props.onPress(),
  );
  expect(shareReceipt).toHaveBeenCalledWith(
    "sales",
    expect.any(String),
    "test-token",
    expect.any(Function),
  );
  await act(async () =>
    root.root
      .findAll(
        (node) =>
          node.props.accessibilityLabel === "Nueva venta" && node.props.onPress,
      )[0]!
      .props.onPress(),
  );
  expect(mockReplace).toHaveBeenCalledWith(
    expect.objectContaining({ pathname: "/sale-flow" }),
  );
  await act(async () => {
    root.unmount();
  });
});

it("sends two lots of the same variety with different commercial characteristics", async () => {
  mockDistinctIds = true;
  const qualityId = "33333333-3333-4333-8333-333333333333";
  jest
    .mocked(loadSaleCatalogs)
    .mockResolvedValue({
      buyers: [
        {
          id: "buyer",
          name: "Comprador",
          phone: null,
          destinationDepartment: "Lima",
          creditLimitCents: null,
        },
      ],
      vehicles: [],
      varieties: [{ id: "variety", name: "Papa" }],
      qualities: [
        { id: qualityId, name: "Calidad QA", kind: "quality", isActive: true },
      ],
      origins: [],
    });
  const root = await prepare();
  await act(async () => review(root).props.onCancel());
  await act(async () => {
    sheet(root).props.onAddLot();
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.screenKind === "lot")[0]!
      .props.onCreate({
        varietyId: "variety",
        qualityId,
        originId: null,
        unitPrice: "2.00",
        plannedSacks: 5,
      });
  });
  const second = sheet(root).props.lines[1];
  await act(async () => {
    sheet(root).props.onChangeSlots(second.id, ["10", "10"]);
  });
  await act(async () => {
    sheet(root).props.onSave();
  });
  await confirm(root);
  const body = mockEnqueue.mock.calls[0]![0].body;
  expect(body.lines).toHaveLength(2);
  expect(body.lines[0]).toMatchObject({
    varietyId: "variety",
    qualityId: null,
    originId: null,
  });
  expect(body.lines[1]).toMatchObject({
    varietyId: "variety",
    qualityId,
    originId: null,
    sacks: 2,
    weightKg: "20",
  });
  expect(body.lines[1]).not.toHaveProperty("qualityName");
  await act(async () => root.unmount());
});

it("does not send or navigate away when durable storage fails", async () => {
  mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));
  const root = await prepare();
  await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
  expect(sheet(root).props.errorMessage).toBe("Storage full");
  await act(async () => {
    root.unmount();
  });
});

it("opens recovery when the saved sale is not centrally confirmed", async () => {
  mockSendQueued.mockResolvedValueOnce({
    id: "sale-operation",
    status: "pending",
  });
  const root = await prepare();
  await confirm(root);
  expect(mockReplace).toHaveBeenCalledWith("/sync-queue");
  expect(getSale).not.toHaveBeenCalled();
  expect(confirmed(root)).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});

it("retries only the detail lookup after a centrally confirmed sale", async () => {
  jest.mocked(getSale).mockRejectedValueOnce(new Error("Detail unavailable"));
  const root = await prepare();
  await confirm(root);
  expect(confirmed(root)).not.toHaveLength(0);
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.label === "Reintentar consulta del detalle",
      )[0]!
      .props.onPress();
    await Promise.resolve();
  });
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(getSale).toHaveBeenCalledTimes(2);
  expect(
    root.root.findAll((node) => node.props.testID === "confirmation-card"),
  ).not.toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});

it("warns before leaving and keeps every edited field when the exit is cancelled", async () => {
  const root = await prepare();
  await act(async () => {
    review(root).props.onCancel();
  });
  await act(async () => {
    sheet(root).props.onBack();
  });
  expect(exitPrompt(root).props.visible).toBe(true);
  expect(mockBack).not.toHaveBeenCalled();
  await act(async () => {
    exitPrompt(root).props.onCancel();
  });
  expect(sheet(root).props).toMatchObject({
    buyerName: "Comprador",
    destination: "Lima",
  });
  expect(sheet(root).props.lines[0]).toMatchObject({ unitPrice: "2.50" });
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockBack).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});

it("continues the exact intercepted navigation action only after discard approval", async () => {
  const root = await prepare();
  const action = { type: "GO_BACK", source: "sale-route" };
  const [protect, callback] = mockPreventRemove.mock.calls.at(-1)!;
  expect(protect).toBe(true);
  await act(async () => {
    callback({ data: { action } });
  });
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async () => {
    exitPrompt(root).props.onConfirm();
  });
  expect(mockDispatch).toHaveBeenCalledWith(action);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});

it("locks the sheet and prevents route changes while durable saving is in progress", async () => {
  let finish!: () => void;
  mockEnqueue.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const root = await prepare();
  await confirm(root);
  expect(sheet(root).props.busy).toBe(true);
  const callback = mockPreventRemove.mock.calls.at(-1)![1];
  await act(async () => {
    callback({ data: { action: { type: "GO_BACK" } } });
  });
  expect(exitPrompt(root).props.visible).toBe(false);
  expect(mockDispatch).not.toHaveBeenCalled();
  await act(async () => {
    finish();
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(confirmed(root)).not.toHaveLength(0);
  expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);
  await act(async () => {
    root.unmount();
  });
});
