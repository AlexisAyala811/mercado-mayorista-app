import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AccountsScreen } from "@/features/accounts/screens/accounts-screen";
import {
  getAccount,
  listAccounts,
  listCashMovements,
  type AccountDetail,
} from "@/services/api/operations-api";
import { ApiError } from "@/services/api/api-client";

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));

const mockEnqueue = jest.fn();
const mockSendQueued = jest.fn();
const mockPush = jest.fn();
const mockInvalidate = jest.fn();
let mockAccessToken = "test-token";
jest.mock("@/features/sync/sync-queue-provider", () => ({
  useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued }),
}));
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({
    session: { accessToken: mockAccessToken },
    invalidateSession: mockInvalidate,
  }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
}));
jest.mock("@/services/api/operations-api", () => ({
  getAccount: jest.fn(),
  listAccounts: jest.fn(),
  listCashMovements: jest.fn(),
}));
jest.mock("@/domain/reception/reception", () => ({
  ...jest.requireActual("@/domain/reception/reception"),
  createOperationId: () => "account-operation",
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => react.createElement("test-control", props);
  return {
    AppButton: control,
    AppCard: control,
    AppScreen: control,
    ConfirmationDialog: control,
    ChoiceDialog: control,
    EmptyState: control,
    FeedbackState: control,
    FormField: control,
    LoadingState: control,
    MetricTile: control,
    ScreenHeader: control,
  };
});
const detail: AccountDetail = {
  account: {
    id: "account-id",
    kind: "payable",
    state: "open",
    sourceType: "purchase-settlement",
    sourceId: "purchase-id",
    initialAmountCents: "10000",
    balanceCents: "8000",
    version: 2,
    createdAt: "2026-10-04T00:00:00Z",
  },
  installments: [],
  payments: [
    {
      id: "payment-id",
      amountCents: "2000",
      isReversal: false,
      reason: null,
      createdAt: "2026-10-04T00:00:00Z",
    },
  ],
};
beforeEach(() => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockAccessToken = "test-token";
  mockEnqueue.mockResolvedValue({ id: "account-operation", status: "pending" });
  mockSendQueued.mockResolvedValue({
    id: "account-operation",
    status: "confirmed",
    centralReference: "central-payment",
  });
  jest.mocked(getAccount).mockResolvedValue(detail);
  jest.mocked(listAccounts).mockResolvedValue({
    items: [detail.account],
    total: 1,
    limit: 100,
    offset: 0,
  });
  jest
    .mocked(listCashMovements)
    .mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });
});
async function prepare(kind: "payment" | "reversal" = "payment") {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<AccountsScreen />);
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Ver detalle")[0]
      .props.onPress();
    await Promise.resolve();
  });
  if (kind === "payment") {
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Pago (S/)")[0]
        .props.onChangeText("10");
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Confirmar importe")[0]
        .props.onPress();
    });
  } else {
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Revertir")[0]
        .props.onPress();
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Motivo del reverso")[0]
        .props.onChangeText("Registro incorrecto");
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Confirmar reverso")[0]
        .props.onPress();
    });
  }
  return root;
}
async function confirm(root: ReactTestRenderer) {
  await act(async () => {
    root.root
      .findAll(
        (node) =>
          node.props.visible === true &&
          typeof node.props.onConfirm === "function",
      )[0]
      .props.onConfirm();
    await Promise.resolve();
  });
}

