import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { CostSettlementsScreen } from "@/features/logistics/screens/cost-settlements-screen";
import {
  listFreightEntries,
  listStowageEntries,
  listWorkGroups,
  createWorkGroup,
} from "@/services/api/operations-api";
import {
  getPurchaseSettlement,
  listAllReceptions,
} from "@/services/api/reception-api";
import { listAllSales } from "@/services/api/sales-api";
import { barButton, withChrome } from '../shared/with-chrome';

const mockEnqueue = jest.fn();
const mockSendQueued = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockCanGoBack = jest.fn();
let mockSession: {accessToken:string;user:{role:string}} | null;
jest.mock("@/features/sync/sync-queue-provider", () => ({
  useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued }),
}));
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({ session: mockSession }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: mockCanGoBack }),
}));
jest.mock("@/services/api/operations-api", () => ({
  listFreightEntries: jest.fn(),
  listStowageEntries: jest.fn(),
  listWorkGroups: jest.fn(),
  createWorkGroup: jest.fn(),
  deactivateWorkGroup: jest.fn(),
}));
jest.mock("@/services/api/reception-api", () => ({
  listAllReceptions: jest.fn(),
  getPurchaseSettlement: jest.fn(),
}));
jest.mock("@/services/api/sales-api", () => ({ listAllSales: jest.fn() }));
jest.mock("@/domain/reception/reception", () => ({
  ...jest.requireActual("@/domain/reception/reception"),
  createOperationId: () => "cost-operation",
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => react.createElement("test-control", props);
  return {
    AppButton: control,
    AppCard: control,
    AppScreen: control,
    ChoiceDialog: control,
    ConfirmationDialog: control,
    EmptyState: control,
    FeedbackState: control,
    FormField: control,
    LoadingState: control,
    ScreenHeader: control,
    SelectionField: control,
  };
});
beforeEach(() => {
  mockSession = { accessToken: 'test-token', user: { role: 'wholesaler' } };
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockCanGoBack.mockReturnValue(true);
  mockEnqueue.mockResolvedValue({ id: "cost-operation", status: "pending" });
  mockSendQueued.mockResolvedValue({
    id: "cost-operation",
    status: "confirmed",
    centralReference: "central-cost",
  });
  jest
    .mocked(listFreightEntries)
    .mockResolvedValue({
      items: [
        {
          id: "freight-id",
          operationType: "sale",
          carrierId: null,
          basis: "kilogram",
          derivedSacks: 1,
          derivedWeightKg: "10.000",
          amountCents: "500",
          state: "pending",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });
  jest
    .mocked(listStowageEntries)
    .mockResolvedValue({
      items: [
        {
          id: "stowage-id",
          workGroupId: "group-id",
          operationType: "sale",
          operationId: "sale-id",
          activity: "unload",
          amountCents: "1000",
          occurredOn: "2026-10-04",
          state: "pending",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });
  jest
    .mocked(listWorkGroups)
    .mockResolvedValue({
      items: [{ id: "group-id", name: "Grupo" }],
      total: 1,
      limit: 100,
      offset: 0,
    });
  jest
    .mocked(listAllReceptions)
    .mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 });
  jest
    .mocked(listAllSales)
    .mockResolvedValue({
      items: [
        {
          id: "sale-id",
          buyerId: "buyer-id",
          destinationDepartment: "Lima",
          grossAmountCents: "2500",
          freightAmountCents: "0",
          discountsCents: "0",
          totalAmountCents: "2500",
          paymentMode: "cash",
          state: "confirmed",
          version: 1,
          createdAt: "2026-10-04T00:00:00Z",
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
    });
});
type Kind = "freight" | "stowage" | "entry";

it.each([null, {accessToken:'assistant-token',user:{role:'assistant'}}])('does not load private costs without a wholesaler session %j', async session => {
  mockSession=session;
  let root!:ReactTestRenderer;
  await act(async()=>{root=create(<CostSettlementsScreen/>)});
  expect(listFreightEntries).not.toHaveBeenCalled(); expect(listAllSales).not.toHaveBeenCalled();
  expect(root.toJSON()).toBeNull();
  await act(async()=>root.unmount());
});

it.each(['0000-01-01','2026-02-30'])('rejects invalid entry day %s before saving to the queue',async date=>{
  const root=await prepare('entry');
  await act(async()=>root.root.findAll(node=>node.props.label==='Fecha de operación')[0].props.onChangeText(date));
  await submit(root,'entry');
  expect(JSON.stringify(root.toJSON())).toContain('fecha válida');
  expect(mockEnqueue).not.toHaveBeenCalled(); expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});

it('clears the old-session draft and ignores its late manual-query response',async()=>{
  const root=await prepare('entry');
  let finish!: (value: Awaited<ReturnType<typeof listWorkGroups>>) => void;
  jest.mocked(listWorkGroups).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  let pending!:Promise<void>;
  await act(async()=>{pending=root.root.findAll(node=>node.props.label==='Actualizar')[0].props.onPress()});
  mockSession={accessToken:'new-token',user:{role:'wholesaler'}};
  await act(async()=>root.update(<CostSettlementsScreen/>));
  await act(async()=>{finish({items:[{id:'foreign-group',name:'Old session group'}],total:1,limit:100,offset:0});await pending});
  expect(JSON.stringify(root.toJSON())).not.toContain('Old session group');
  expect(root.root.findAll(node=>node.props.label==='Importe (S/)')[0].props.value).toBe('');
  expect(listAllSales).toHaveBeenLastCalledWith('new-token');
  await act(async()=>root.unmount());
});

it('retains a saved operation without sending or navigating after the workspace closes',async()=>{
  const root=await prepare('entry');
  let finish!:()=>void;
  mockEnqueue.mockImplementationOnce(()=>new Promise(resolve=>{finish=()=>resolve({id:'cost-operation',status:'pending'})}));
  await submit(root,'entry');
  await act(async()=>root.unmount());
  await act(async()=>{finish();await Promise.resolve()});
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).not.toHaveBeenCalled(); expect(mockPush).not.toHaveBeenCalled();
});

it('uses the Lima date for sale choices regardless of device timezone',async()=>{
  const root=await prepare('entry');
  await act(async()=>root.root.findAll(node=>node.props.label==='Compra o venta')[0].props.onPress());
  const choices=root.root.findAll(node=>node.props.title==='Seleccionar operación')[0].props.choices;
  expect(choices[0].label).toContain('03/10/2026');
  await act(async()=>root.unmount());
});

it('keeps the newest refresh when an older refresh finishes last',async()=>{
  const root=await prepare('entry');
  let finish!:(value:Awaited<ReturnType<typeof listWorkGroups>>)=>void;
  jest.mocked(listWorkGroups).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  await act(async()=>root.root.findAll(node=>node.props.label==='Actualizar')[0].props.onPress());
  jest.mocked(listWorkGroups).mockResolvedValueOnce({items:[],total:0,limit:100,offset:0});
  await act(async()=>root.root.findAll(node=>node.props.label==='Actualizar')[0].props.onPress());
  await act(async()=>finish({items:[{id:'late-group',name:'Stale refresh group'}],total:1,limit:100,offset:0}));
  expect(JSON.stringify(root.toJSON())).not.toContain('Stale refresh group');
  await act(async()=>root.unmount());
});

it('does not redirect a new session after an old send resolves pending',async()=>{
  const root=await prepare('entry');
  let finish!:(value:object)=>void;
  mockSendQueued.mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  await submit(root,'entry');
  mockSession={accessToken:'new-token',user:{role:'wholesaler'}};
  await act(async()=>root.update(<CostSettlementsScreen/>));
  await act(async()=>finish({id:'cost-operation',status:'pending'}));
  expect(mockPush).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).not.toContain('Estiba registrada.');
  await act(async()=>root.unmount());
});

it('prevents double group creation while its first request is pending',async()=>{
  const root=await prepare('entry');
  let finish!:(value:Awaited<ReturnType<typeof createWorkGroup>>)=>void;
  jest.mocked(createWorkGroup).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve}));
  await act(async()=>root.root.findAll(node=>node.props.label==='Nuevo grupo')[0].props.onChangeText('Grupo nuevo'));
  const press=root.root.findAll(node=>node.props.label==='Crear grupo')[0].props.onPress;
  await act(async()=>{press();press()});
  expect(createWorkGroup).toHaveBeenCalledTimes(1);
  await act(async()=>finish({id:'new-group',name:'Grupo nuevo'}));
  await act(async()=>root.unmount());
});

