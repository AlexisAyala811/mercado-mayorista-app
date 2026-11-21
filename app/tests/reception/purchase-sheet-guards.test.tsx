import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

import {
  clearInitialPurchaseDraft,
  readInitialPurchaseDraft,
} from "@/domain/reception/initial-purchase-draft";
import type { Reception } from "@/domain/reception/reception";
import type { SyncOperation } from "@/domain/sync/sync-operation";
import { PurchaseFlowScreen } from "@/features/reception/screens/purchase-flow-screen";
import {
  createReception,
  getPurchaseSettlement,
  getReception,
  getSacks,
  loadReceptionCatalogs,
} from "@/services/api/reception-api";

// Spec 019 (CL-19-01): the purchase is always the Stitch sheet, on the tablet
// and on the phone. These tests moved here from the step by step flow: the
// exit guards, the recovery of a saved reception, storage failures, credit
// terms and corrections, now driven through the sheet.
const mockEnqueue = jest.fn();
const mockSendQueued = jest.fn();
const mockReplace = jest.fn();
const mockInvalidate = jest.fn();
const mockPreventRemove = jest.fn();
const mockDispatch = jest.fn();
const mockBack = jest.fn();
const mockCanGoBack = jest.fn();
const mockBrowserTraversalGuard = jest.fn();
let mockQueuedOperations: SyncOperation[] = [];
let mockQueueLoading = false;
let mockQueueError: string | null = null;
let mockIdIndex = 0;
const mockIds = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
  "00000000-0000-4000-8000-000000000005",
];
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
jest.mock("@/features/sync/sync-queue-provider", () => ({
  useSyncQueue: () => ({
    enqueue: mockEnqueue,
    sendQueued: mockSendQueued,
    operations: mockQueuedOperations,
    isLoadingQueue: mockQueueLoading,
    queueError: mockQueueError,
  }),
}));
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({
    session: mockSession,
    invalidateSession: mockInvalidate,
    isOfflineSession: false,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    back: mockBack,
    canGoBack: mockCanGoBack,
  }),
  useNavigation: () => ({ dispatch: mockDispatch }),
}));
jest.mock("expo-router/react-navigation", () => ({
  usePreventRemove: (...args: unknown[]) => mockPreventRemove(...args),
}));
jest.mock("@/navigation/use-browser-traversal-guard", () => ({
  useBrowserTraversalGuard: (...args: unknown[]) =>
    mockBrowserTraversalGuard(...args),
}));
jest.mock("@/services/api/reception-api", () => ({
  addSack: jest.fn(),
  closeWeighing: jest.fn(),
  correctSack: jest.fn(),
  createReception: jest.fn(),
  getReception: jest.fn(),
  getSacks: jest.fn(),
  getPurchaseSettlement: jest.fn(),
  loadReceptionCatalogs: jest.fn(),
}));
jest.mock("@/services/api/catalog-api", () => ({
  createCatalogItem: jest.fn(),
}));
jest.mock("@/domain/reception/reception", () => ({
  ...jest.requireActual("@/domain/reception/reception"),
  createOperationId: () => mockIds[mockIdIndex++],
}));
function mockScreen(screenKind: string) {
  return (props: object) =>
    jest
      .requireActual("react")
      .createElement("test-control", { ...props, screenKind });
}
jest.mock("@/features/reception/screens/purchase-sheet", () => ({
  PurchaseSheet: mockScreen("sheet"),
}));
jest.mock("@/features/sales/components/lot-dialog", () => ({
  LotDialog: mockScreen("lot"),
}));
jest.mock("@/features/reception/screens/purchase-confirmation-screen", () => ({
  PurchaseConfirmationScreen: mockScreen("confirmation"),
}));
jest.mock("@/features/catalog/screens/catalog-workspace", () => ({
  OperationReferenceEditor: mockScreen("reference-editor"),
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => react.createElement("test-control", props);
  return {
    AppScreen: control,
    ChoiceDialog: control,
    ConfirmationDialog: control,
    FeedbackState: control,
    LoadingState: control,
  };
});

const reception: Reception = {
  id: "reception-id",
  providerId: "provider-id",
  providerPhone: null,
  vehicleId: null,
  driverName: "Conductor",
  receivedOn: "2026-10-04",
  state: "draft",
  version: 0,
  expectedVarieties: [{ id: "variety-id", name: "Papa" }],
};
const saved: Reception = {
  ...reception,
  id: "saved-reception",
  receivedOn: "2026-10-06",
  state: "weighing",
  version: 7,
};
const sack = {
  id: "sack-id",
  sequence: 1,
  varietyId: "variety-id",
  grossWeightKg: "100.000",
  tareKg: "0.000",
  netWeightKg: "100.000",
};

beforeEach(() => {
  clearInitialPurchaseDraft();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockIdIndex = 0;
  mockCanGoBack.mockReturnValue(false);
  mockQueuedOperations = [];
  mockQueueLoading = false;
  mockQueueError = null;
  mockEnqueue.mockResolvedValue({ status: "pending" });
  mockSendQueued.mockImplementation(async (id: string) => ({
    id,
    status: "confirmed",
    centralReference:
      id === mockIds[0]
        ? "reception-id"
        : id === mockIds[1]
          ? "sack-id"
          : "central-purchase",
  }));
  jest
    .mocked(loadReceptionCatalogs)
    .mockResolvedValue({
      providers: [{ id: "provider-id", name: "Proveedor", phone: null }],
      vehicles: [],
      varieties: [{ id: "variety-id", name: "Papa" }],
    });
  jest
    .mocked(getReception)
    .mockReset()
    .mockResolvedValueOnce(reception)
    .mockResolvedValueOnce({ ...reception, state: "weighing", version: 1 })
    .mockResolvedValue({ ...reception, state: "weighed", version: 2 });
  jest.mocked(getSacks).mockResolvedValue([sack]);
  jest
    .mocked(getPurchaseSettlement)
    .mockResolvedValue({
      id: "central-purchase",
      grossAmountCents: "25000",
      freightAmountCents: "0",
      advancesCents: "0",
      discountsCents: "0",
      liquidAmountCents: "25000",
      paymentMode: "cash",
      state: "confirmed",
      version: 1,
    });
});

const sheet = (root: ReactTestRenderer) =>
  root.root.findAll((node) => node.props.screenKind === "sheet")[0]!;
const byLabel = (root: ReactTestRenderer, confirmLabel: string) =>
  root.root.findAll((node) => node.props.confirmLabel === confirmLabel)[0]!;
const byTitle = (root: ReactTestRenderer, title: string) =>
  root.root.findAll((node) => node.props.title === title)[0]!;
const saveDialog = (root: ReactTestRenderer) =>
  byTitle(root, "¿Guardar la compra?");
const lotPrice = (root: ReactTestRenderer) =>
  (Object.values(sheet(root).props.values.lots) as { unitPrice: string }[])[0]
    ?.unitPrice;

async function render(element: React.ReactElement) {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(element);
  });
  return root;
}
const openNew = () => render(<PurchaseFlowScreen />);
const openSaved = (id = "saved-reception") =>
  render(<PurchaseFlowScreen initialReceptionId={id} />);
