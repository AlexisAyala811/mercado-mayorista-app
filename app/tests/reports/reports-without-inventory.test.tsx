import React from "react";
jest.mock('react-native-pdf', () => (props: object) => jest.requireActual('react').createElement('native-pdf', props));
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ReportsScreen } from "@/features/reports/screens/reports-screen";
import { shareReport } from '@/services/reports/report-sharing';
jest.mock('@/services/reports/report-sharing', () => ({ shareReport: jest.fn() }));
import { loadHistoricalCommercialFilters as loadCatalogs } from "@/services/api/analytics-api";
import {
  commercialMargin,
  commercialSummary,
  operationOverview,
  priceHistory,
  reportAlerts,
} from "@/services/api/operations-api";

let mockSession: {accessToken:string}|null = { accessToken: "test-token" };
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({ session: mockSession }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@/services/api/analytics-api", () => ({ loadHistoricalCommercialFilters: jest.fn() }));
jest.mock("@/services/api/operations-api", () => ({
  commercialSummary: jest.fn(),
  operationOverview: jest.fn(),
  commercialMargin: jest.fn(),
  reportAlerts: jest.fn(),
  priceHistory: jest.fn(),
}));
jest.mock("@/ui/components", () => {
  const react = jest.requireActual("react");
  const control = (props: object) => { const { leadingVisual, ...rest } = props as { leadingVisual?: unknown; children?: unknown }; return react.createElement("test-control", rest, leadingVisual, rest.children); };
  return {
    AppButton: control,
    AppCard: control,
    AppScreen: control,
    ChoiceDialog: control,
    EmptyState: control,
    FeedbackState: control,
    FormField: control,
    MetricTile: control,
    ScreenHeader: control,
    SelectionField: control,
  };
});

const summary = {
  purchases: { count: 1, liquidAmountCents: "50000" },
  sales: { count: 1, totalAmountCents: "10000" },
  accounts: { payableBalanceCents: "7000", receivableBalanceCents: "8000" },
  cash: { incomingCents: "10000", outgoingCents: "30000", netCents: "-20000" },
  costs: {
    purchaseFreightCents: "1000",
    saleFreightCents: "500",
    stowageCents: "200",
  },
  generatedAt: "2026-10-07T18:00:00Z",
};

it("keeps unavailable filters distinct from report generation and allows a complete catalog retry", async () => {
  jest
    .mocked(loadCatalogs)
    .mockRejectedValueOnce(new Error("Later catalog page unavailable"));
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<ReportsScreen />);
  });
  const control = (label: string) =>
    root.root.findAll((node) => node.props.label === label)[0];
  expect(control("Variedad").props.disabled).toBe(true);
  expect(control("Comprador").props.disabled).toBe(true);
  await act(async () => {
    control("Generar").props.onPress();
  });
  expect(
    root.root.findAll((node) => node.props.title === "Filtros no disponibles"),
  ).not.toHaveLength(0);
  expect(commercialSummary).toHaveBeenCalledTimes(1);
  await act(async () => {
    root.root
      .findAll((node) => node.props.actionLabel === "Reintentar filtros")[0]
      .props.onAction();
  });
  expect(loadCatalogs).toHaveBeenCalledTimes(2);
  expect(control("Variedad").props.disabled).toBe(false);
  expect(
    root.root.findAll((node) => node.props.title === "Filtros no disponibles"),
  ).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});