it('paginates every filtered account and resets the page after a new search without writing', async () => {
  const accounts = Array.from({ length: 9 }, (_, index) => ({ ...detail.account, id: `account-${index}`, counterpartyName: `Persona ${index}` }));
  jest.mocked(listAccounts).mockResolvedValue({ items: accounts, total: 9, limit: 100, offset: 0 });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  const identities = () => [...new Set(root.root.findAll(node => node.props.label === 'Ver detalle').map(node => node.props.accessibilityLabel))];
  expect(identities()).toEqual(accounts.slice(0, 4).map(a => `Ver detalle de ${a.counterpartyName}, referencia ${a.id}`));
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Página siguiente de cuentas' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  expect(identities()).toEqual(accounts.slice(4, 8).map(a => `Ver detalle de ${a.counterpartyName}, referencia ${a.id}`));
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Página siguiente de cuentas' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  expect(identities()).toEqual(['Ver detalle de Persona 8, referencia account-8']);
  await act(async () => { root.root.findAll(node => node.props.label === 'Nombre o referencia de cuenta')[0].props.onChangeText('Persona 0'); });
  expect(identities()).toEqual(['Ver detalle de Persona 0, referencia account-0']);
  await act(async () => { root.root.findAll(node => node.props.label === 'Ver detalle')[0].props.onPress(); });
  expect(getAccount).toHaveBeenLastCalledWith('test-token', 'account-0');
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('starts an existing commercial source from plus without creating a debt or financial movement', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Nueva operación que origina una cuenta' && typeof node.props.onPress === 'function')[0].props.onPress(); });
  const sourceDialog = root.root.findAll(node => node.props.title === 'Las cuentas se originan en operaciones a crédito' && node.props.visible)[0];
  expect(sourceDialog.props.choices.map((choice: {id:string}) => choice.id)).toEqual(['purchase', 'sale']);
  await act(async () => { sourceDialog.props.onSelect({ id: 'purchase' }); });
  expect(mockPush).toHaveBeenLastCalledWith('/purchase-flow');
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each(["accounts", "cash"])("does not present zero balances or empty results when %s fails and retries both reads", async (source) => {
  if (source === "accounts") jest.mocked(listAccounts).mockRejectedValueOnce(new Error("Accounts offline"));
  else jest.mocked(listCashMovements).mockRejectedValueOnce(new Error("Cash offline"));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  expect(root.root.findAll(node => node.props.title === "Datos financieros no disponibles")).not.toHaveLength(0);
  expect(root.root.findAll(node => node.props.label === "Neto")).toHaveLength(0);
  expect(root.root.findAll(node => node.props.title === "Sin cuentas" || node.props.title === "Sin movimientos")).toHaveLength(0);
  expect(root.root.findAll(node => node.props.label === "Ver detalle")).toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.actionLabel === "Reintentar cuentas y caja")[0].props.onAction(); });
  expect(listAccounts).toHaveBeenCalledTimes(2);
  expect(listCashMovements).toHaveBeenCalledTimes(2);
  expect(root.root.findAll(node => node.props.title === "Datos financieros no disponibles")).toHaveLength(0);
  expect(root.root.findAll(node => node.props.label === "Neto")[0].props.value).toBe("S/ 0.00");
  expect(root.root.findAll(node => node.props.label === "Ver detalle")).not.toHaveLength(0);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it("invalidates an unauthorized initial read without treating it as an empty account list", async () => {
  jest.mocked(listAccounts).mockRejectedValueOnce(new ApiError("Sesión vencida", 401));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  expect(mockInvalidate).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node => node.props.label === "Neto")).toHaveLength(0);
  expect(root.root.findAll(node => node.props.title === "Sin cuentas")).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it("keeps a confirmed movement and refreshed detail when the following collection read fails", async () => {
  const root = await prepare();
  jest.mocked(listCashMovements).mockRejectedValueOnce(new Error("Cash refresh failed"));
  await confirm(root);
  expect(root.root.findAll(node => node.props.title === "Movimiento confirmado")).not.toHaveLength(0);
  expect(root.root.findAll(node => node.props.title === "Lista de cuentas y caja pendiente")).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.actionLabel === "Reintentar cuentas y caja")[0].props.onAction(); });
  expect(root.root.findAll(node => node.props.title === "Lista de cuentas y caja pendiente")).toHaveLength(0);
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);
  await act(async () => { root.unmount(); });
});