async function fillDetails(root: ReactTestRenderer) {
  await act(async () => {
    sheet(root).props.onSelectProvider();
  });
  await act(async () => {
    byTitle(root, "Seleccionar proveedor").props.onSelect({
      id: "provider-id",
      label: "Proveedor",
    });
  });
  await act(async () => {
    sheet(root).props.onChangeDetail("driverName", "Conductor");
  });
  await act(async () => {
    sheet(root).props.onAddVariety();
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.screenKind === "lot")[0]!
      .props.onCreate({
        varietyId: "variety-id",
        qualityId: null,
        originId: null,
        unitPrice: "",
        plannedSacks: 10,
      });
  });
}
async function addSack(root: ReactTestRenderer, gross = "100") {
  await act(async () => {
    sheet(root).props.onGrossChange(gross);
  });
  await act(async () => {
    sheet(root).props.onSaveSack();
    await Promise.resolve();
  });
}
async function askSave(root: ReactTestRenderer) {
  await act(async () => {
    sheet(root).props.onChangeLot(
      sheet(root).props.lots[0].key,
      "unitPrice",
      "2.50",
    );
  });
  await act(async () => {
    sheet(root).props.onSave();
  });
}
async function confirmSave(root: ReactTestRenderer) {
  await act(async () => {
    saveDialog(root).props.onConfirm();
    await Promise.resolve();
  });
}
// A new purchase with one sack of 100 kg, priced and waiting for «Guardar compra».
async function prepare() {
  const root = await openNew();
  await fillDetails(root);
  await addSack(root);
  await askSave(root);
  return root;
}