beforeEach(() => {
  mockSession={accessToken:'test-token'};
  jest.clearAllMocks();
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  jest
    .mocked(loadCatalogs)
    .mockResolvedValue({ buyers: [], providers: [], varieties: [], qualities: [], origins: [] });
  jest.mocked(commercialSummary).mockResolvedValue(summary);
  jest.mocked(operationOverview).mockImplementation(async (_token, operation, from, to) => ({
    operation, period: { from, to }, operationCount: '2', totalAmountCents: '12345', sacks: '4', weightKg: '31.000', currentBalanceCents: '6000', openAccountCount: '1', returnCount: '0', returnAmountCents: '0', generatedAt: '2026-10-17T23:00:00Z', balanceScope: 'current-for-period-operations', returnsScope: 'confirmed-in-period',
  }));
  jest
    .mocked(reportAlerts)
    .mockResolvedValue({
      accountAlerts: [
        {
          accountId: "account",
          kind: "payable",
          dueOn: "2026-10-01",
          balanceCents: "7000",
          status: "overdue",
        },
      ],
    });
  jest
    .mocked(priceHistory)
    .mockResolvedValue({ items: [], generatedAt: "2026-10-07T18:00:00Z" });
});
it('downloads the consulted period and invalidates sharing after changing operation', async () => {
  let canContinue!: () => boolean;
  let resolve!: (value: boolean) => void;
  jest.mocked(shareReport).mockImplementationOnce(async (_selection, _kind, _token, guard) => {
    canContinue = guard;
    return new Promise<boolean>(done => { resolve = done; });
  });
  const root = await open();
  try {
    expect(root.root.findAll(node => node.props.title === 'Reportes disponibles')).toHaveLength(0);
    await act(async () => { control(root, 'Generar').props.onPress(); });
    await act(async () => { control(root, 'Descargar Resumen del período (PDF)').props.onPress(); });
    expect(shareReport).toHaveBeenCalledWith(expect.objectContaining({ operation: 'purchase' }), 'summary', 'test-token', expect.any(Function));
    expect(canContinue()).toBe(true);
    await act(async () => { control(root, 'Venta').props.onPress(); });
    expect(canContinue()).toBe(false);
    await act(async () => { resolve(false); });
    expect(root.root.findAll(node => node.props.title === 'Archivo preparado')).toHaveLength(0);
  } finally { await act(async () => root.unmount()); }
});
async function open() {
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<ReportsScreen />);
  });
  return root;
}

it('switches report operation without keeping the previous summary or mixing global balances', async () => {
  const root = await open();
  try {
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(control(root, 'Total de compras').props.value).toBe('S/ 123.45');
    expect(control(root, 'Saldo pendiente del período').props.value).toBe('S/ 60.00');
    expect(control(root, 'Por pagar').props.value).toBe('S/ 70.00');
    await act(async () => { control(root, 'Venta').props.onPress(); });
    expect(root.root.findAll(node => node.props.label === 'Total de compras')).toHaveLength(0);
    expect(control(root, 'Venta').props.accessibilityState.selected).toBe(true);
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(operationOverview).toHaveBeenLastCalledWith('test-token', 'sale', expect.any(String), expect.any(String));
    expect(control(root, 'Total de ventas').props.value).toBe('S/ 123.45');
  } finally { await act(async () => { root.unmount(); }); }
});

it('ignores a delayed overview after switching operation', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof operationOverview>>) => void;
  jest.mocked(operationOverview).mockImplementationOnce(() => new Promise(done => { resolve = done; }));
  const root = await open();
  try {
    await act(async () => { control(root, 'Generar').props.onPress(); });
    await act(async () => { control(root, 'Venta').props.onPress(); });
    await act(async () => { resolve({ operation: 'purchase', period: { from: '2026-10-01', to: '2026-10-17' }, operationCount: '1', totalAmountCents: '99999', sacks: '1', weightKg: '1', currentBalanceCents: '0', openAccountCount: '0', returnCount: '0', returnAmountCents: '0', generatedAt: '2026-10-17T23:00:00Z', balanceScope: 'current-for-period-operations', returnsScope: 'confirmed-in-period' }); });
    expect(root.root.findAll(node => node.props.label === 'Total de compras')).toHaveLength(0);
    expect(root.root.findAll(node => node.props.label === 'Por pagar')).toHaveLength(0);
  } finally { await act(async () => { root.unmount(); }); }
});

it('shows separate installments of one account with due dates and installment balances', async () => {
  jest.mocked(reportAlerts).mockResolvedValue({ accountAlerts: [
    { accountId: 'same-account', installmentId: 'first-installment', kind: 'payable', dueOn: '2026-10-01', balanceCents: '7000', status: 'overdue' },
    { accountId: 'same-account', installmentId: 'second-installment', kind: 'payable', dueOn: '2026-10-01', balanceCents: '7000', status: 'overdue' },
  ] });
  const root = await open();
  try {
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(control(root, 'Cuotas').props.value).toBe('2');
    const rendered = JSON.stringify(root.toJSON());
    for (const text of ['first-installment', 'second-installment', 'same-account', 'Vencida al corte', 'Vence: 01/10/2026', 'Saldo de cuota:', 'S/ 70.00']) expect(rendered).toContain(text);
    await act(async () => { control(root, 'Hasta').props.onChangeText('2026-09-01'); });
    expect(JSON.stringify(root.toJSON())).not.toContain('first-installment');
  } finally { await act(async () => { root.unmount(); }); }
});