it("does not present an old account detail after the authenticated token changes", async () => {
  let resolve!: (value: AccountDetail) => void;
  jest.mocked(getAccount).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  await act(async () => { root.root.findAll(node => node.props.label === "Ver detalle")[0].props.onPress(); });
  mockAccessToken = "new-session-token";
  await act(async () => { root.update(<AccountsScreen />); });
  await act(async () => { resolve({ ...detail, account: { ...detail.account, counterpartyName: "Old session private counterparty" } }); });
  expect(listAccounts).toHaveBeenLastCalledWith("new-session-token");
  expect(JSON.stringify(root.toJSON())).not.toContain("Old session private counterparty");
  expect(root.root.findAll(node => node.props.label === "Volver a cuentas")).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it("does not navigate or send a saved movement after its screen is unmounted", async () => {
  let resolve!: () => void;
  mockEnqueue.mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
  const root = await prepare();
  await confirm(root);
  await act(async () => { root.unmount(); });
  await act(async () => { resolve(); });
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
});

it("renders exact cash totals beyond the safe integer limit while every movement remains bounded", async () => {
  const base = {
    category: "sale-collection",
    sourceType: "sale",
    sourceId: "test-sale",
    createdByUserId: "test-user",
    createdAt: "2026-10-10T12:00:00Z",
  };
  const items = [
    ...Array.from({ length: 1001 }, (_, i) => ({
      ...base,
      id: `cash-${i}`,
      direction: "in" as const,
      amountCents: "9000000000000",
    })),
    { ...base, id: "extra-cent", direction: "in" as const, amountCents: "1" },
    { ...base, id: "outgoing", direction: "out" as const, amountCents: "2" },
  ];
  jest.mocked(listCashMovements).mockResolvedValueOnce({
    items,
    total: items.length,
    offset: 0,
    limit: items.length,
  });
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<AccountsScreen />);
  });
  const metric = (label: string) =>
    root.root.findAll(
      (node) => node.props.label === label && node.props.value,
    )[0].props.value;
  expect(metric("Entradas")).toBe("S/ 90090000000000.01");
  expect(metric("Salidas")).toBe("S/ 0.02");
  expect(metric("Neto")).toBe("S/ 90089999999999.99");
  await act(async () => {
    root.unmount();
  });
});