it('returns to home when a directly opened cost route has no previous screen', async () => {
  mockCanGoBack.mockReturnValue(false);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<CostSettlementsScreen />)); });
  await act(async () => { barButton(root, 'Atrás').props.onPress(); });
  expect(mockReplace).toHaveBeenCalledWith('/home');
  expect(mockBack).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it.each(['freight', 'stowage'] as const)('reviews the %s amount/date and locks selection until cancellation', async kind => {
  const root = await prepare(kind);
  const dialog = root.root.findAll(node => node.props.visible && node.props.confirmLabel === 'Liquidar')[0];
  expect(dialog.props.message).toContain(kind === 'freight' ? 'S/ 5.00' : 'S/ 10.00');
  expect(dialog.props.message).toContain('1 registro seleccionado');
  expect(root.root.findAll(node => node.props.label === 'Fecha de operación')[0].props.editable).toBe(false);
  expect(root.root.findAll(node => node.props.accessibilityRole === 'checkbox').every(node => node.props.disabled)).toBe(true);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { dialog.props.onCancel(); });
  expect(root.root.findAll(node => node.props.label === 'Fecha de operación')[0].props.editable).toBe(true);
  expect(root.root.findAll(node => node.props.accessibilityRole === 'checkbox' && node.props.accessibilityState.checked)).not.toHaveLength(0);
  await act(async () => { root.unmount(); });
});
it('rejects an impossible settlement date before confirmation', async () => {
  const root = await prepare('freight');
  await act(async () => { root.root.findAll(node => node.props.confirmLabel === 'Liquidar')[0].props.onCancel(); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Fecha de operación')[0].props.onChangeText('2026-02-29'); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Revisar liquidación de fletes')[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.confirmLabel === 'Liquidar')[0].props.visible).toBe(false);
  expect(JSON.stringify(root.toJSON())).toContain('fecha válida');
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it("shows a failed purchase-settlement read instead of silently omitting the operation", async () => {
  jest.mocked(listAllReceptions).mockResolvedValueOnce({
    items: [
      {
        id: "purchase-reception",
        providerId: "provider",
        providerPhone: null,
        vehicleId: null,
        driverName: "QA",
        receivedOn: "2026-10-10",
        state: "settled",
        version: 1,
        expectedVarieties: [],
      },
    ],
    total: 1,
    offset: 0,
    limit: 1,
  });
  jest
    .mocked(getPurchaseSettlement)
    .mockRejectedValueOnce(new Error("No se pudo consultar la liquidación"));
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<CostSettlementsScreen />);
  });
  expect(
    root.root.findAll(
      (node) => node.props.message === "No se pudo consultar la liquidación",
    ),
  ).not.toHaveLength(0);
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(mockSendQueued).not.toHaveBeenCalled();
  await act(async () => {
    root.unmount();
  });
});
async function prepare(kind: Kind) {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<CostSettlementsScreen />);
  });
  if (kind === "entry") {
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Grupo")[0]
        .props.onPress();
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.title === "Seleccionar grupo")[0]
        .props.onSelect({ id: "group-id" });
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Compra o venta")[0]
        .props.onPress();
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.title === "Seleccionar operación")[0]
        .props.onSelect({ id: "sale-id" });
    });
    await act(async () => {
      root.root
        .findAll((node) => node.props.label === "Importe (S/)")[0]
        .props.onChangeText("10");
    });
  } else {
    const card = root.root.findAll(
      (node) =>
        node.props.title ===
        (kind === "freight" ? "Fletes pendientes" : "Estibas pendientes"),
    )[0];
    await act(async () => {
      card
        .findAll(
          (node) =>
            typeof node.props.label === "string" &&
            node.props.label.startsWith(
              kind === "freight" ? "Venta ·" : "Descarga ·",
            ),
        )[0]
        .props.onPress();
    });
    await act(async () => {
      root.root
        .findAll(
          (node) =>
            node.props.label ===
            (kind === "freight"
              ? "Revisar liquidación de fletes"
              : "Revisar liquidación de estibas"),
        )[0]
        .props.onPress();
    });
  }
  return root;
}
async function submit(root: ReactTestRenderer, kind: Kind) {
  await act(async () => {
    if (kind === "entry")
      root.root
        .findAll((node) => node.props.label === "Registrar estiba")[0]
        .props.onPress();
    else
      root.root
        .findAll((node) => node.props.confirmLabel === "Liquidar")[0]
        .props.onConfirm();
    await Promise.resolve();
  });
}
it.each(["freight", "stowage", "entry"] as const)(
  "stores %s before sending and preserves its confirmation",
  async (kind) => {
    const root = await prepare(kind);
    await submit(root, kind);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "cost-operation",
        method: "POST",
        type: kind === "entry" ? "stowage.entry" : `${kind}.settle`,
        path: kind === "entry" ? "/stowage/entries" : `/${kind}/settlements`,
        body: expect.objectContaining({ clientOperationId: "cost-operation" }),
      }),
    );
    expect(mockEnqueue.mock.invocationCallOrder[0]).toBeLessThan(
      mockSendQueued.mock.invocationCallOrder[0],
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(listFreightEntries).toHaveBeenCalledTimes(2);
    expect(
      root.root.findAll((node) => node.props.title === "Operación completada"),
    ).not.toHaveLength(0);
    await act(async () => {
      root.unmount();
    });
  },
);
it("does not send a settlement when the queue cannot save it", async () => {
  mockEnqueue.mockRejectedValueOnce(new Error("Storage full"));
  const root = await prepare("freight");
  await submit(root, "freight");
  expect(mockSendQueued).not.toHaveBeenCalled();
  expect(mockPush).not.toHaveBeenCalled();
  expect(
    root.root.findAll((node) => node.props.message === "Storage full"),
  ).not.toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});