it('distinguishes an empty financial alert result from an unqueried report', async () => {
  jest.mocked(reportAlerts).mockResolvedValue({ accountAlerts: [] });
  const root = await open();
  try {
    expect(root.root.findAll(node => node.props.title === 'Sin cuotas pendientes al corte')).toHaveLength(0);
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(root.root.findAll(node => node.props.title === 'Sin cuotas pendientes al corte').length).toBeGreaterThan(0);
    expect(control(root, 'Cuotas').props.value).toBe('0');
  } finally { await act(async () => { root.unmount(); }); }
});

it('rejects impossible periods before requesting any report and accepts a leap day', async () => {
  const root = await open();
  try {
    await act(async () => { control(root, 'Desde').props.onChangeText('2026-02-30'); control(root, 'Hasta').props.onChangeText('2026-03-01'); });
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(commercialSummary).not.toHaveBeenCalled();
    expect(reportAlerts).not.toHaveBeenCalled();
    expect(priceHistory).not.toHaveBeenCalled();
    expect(root.root.findAll(node => node.props.title === 'No se pudo generar').length).toBeGreaterThan(0);
    await act(async () => { control(root, 'Desde').props.onChangeText('2024-02-29'); control(root, 'Hasta').props.onChangeText('2024-03-01'); });
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(commercialSummary).toHaveBeenCalledWith('test-token', '2024-02-29', '2024-03-01');
  } finally { await act(async () => { root.unmount(); }); }
});

it('shows the central summary timestamp in Lima and removes it with stale results', async () => {
  const root = await open();
  try {
    await act(async () => { control(root, 'Generar').props.onPress(); });
    const rendered = JSON.stringify(root.toJSON());
    expect(rendered).toContain('Resumen actualizado:');
    expect(rendered).toContain('07/10/2026');
    expect(rendered).toContain('13:00');
    await act(async () => { control(root, 'Desde').props.onChangeText('2026-01-01'); });
    expect(JSON.stringify(root.toJSON())).not.toContain('Resumen actualizado:');
  } finally { await act(async () => { root.unmount(); }); }
});
const control = (root: ReactTestRenderer, label: string) =>
  root.root.findAll((node) => node.props.label === label)[0];

it("shows financial balances and costs without requesting a lot margin or displaying stock", async () => {
  const root = await open();
  await act(async () => {
    control(root, "Generar").props.onPress();
  });
  expect(control(root, "Por pagar").props.value).toBe("S/ 70.00");
  expect(control(root, "Caja neta").props.value).toBe("S/ -200.00");
  expect(control(root, "Estiba").props.value).toBe("S/ 2.00");
  expect(commercialMargin).not.toHaveBeenCalled();
  expect(
    root.root.findAll((node) =>
      /stock|margen|costo vendido/i.test(
        node.props.label ?? node.props.title ?? "",
      ),
    ),
  ).toHaveLength(0);
  await act(async () => {
    control(root, "Desde").props.onChangeText("2026-09-01");
  });
  expect(
    root.root.findAll((node) => node.props.label === "Por pagar"),
  ).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});