it("keeps account search accessible before expanding cash and preserves totals when folding it", async () => {
  jest.mocked(listCashMovements).mockResolvedValueOnce({ total: 1, offset: 0, limit: 100, items: [{
    id: "cash-entry", direction: "in", amountCents: "1234", category: "sale-collection", sourceType: "sale", sourceId: "sale-id", createdByUserId: "test-user", createdAt: "2026-10-11T12:00:00Z",
  }] });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  const control = (label: string) => root.root.findAll(node => node.props.label === label)[0];
  expect(control("Nombre o referencia de cuenta")).toBeDefined();
  expect(control("Ver movimientos de caja").props.accessibilityState.expanded).toBe(false);
  expect(JSON.stringify(root.toJSON())).not.toContain("+ S/ 12.34");
  expect(control("Neto").props.value).toBe("S/ 12.34");
  await act(async () => { control("Ver movimientos de caja").props.onPress(); });
  expect(control("Ocultar movimientos de caja").props.accessibilityState.expanded).toBe(true);
  expect(JSON.stringify(root.toJSON())).toContain("Cobro de venta");
  await act(async () => { control("Ocultar movimientos de caja").props.onPress(); });
  expect(control("Neto").props.value).toBe("S/ 12.34");
  expect(listAccounts).toHaveBeenCalledTimes(1);
  expect(listCashMovements).toHaveBeenCalledTimes(1);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each(["payment", "reversal"] as const)(
  "stores %s before sending and refreshing the central account",
  async (kind) => {
    const root = await prepare(kind);
    await confirm(root);
    expect(mockEnqueue).toHaveBeenCalledWith({
      id: "account-operation",
      method: "POST",
      type: kind === "payment" ? "account.payment" : "account.payment-reversal",
      path:
        kind === "payment"
          ? "/accounts/account-id/payments"
          : "/accounts/account-id/payments/payment-id/reversal",
      body:
        kind === "payment"
          ? {
              amountCents: 1000,
              clientOperationId: "account-operation",
              expectedAccountVersion: 2,
            }
          : {
              clientOperationId: "account-operation",
              expectedAccountVersion: 2,
              reason: "Registro incorrecto",
            },
    });
    expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(
      mockSendQueued.mock.invocationCallOrder[0],
    );
    expect(getAccount).toHaveBeenCalledTimes(2);
    expect(mockPush).not.toHaveBeenCalled();
    expect(
      root.root.findAll((node) => node.props.title === "Movimiento confirmado"),
    ).not.toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
  },
);
it("reviews original reversal references, reason and provisional restored balance before sending", async () => {
  const root = await prepare("reversal");
  const dialog = root.root.findAll(node => node.props.visible === true && node.props.onConfirm)[0];
  expect(dialog.props.message).toContain("Movimiento payment-id: S/ 20.00");
  expect(dialog.props.message).toContain("Saldo anterior S/ 80.00");
  expect(dialog.props.message).toContain("saldo resultante provisional S/ 100.00");
  expect(dialog.props.message).toContain("Registro incorrecto");
  expect(root.root.findAll(node => node.props.label === "Motivo del reverso")[0].props.editable).toBe(false);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { dialog.props.onCancel(); });
  expect(root.root.findAll(node => node.props.label === "Motivo del reverso")[0].props.editable).toBe(true);
  await act(async () => { root.root.findAll(node => node.props.label === "Cancelar reverso")[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.label === "Motivo del reverso")).toHaveLength(0);
  expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});
it("rejects an invalid reversal reason before opening the dialog and again before enqueue", async () => {
  const root = await prepare("reversal");
  const dialog = root.root.findAll(node => node.props.onConfirm && node.props.onCancel)[0];
  await act(async () => { dialog.props.onCancel(); });
  await act(async () => { root.root.findAll(node => node.props.label === "Motivo del reverso")[0].props.onChangeText(" "); });
  await act(async () => { root.root.findAll(node => node.props.label === "Confirmar reverso")[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.onConfirm)[0].props.visible).toBe(false);
  await act(async () => { root.root.findAll(node => node.props.onConfirm)[0].props.onConfirm(); });
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain("1 a 240 caracteres");
  await act(async () => { root.unmount(); });
});
it("preserves the payment and compensation history without offering a second reversal", async () => {
  jest.mocked(getAccount).mockResolvedValueOnce({ ...detail, payments: [
    ...detail.payments,
    { ...detail.payments[0]!, id: "reversal-id", isReversal: true, reversedPaymentId: "payment-id", reason: "Corrección" },
  ] });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AccountsScreen />); });
  await act(async () => { root.root.findAll(node => node.props.label === "Ver detalle")[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.label === "Revertir")).toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).toContain("Movimiento revertido");
  expect(JSON.stringify(root.toJSON())).toContain("Reverso");
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});
it("keeps the payment form without sending when durable storage fails", async () => {
  mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));
  const root = await prepare();
  await confirm(root);
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(
    root.root.findAll((node) => node.props.message === "Storage full"),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Pago (S/)")[0].props
      .value,
  ).toBe("10");
  await act(async () => {
    root.unmount();
  });
});

it("searches counterparties and preserves filters after opening and leaving detail without changing cash", async () => {
  const named = {
    ...detail.account,
    counterpartyType: "provider",
    counterpartyId: "provider-id",
    counterpartyName: "José Álvarez",
  };
  jest
    .mocked(listAccounts)
    .mockResolvedValueOnce({
      items: [
        named,
        { ...named, id: "other-account", counterpartyName: "Rosa" },
      ],
      total: 2,
      limit: 2,
      offset: 0,
    });
  jest.mocked(getAccount).mockResolvedValueOnce({ ...detail, account: named });
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<AccountsScreen />);
  });
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.label === "Nombre o referencia de cuenta",
      )[0]
      .props.onChangeText("JOSE");
  });
  expect(
    root.root.findAll((node) => typeof node.type === "string" && node.props.label === "Ver detalle"),
  ).toHaveLength(1);
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Ver detalle")[0]
      .props.onPress();
  });
  expect(
    root.root.findAll(
      (node) =>
        typeof node.props.description === "string" &&
        node.props.description.includes("José Álvarez"),
    ),
  ).not.toHaveLength(0);
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Volver a cuentas")[0]
      .props.onPress();
  });
  expect(
    root.root.findAll(
      (node) => node.props.label === "Nombre o referencia de cuenta",
    )[0].props.value,
  ).toBe("JOSE");
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Por cobrar")[0]
      .props.onPress();
  });
  expect(
    root.root.findAll(
      (node) => node.props.title === "Sin resultados de cuentas",
    ),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Neto")[0].props.value,
  ).toBe("S/ 0.00");
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Limpiar búsqueda de cuentas")[0]
      .props.onPress();
  });
  expect(
    root.root.findAll((node) => typeof node.type === "string" && node.props.label === "Ver detalle"),
  ).toHaveLength(2);
  await act(async () => {
    root.unmount();
  });
});