describe.each(["weighing", "weighed"] as const)(
  "route removal from a recovered reception %s",
  (state) => {
    async function open() {
      jest
        .mocked(getReception)
        .mockReset()
        .mockResolvedValue({ ...saved, state });
      return openSaved();
    }
    const exit = (root: ReactTestRenderer) =>
      byLabel(root, "Salir sin guardar estos datos");
    async function edit(root: ReactTestRenderer) {
      await act(async () => {
        if (state === "weighing") sheet(root).props.onGrossChange("51");
        else
          sheet(root).props.onChangeLot(
            sheet(root).props.lots[0].key,
            "unitPrice",
            "2.50",
          );
      });
    }
    const expectEdited = (root: ReactTestRenderer) =>
      expect(
        state === "weighing" ? sheet(root).props.gross : lotPrice(root),
      ).toBe(state === "weighing" ? "51" : "2.50");

    it("does not block a clean recovered sheet", async () => {
      const root = await open();
      expect(mockPreventRemove.mock.calls.at(-1)![0]).toBe(false);
      expect(mockBrowserTraversalGuard.mock.calls.at(-1)![0]).toBe(false);
      await act(async () => {
        root.unmount();
      });
    });
    it("preserves edits on cancel and dispatches the original native removal only on discard", async () => {
      const root = await open();
      await edit(root);
      const [enabled, request] = mockPreventRemove.mock.calls.at(-1)!;
      expect(enabled).toBe(true);
      const action = { type: "GO_BACK", source: "recovered-purchase" };
      await act(async () => request({ data: { action } }));
      expect(exit(root).props.visible).toBe(true);
      expect(mockDispatch).not.toHaveBeenCalled();
      await act(async () => exit(root).props.onCancel());
      expectEdited(root);
      await act(async () =>
        mockPreventRemove.mock.calls.at(-1)![1]({ data: { action } }),
      );
      await act(async () => exit(root).props.onConfirm());
      expect(mockDispatch).toHaveBeenCalledTimes(1);
      expect(mockDispatch).toHaveBeenCalledWith(action);
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
      await act(async () => {
        root.unmount();
      });
    });
    it("resumes the intercepted web history traversal only after discard", async () => {
      const root = await open();
      await edit(root);
      const leave = jest.fn();
      const [enabled, , request] = mockBrowserTraversalGuard.mock.calls.at(-1)!;
      expect(enabled).toBe(true);
      await act(async () => request(leave));
      expect(exit(root).props.visible).toBe(true);
      expect(leave).not.toHaveBeenCalled();
      await act(async () => exit(root).props.onCancel());
      expectEdited(root);
      await act(async () =>
        mockBrowserTraversalGuard.mock.calls.at(-1)![2](leave),
      );
      await act(async () => exit(root).props.onConfirm());
      expect(leave).toHaveBeenCalledTimes(1);
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
      expect(mockEnqueue).not.toHaveBeenCalled();
      await act(async () => {
        root.unmount();
      });
    });
  },
);