it("ignores a late report after its period has changed", async () => {
  let resolve!: (value: typeof summary) => void;
  jest.mocked(commercialSummary).mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const root = await open();
  await act(async () => {
    control(root, "Generar").props.onPress();
  });
  await act(async () => {
    control(root, "Desde").props.onChangeText("2026-09-01");
  });
  await act(async () => {
    resolve(summary);
  });
  expect(
    root.root.findAll((node) => node.props.label === "Por pagar"),
  ).toHaveLength(0);
  await act(async () => {
    root.unmount();
  });
});
it('clears results, edited dates and the open filter dialog when the session changes',async()=>{
  const root=await open();
  const initial=control(root,'Desde').props.value;
  await act(async()=>control(root,'Generar').props.onPress());
  expect(control(root,'Por pagar').props.value).toBe('S/ 70.00');
  await act(async()=>{control(root,'Desde').props.onChangeText('2020-01-01');control(root,'Operación').props.onPress();});
  await act(async()=>control(root,'Generar').props.onPress());
  expect(control(root,'Por pagar').props.value).toBe('S/ 70.00');
  mockSession={accessToken:'next-token'};
  await act(async()=>root.update(<ReportsScreen/>));
  expect(control(root,'Desde').props.value).toBe(initial);
  expect(root.root.findAll(node=>node.props.label==='Por pagar')).toHaveLength(0);
  expect(root.root.findAll(node=>typeof node.props.onSelect==='function')[0]!.props.visible).toBe(false);
  expect(loadCatalogs).toHaveBeenLastCalledWith('next-token');
  mockSession=null;await act(async()=>root.update(<ReportsScreen/>));expect(root.toJSON()).toBeNull();
  await act(async()=>root.unmount());
});
it('filters known and unreported characteristics, preserves original price labels and clears independently',async()=>{
  jest.mocked(loadCatalogs).mockResolvedValueOnce({buyers:[],providers:[],varieties:[],qualities:[{id:'q1',name:'Calidad actual',isActive:false}],origins:[]});
  jest.mocked(priceHistory).mockResolvedValueOnce({generatedAt:'2026-10-14T15:00:00Z',items:[
    {operationType:'sale',operationId:'s1',sourceLineId:'l1',occurredAt:'2026-10-14T04:59:59Z',varietyId:'v1',varietyName:'Papa',counterpartyId:'b1',counterpartyName:'Cliente',priceBasis:'kilogram',unitPriceCents:'300',qualityId:'q1',qualityName:'Calidad original',originId:null,originName:null},
    {operationType:'sale',operationId:'s1',sourceLineId:'l2',occurredAt:'2026-10-14T04:59:59Z',varietyId:'v1',varietyName:'Papa',counterpartyId:'b1',counterpartyName:'Cliente',priceBasis:'kilogram',unitPriceCents:'400',qualityId:'q1',qualityName:'Otra etiqueta histórica',originId:null,originName:null},
  ]});
  const root=await open();
  await act(async()=>control(root,'Calidad comercial').props.onPress());
  const choices=root.root.findAll(node=>node.props.title==='Filtrar por calidad comercial')[0]!;
  expect(choices.props.choices).toContainEqual({id:'q1',label:'Calidad actual (desactivado)'});await act(async()=>choices.props.onSelect({id:'q1'}));
  await act(async()=>control(root,'Procedencia de la papa').props.onPress());await act(async()=>root.root.findAll(node=>node.props.title==='Filtrar por procedencia de la papa')[0]!.props.onSelect({id:'unreported'}));
  await act(async()=>control(root,'Generar').props.onPress());expect(priceHistory).toHaveBeenLastCalledWith('test-token',expect.any(String),expect.any(String),expect.objectContaining({qualityId:'q1',originId:'unreported'}));
  const rendered=JSON.stringify(root.toJSON());expect(rendered).toContain('Calidad original');expect(rendered).toContain('Otra etiqueta histórica');expect(rendered).toContain('Procedencia: No informada');
  await act(async()=>control(root,'Limpiar filtros').props.onPress());expect(JSON.stringify(root.toJSON())).not.toContain('Calidad original');
  await act(async()=>control(root,'Generar').props.onPress());expect(priceHistory).toHaveBeenLastCalledWith('test-token',expect.any(String),expect.any(String),expect.objectContaining({qualityId:undefined,originId:undefined}));await act(async()=>root.unmount());
});
it('does not expose a pending report from the previous session',async()=>{
  let resolve!:(value:typeof summary)=>void;
  jest.mocked(commercialSummary).mockReturnValueOnce(new Promise(done=>{resolve=done;}));
  const root=await open();await act(async()=>control(root,'Generar').props.onPress());
  mockSession={accessToken:'next-token'};await act(async()=>root.update(<ReportsScreen/>));
  await act(async()=>resolve(summary));
  expect(root.root.findAll(node=>node.props.label==='Por pagar')).toHaveLength(0);
  expect(control(root,'Generar').props.disabled).toBe(false);
  await act(async()=>root.unmount());
});

it('does not mention returns in the sales summary even when the server reports them (CL-FM14)', async () => {
  jest.mocked(operationOverview).mockImplementation(async (_token, operation, from, to) => ({
    operation, period: { from, to }, operationCount: '2', totalAmountCents: '12345', sacks: '4', weightKg: '31.000', currentBalanceCents: '6000', openAccountCount: '1', returnCount: '3', returnAmountCents: '4500', generatedAt: '2026-10-17T23:00:00Z', balanceScope: 'current-for-period-operations', returnsScope: 'confirmed-in-period',
  }));
  const root = await open();
  try {
    await act(async () => { control(root, 'Venta').props.onPress(); });
    await act(async () => { control(root, 'Generar').props.onPress(); });
    expect(control(root, 'Total de ventas').props.value).toBe('S/ 123.45');
    const texts = root.root.findAll(node => typeof node.type === 'string' || typeof node.props.children === 'string')
      .map(node => [node.props.children].flat().join(''));
    expect(texts.some(text => /devoluci/i.test(text))).toBe(false);
  } finally { await act(async () => { root.unmount(); }); }
});