it("retains central success and blocks new costs until its lookup recovers", async () => {
  const root = await prepare("freight");
  jest
    .mocked(listFreightEntries)
    .mockRejectedValueOnce(new Error("Cost lookup failed"));
  await submit(root, "freight");
  expect(
    root.root.findAll(
      (node) => node.props.message === "Liquidación confirmada.",
    ),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Registrar estiba")[0]
      .props.disabled,
  ).toBe(true);
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.actionLabel === "Reintentar consulta de costos",
      )[0]
      .props.onAction();
    await Promise.resolve();
  });
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(listFreightEntries).toHaveBeenCalledTimes(3);
  expect(
    root.root.findAll((node) => node.props.label === "Registrar estiba")[0]
      .props.disabled,
  ).toBe(false);
  await act(async () => {
    root.unmount();
  });
});
it("opens recovery for an uncertain settlement without presenting success", async () => {
  mockSendQueued.mockResolvedValueOnce({
    id: "cost-operation",
    status: "pending",
  });
  const root = await prepare("stowage");
  await submit(root, "stowage");
  expect(mockPush).toHaveBeenCalledWith("/sync-queue");
  expect(listFreightEntries).toHaveBeenCalledTimes(1);
  expect(
    root.root.findAll((node) => node.props.title === "Operación completada"),
  ).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});

it("opens costs with the current local date and retains an edited date across midnight", async () => {
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
    await act(async () => {
      first = create(<CostSettlementsScreen />);
    });
    const field = () =>
      first!.root.findAll(
        (node) => node.props.label === "Fecha de operación",
      )[0];
    expect(field().props.value).toBe("2030-09-30");
    await act(async () => {
      field().props.onChangeText("2030-09-29");
    });
    jest.setSystemTime(new Date(2030, 9, 1, 0, 5));
    await act(async () => {
      first!.update(<CostSettlementsScreen />);
    });
    expect(field().props.value).toBe("2030-09-29");
    await act(async () => {
      second = create(<CostSettlementsScreen />);
    });
    expect(
      second!.root.findAll(
        (node) => node.props.label === "Fecha de operación",
      )[0].props.value,
    ).toBe("2030-10-01");
    expect(mockEnqueue).not.toHaveBeenCalled();
  } finally {
    await act(async () => {
      first?.unmount();
      second?.unmount();
    });
    jest.useRealTimers();
  }
});