describe("leaving the purchase before the first sack", () => {
  const exit = (root: ReactTestRenderer) =>
    byLabel(root, "Salir sin guardar la recepción");
  it("restores edited fields after route removal without creating a reception and clears them on discard", async () => {
    const first = await openNew();
    await act(async () => {
      sheet(first).props.onChangeDetail("driverName", "Edición conservada");
    });
    await act(async () => {
      first.unmount();
    });
    const restored = await openNew();
    expect(sheet(restored).props.details.driverName).toBe("Edición conservada");
    await act(async () => {
      sheet(restored).props.onBack();
    });
    await act(async () => {
      exit(restored).props.onConfirm();
    });
    expect(readInitialPurchaseDraft(mockSession.accessToken)).toBeNull();
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      restored.unmount();
    });
  });
  it.each([false, true])(
    "leaves unchanged details without a discard prompt when history is %s",
    async (hasHistory) => {
      mockCanGoBack.mockReturnValue(hasHistory);
      const root = await openNew();
      await act(async () => {
        sheet(root).props.onBack();
      });
      if (hasHistory) {
        expect(mockBack).toHaveBeenCalledTimes(1);
        expect(mockReplace).not.toHaveBeenCalled();
      } else expect(mockReplace).toHaveBeenCalledWith("/home");
      expect(exit(root).props.visible).toBe(false);
      expect(mockEnqueue).not.toHaveBeenCalled();
      await act(async () => {
        root.unmount();
      });
    },
  );
  it("preserves changed fields on cancellation and only leaves after explicit discard", async () => {
    const root = await openNew();
    await act(async () => {
      sheet(root).props.onChangeDetail("driverName", "Conductor en edición");
    });
    await act(async () => {
      sheet(root).props.onBack();
    });
    expect(exit(root).props.visible).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(sheet(root).props.blocked).toBe(true);
    expect(sheet(root).props.busy).toBe(false);
    await act(async () => {
      exit(root).props.onCancel();
    });
    expect(sheet(root).props.details.driverName).toBe("Conductor en edición");
    await act(async () => {
      sheet(root).props.onBack();
    });
    await act(async () => {
      exit(root).props.onConfirm();
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(mockSendQueued).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
  it("continues the original intercepted navigation action only after discard", async () => {
    const root = await openNew();
    await act(async () => {
      sheet(root).props.onChangeDetail("date", "2026-10-01");
    });
    const [protectedExit, callback] = mockPreventRemove.mock.calls.at(-1)!;
    expect(protectedExit).toBe(true);
    const action = { type: "GO_BACK", source: "purchase-route" };
    await act(async () => {
      callback({ data: { action } });
    });
    expect(mockDispatch).not.toHaveBeenCalled();
    await act(async () => {
      exit(root).props.onCancel();
    });
    expect(sheet(root).props.details.date).toBe("2026-10-01");
    await act(async () => {
      mockPreventRemove.mock.calls.at(-1)![1]({ data: { action } });
    });
    await act(async () => {
      exit(root).props.onConfirm();
    });
    expect(mockDispatch).toHaveBeenCalledWith(action);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
  it("uses the opening date for a new purchase after midnight and preserves a date already entered", async () => {
    jest.useFakeTimers({
      now: new Date(2030, 8, 30, 23, 55),
      doNotFake: [
        "setTimeout",
        "setInterval",
        "setImmediate",
        "nextTick",
        "queueMicrotask",
        "performance",
        "hrtime",
      ],
    });
    let first: ReactTestRenderer | undefined;
    let second: ReactTestRenderer | undefined;
    try {
      first = await openNew();
      expect(sheet(first).props.details.date).toBe("2030-09-30");
      await act(async () => {
        sheet(first!).props.onChangeDetail("date", "2030-09-29");
      });
      jest.setSystemTime(new Date(2030, 9, 1, 0, 5));
      await act(async () => {
        first!.update(<PurchaseFlowScreen />);
      });
      expect(sheet(first).props.details.date).toBe("2030-09-29");
      clearInitialPurchaseDraft(); // A deliberately fresh form, without a prior editing copy.
      second = await openNew();
      expect(sheet(second).props.details.date).toBe("2030-10-01");
      expect(mockEnqueue).not.toHaveBeenCalled();
    } finally {
      await act(async () => {
        first?.unmount();
        second?.unmount();
      });
      jest.useRealTimers();
    }
  });
});

describe("recovery of an existing reception", () => {
  it("rejects impossible dates and mismatched credit amounts before asking to save", async () => {
    jest
      .mocked(getReception)
      .mockReset()
      .mockResolvedValue({ ...saved, state: "weighed" });
    const root = await openSaved();
    await act(async () => {
      sheet(root).props.onChangeLot(
        sheet(root).props.lots[0].key,
        "unitPrice",
        "2.50",
      );
      sheet(root).props.onChange("paymentMode", "credit");
      sheet(root).props.onAddInstallment();
    });
    const id = sheet(root).props.values.installments[0].id;
    await act(async () => {
      sheet(root).props.onChangeInstallment(id, "amount", "250");
      sheet(root).props.onChangeInstallment(id, "dueOn", "2030-02-30");
    });
    await act(async () => {
      sheet(root).props.onSave();
    });
    expect(saveDialog(root).props.visible).toBe(false);
    expect(sheet(root).props.errorMessage).toContain("fecha existente");
    await act(async () => {
      sheet(root).props.onChangeInstallment(id, "dueOn", "2030-03-01");
      sheet(root).props.onChangeInstallment(id, "amount", "249");
    });
    await act(async () => {
      sheet(root).props.onSave();
    });
    expect(saveDialog(root).props.visible).toBe(false);
    expect(sheet(root).props.errorMessage).toContain("sumar exactamente");
    await act(async () => {
      sheet(root).props.onChangeInstallment(id, "amount", "250");
    });
    await act(async () => {
      sheet(root).props.onSave();
    });
    expect(saveDialog(root).props.visible).toBe(true);
    expect(sheet(root).props.errorMessage).toBeUndefined();
    expect(saveDialog(root).props.message).toContain("Total líquido S/ 250.00");
    expect(saveDialog(root).props.message).toContain("Crédito con 1 cuota");
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it("preserves edited settlement terms when cancelling navigation out of a closed reception", async () => {
    jest
      .mocked(getReception)
      .mockReset()
      .mockResolvedValue({ ...saved, state: "weighed" });
    const root = await openSaved();
    await act(async () => {
      sheet(root).props.onChangeLot(
        sheet(root).props.lots[0].key,
        "unitPrice",
        "2.50",
      );
    });
    await act(async () => {
      sheet(root).props.onGoHome();
    });
    const exit = byLabel(root, "Salir sin guardar estos datos");
    expect(exit.props.visible).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      exit.props.onCancel();
    });
    expect(lotPrice(root)).toBe("2.50");
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it("requires confirmation before leaving an unsaved weight and preserves it when exit is cancelled", async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue(saved);
    const root = await openSaved();
    const exit = () => byLabel(root, "Salir sin guardar estos datos");
    await act(async () => {
      sheet(root).props.onGrossChange("51");
    });
    await act(async () => {
      sheet(root).props.onGoHome();
    });
    expect(exit().props.visible).toBe(true);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      exit().props.onCancel();
    });
    expect(exit().props.visible).toBe(false);
    expect(sheet(root).props.gross).toBe("51");
    await act(async () => {
      sheet(root).props.onGoHome();
    });
    await act(async () => {
      exit().props.onConfirm();
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(createReception).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it("restores current sacks and adds to the same identity and version without creating another reception", async () => {
    jest.mocked(getReception).mockReset().mockResolvedValue(saved);
    jest.mocked(getSacks).mockResolvedValue([
      {
        id: "voided-sack",
        sequence: 3,
        varietyId: "variety-id",
        grossWeightKg: "70",
        tareKg: "0",
        netWeightKg: "70",
        voidedAt: "2026-10-06",
      },
      {
        id: "kept-sack",
        sequence: 2,
        varietyId: "variety-id",
        grossWeightKg: "51",
        tareKg: "1",
        netWeightKg: "50",
      },
    ]);
    const root = await openSaved();
    expect(
      sheet(root).props.sacks.map((item: { id: string }) => item.id),
    ).toEqual(["kept-sack"]);
    expect(sheet(root).props).toMatchObject({
      detailsLocked: true,
      nextSequence: 4,
    });
    expect(mockEnqueue).not.toHaveBeenCalled();
    expect(createReception).not.toHaveBeenCalled();
    await addSack(root, "55,5");
    expect(sheet(root).props.errorMessage).toBe(
      "Ingresa el bruto y la tara en kilos enteros, sin decimales.",
    );
    expect(mockEnqueue).not.toHaveBeenCalled();
    mockSendQueued.mockResolvedValueOnce({ id: mockIds[0], status: "pending" });
    await addSack(root, "55");
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/receptions/saved-reception/sacks",
        type: "reception.sack-add",
        body: expect.objectContaining({
          expectedReceptionVersion: 7,
          varietyId: "variety-id",
        }),
      }),
    );
    expect(
      sheet(root).props.sacks.map(
        (item: { sequence: number }) => item.sequence,
      ),
    ).toEqual([2, 4]);
    await act(async () => {
      root.unmount();
    });
  });

  it("retries failed recovery using reads only", async () => {
    jest
      .mocked(getReception)
      .mockReset()
      .mockRejectedValueOnce(new Error("Read failed"))
      .mockResolvedValue(saved);
    const root = await openSaved();
    expect(
      root.root.findAll((node) => node.props.screenKind === "sheet"),
    ).toHaveLength(0);
    await act(async () => {
      root.root
        .findAll(
          (node) => node.props.actionLabel === "Reintentar recuperación",
        )[0]!
        .props.onAction();
    });
    expect(
      root.root.findAll((node) => node.props.screenKind === "sheet"),
    ).not.toHaveLength(0);
    expect(getReception).toHaveBeenCalledTimes(2);
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it.each(["settled", "voided"] as const)(
    "does not reopen a reception that changed to %s",
    async (state) => {
      jest
        .mocked(getReception)
        .mockReset()
        .mockResolvedValue({ ...saved, state });
      const root = await openSaved();
      expect(
        root.root.findAll(
          (node) => node.props.title === "No se pudo recuperar la recepción",
        ),
      ).not.toHaveLength(0);
      expect(root.root.findAll((node) => node.props.screenKind)).toHaveLength(
        0,
      );
      expect(mockEnqueue).not.toHaveBeenCalled();
      await act(async () => {
        root.unmount();
      });
    },
  );

  it("blocks editable recovery while a related operation remains unresolved", async () => {
    mockQueuedOperations = [
      {
        id: "pending-sack",
        businessId: "business",
        userId: "user",
        path: "/receptions/saved-reception/sacks",
        method: "POST",
        type: "reception.sack-add",
        body: {},
        status: "pending",
        attempts: 1,
        createdAt: "2026-10-06",
        updatedAt: "2026-10-06",
      },
    ];
    const root = await openSaved();
    expect(getReception).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
    await act(async () => {
      root.root
        .findAll(
          (node) => node.props.actionLabel === "Revisar sincronización",
        )[0]!
        .props.onAction();
    });
    expect(mockReplace).toHaveBeenCalledWith("/sync-queue");
    await act(async () => {
      root.unmount();
    });
  });

  it("waits for queue hydration and fails closed if its encrypted storage cannot be read", async () => {
    mockQueueLoading = true;
    const root = await openSaved();
    expect(getReception).not.toHaveBeenCalled();
    mockQueueLoading = false;
    mockQueueError = "Cola no recuperada";
    await act(async () => {
      root.update(<PurchaseFlowScreen initialReceptionId="saved-reception" />);
    });
    expect(
      root.root.findAll((node) => node.props.message === "Cola no recuperada"),
    ).not.toHaveLength(0);
    expect(getReception).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });

  it("continues a saved local weighing without loading catalogs or sending old operations", async () => {
    mockQueuedOperations = [
      {
        id: mockIds[0],
        businessId: "business",
        userId: "user",
        type: "reception.create",
        path: "/receptions",
        method: "POST",
        body: {
          providerId: "provider-id",
          driverName: "Conductor",
          receivedOn: "2026-10-06",
          expectedVarietyIds: ["variety-id"],
        },
        receptionContext: {
          providerName: "Proveedor",
          vehiclePlate: "",
          varieties: [{ id: "variety-id", name: "Papa guardada" }],
        },
        status: "pending",
        attempts: 0,
        createdAt: "2026-10-06",
        updatedAt: "2026-10-06",
      },
    ];
    mockQueuedOperations.push({
      ...mockQueuedOperations[0]!,
      receptionContext: undefined,
      id: mockIds[1],
      type: "reception.sack-add",
      path: `/receptions/@${mockIds[0]}/sacks`,
      body: {
        expectedReceptionVersion: 0,
        varietyId: "variety-id",
        grossWeightKg: "12",
        tareKg: "0",
      },
    });
    mockIdIndex = 2;
    const root = await openSaved(`local:${mockIds[0]}`);
    expect(sheet(root).props.varieties).toEqual([
      { id: "variety-id", name: "Papa guardada" },
    ]);
    expect(sheet(root).props.sacks).toHaveLength(1);
    expect(sheet(root).props.notice).toContain("almacenamiento cifrado");
    expect(loadReceptionCatalogs).not.toHaveBeenCalled();
    expect(getReception).not.toHaveBeenCalled();
    expect(mockEnqueue).not.toHaveBeenCalled();
    await addSack(root, "10");
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockIds[2],
        path: `/receptions/@${mockIds[0]}/sacks`,
        body: expect.objectContaining({ expectedReceptionVersion: 1 }),
      }),
    );
    expect(mockSendQueued).not.toHaveBeenCalled();
    expect(sheet(root).props.sacks).toHaveLength(2);
    await act(async () => {
      root.unmount();
    });
  });
});

describe("characteristics of a sack", () => {
  it("stores the selected quality and origin with the sack and keeps them for the next one", async () => {
    const qualityId = "33333333-3333-4333-8333-333333333333";
    const originId = "44444444-4444-4444-8444-444444444444";
    jest
      .mocked(loadReceptionCatalogs)
      .mockResolvedValue({
        providers: [{ id: "provider-id", name: "Proveedor", phone: null }],
        vehicles: [],
        varieties: [{ id: "variety-id", name: "Papa" }],
        qualities: [
          {
            id: qualityId,
            name: "Calidad QA",
            kind: "quality",
            isActive: true,
          },
        ],
        origins: [
          { id: originId, name: "Origen QA", kind: "origin", isActive: true },
        ],
      });
    const root = await openNew();
    await fillDetails(root);
    await act(async () => {
      sheet(root).props.characteristics.props.onChange("qualityId", qualityId);
      sheet(root).props.characteristics.props.onChange("originId", originId);
    });
    await addSack(root, "55");
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "reception.sack-add",
        body: expect.objectContaining({ qualityId, originId }),
        sackCharacteristics: {
          qualityId,
          qualityName: "Calidad QA",
          originId,
          originName: "Origen QA",
        },
      }),
    );
    expect(sheet(root).props.gross).toBe("");
    expect(sheet(root).props.characteristics.props.value).toEqual({
      qualityId,
      originId,
    });
    await act(async () => {
      root.unmount();
    });
  });
});