it("shows the exact provisional balances and locks editing during confirmation", async () => {
  const root = await prepare();
  const dialog = root.root.findAll(
    (node) =>
      node.props.visible === true && typeof node.props.onConfirm === "function",
  )[0];
  expect(dialog.props.message).toContain("Pago S/ 10.00");
  expect(dialog.props.message).toContain("Saldo anterior S/ 80.00");
  expect(dialog.props.message).toContain(
    "saldo resultante provisional S/ 70.00",
  );
  expect(
    root.root.findAll((node) => node.props.label === "Pago (S/)")[0].props
      .editable,
  ).toBe(false);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => {
    dialog.props.onCancel();
  });
  expect(
    root.root.findAll((node) => node.props.label === "Pago (S/)")[0].props
      .editable,
  ).toBe(true);
  await act(async () => {
    root.unmount();
  });
});

it("blocks an excessive amount before opening confirmation and also before durable submission", async () => {
  const root = await prepare();
  await act(async () => {
    root.root
      .findAll((node) => node.props.onCancel && node.props.onConfirm)[0]
      .props.onCancel();
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Pago (S/)")[0]
      .props.onChangeText("80.01");
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Confirmar importe")[0]
      .props.onPress();
  });
  const dialog = root.root.findAll(
    (node) => node.props.onCancel && node.props.onConfirm,
  )[0];
  expect(dialog.props.visible).toBe(false);
  expect(
    root.root.findAll(
      (node) =>
        node.props.message ===
        "El importe no puede superar el saldo pendiente.",
    ),
  ).not.toHaveLength(0);
  await act(async () => {
    dialog.props.onConfirm();
  });
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});

it("identifies collections and their provisional remaining balance separately from payments", async () => {
  jest.mocked(getAccount).mockResolvedValueOnce({
    ...detail,
    account: { ...detail.account, kind: "receivable" },
  });
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<AccountsScreen />);
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Ver detalle")[0]
      .props.onPress();
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Cobro (S/)")[0]
      .props.onChangeText("80");
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.label === "Confirmar importe")[0]
      .props.onPress();
  });
  const dialog = root.root.findAll(
    (node) => node.props.visible === true && node.props.onConfirm,
  )[0];
  expect(dialog.props.message).toContain("Cobro S/ 80.00");
  expect(dialog.props.message).toContain(
    "saldo resultante provisional S/ 0.00",
  );
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});
it("opens recovery for a saved pending payment without refreshing or showing success", async () => {
  mockSendQueued.mockResolvedValueOnce({
    id: "account-operation",
    status: "pending",
  });
  const root = await prepare();
  await confirm(root);
  expect(mockPush).toHaveBeenCalledWith("/sync-queue");
  expect(getAccount).toHaveBeenCalledTimes(1);
  expect(
    root.root.findAll((node) => node.props.title === "Movimiento confirmado"),
  ).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});
it("locks new movements and retries only the account lookup after confirmed payment", async () => {
  const root = await prepare();
  jest
    .mocked(getAccount)
    .mockRejectedValueOnce(new Error("Account lookup failed"));
  await confirm(root);
  expect(
    root.root.findAll((node) => node.props.title === "Movimiento confirmado"),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Confirmar importe")[0]
      .props.disabled,
  ).toBe(true);
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.actionLabel === "Reintentar consulta de cuenta",
      )[0]
      .props.onAction();
    await Promise.resolve();
  });
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(getAccount).toHaveBeenCalledTimes(3);
  expect(
    root.root.findAll((node) => node.props.label === "Confirmar importe")[0]
      .props.disabled,
  ).toBe(false);
  await act(async () => {
    root.unmount();
  });
});