describe("storage and confirmation", () => {
  it("keeps the sheet and does not send the settlement when its storage fails", async () => {
    const root = await prepare();
    mockEnqueue
      .mockResolvedValueOnce({ status: "pending" })
      .mockRejectedValueOnce(new Error("Storage full"));
    await confirmSave(root);
    expect(mockEnqueue.mock.calls.map((call) => call[0].type)).toEqual([
      "reception.create",
      "reception.sack-add",
      "reception.close",
      "purchase.settle",
    ]);
    expect(mockSendQueued).toHaveBeenCalledTimes(3);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(sheet(root).props.errorMessage).toBe("Storage full");
    expect(
      root.root.findAll((node) => node.props.screenKind === "confirmation"),
    ).toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
  });
  it("opens recovery for a saved pending settlement without announcing success", async () => {
    const root = await prepare();
    mockSendQueued.mockImplementation(async (id: string) =>
      id === mockIds[3]
        ? { id, status: "pending" }
        : {
            id,
            status: "confirmed",
            centralReference:
              id === mockIds[0]
                ? "reception-id"
                : id === mockIds[1]
                  ? "sack-id"
                  : "central-purchase",
          },
    );
    await confirmSave(root);
    expect(mockReplace).toHaveBeenCalledWith("/sync-queue");
    expect(getPurchaseSettlement).not.toHaveBeenCalled();
    expect(
      root.root.findAll((node) => node.props.screenKind === "confirmation"),
    ).toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
  });
  it("keeps the purchase confirmed while retrying only its failed detail lookup", async () => {
    const root = await prepare();
    jest
      .mocked(getPurchaseSettlement)
      .mockRejectedValueOnce(new Error("Detail lookup failed"));
    await confirmSave(root);
    expect(
      root.root.findAll((node) => node.props.title === "Compra confirmada"),
    ).not.toHaveLength(0);
    expect(
      root.root.findAll((node) => node.props.screenKind === "sheet"),
    ).toHaveLength(0);

    await act(async () => {
      root.root
        .findAll(
          (node) =>
            node.props.actionLabel === "Reintentar consulta de liquidación",
        )[0]!
        .props.onAction();
      await Promise.resolve();
    });
    // Only the detail is read again: nothing is stored or sent a second time.
    expect(mockEnqueue).toHaveBeenCalledTimes(4);
    expect(mockSendQueued).toHaveBeenCalledTimes(4);
    expect(getPurchaseSettlement).toHaveBeenCalledTimes(2);
    expect(
      root.root.findAll((node) => node.props.screenKind === "confirmation"),
    ).not.toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
  });
  it("keeps the typed data without sending when the first sack cannot be stored", async () => {
    const root = await openNew();
    await fillDetails(root);
    mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));
    await addSack(root);
    expect(mockSendQueued).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(sheet(root).props).toMatchObject({
      errorMessage: "Storage full",
      busy: false,
      detailsLocked: false,
      gross: "100",
    });
    expect(sheet(root).props.details.driverName).toBe("Conductor");
    await act(async () => {
      root.unmount();
    });
  });
  it("keeps an unsaved sack in the sheet and releases the busy state", async () => {
    const root = await openNew();
    await fillDetails(root);
    await addSack(root);
    const sent = mockSendQueued.mock.calls.length;
    mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));
    await addSack(root, "90");
    expect(mockSendQueued).toHaveBeenCalledTimes(sent);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(sheet(root).props).toMatchObject({
      errorMessage: "Storage full",
      busy: false,
      gross: "90",
    });
    expect(sheet(root).props.sacks).toHaveLength(1);
    await act(async () => {
      root.unmount();
    });
  });
  it("stores a sack correction with its original path and version before sending", async () => {
    const root = await openNew();
    await fillDetails(root);
    await addSack(root);
    await act(async () => {
      sheet(root).props.onEditSack("sack-id");
    });
    await addSack(root, "110");
    const correction = mockEnqueue.mock.calls.at(-1)![0];
    expect(correction).toMatchObject({
      method: "PATCH",
      path: "/receptions/reception-id/sacks/sack-id",
      type: "reception.sack-correct",
      body: expect.objectContaining({
        grossWeightKg: "110",
        tareKg: "0",
        varietyId: "variety-id",
      }),
    });
    expect(correction.body.expectedReceptionVersion).toBe(1);
    expect(correction.sackCharacteristics).toEqual({
      qualityId: null,
      qualityName: null,
      originId: null,
      originName: null,
    });
    const index = mockEnqueue.mock.calls.length - 1;
    expect(mockEnqueue.mock.invocationCallOrder[index]).toBeLessThan(
      mockSendQueued.mock.invocationCallOrder.at(-1)!,
    );
    await act(async () => {
      root.unmount();
    });
  });
  it("keeps closure and settlement queued behind an uncertain sack on a central reception", async () => {
    mockSendQueued.mockImplementation(async (id: string) =>
      id === mockIds[1]
        ? { id, status: "pending" }
        : {
            id,
            status: "confirmed",
            centralReference:
              id === mockIds[0] ? "reception-id" : "central-purchase",
          },
    );
    const root = await prepare();
    await confirmSave(root);
    expect(
      mockEnqueue.mock.calls
        .slice(1)
        .map((call) => ({
          type: call[0].type,
          version: call[0].body.expectedReceptionVersion,
        })),
    ).toEqual([
      { type: "reception.sack-add", version: 0 },
      { type: "reception.close", version: 1 },
      { type: "purchase.settle", version: 2 },
    ]);
    expect(mockSendQueued).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith("/sync-queue");
    expect(getPurchaseSettlement).not.toHaveBeenCalled();
    await act(async () => {
      root.unmount();
    });
  });
});
