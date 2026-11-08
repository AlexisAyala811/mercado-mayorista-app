import { ApiError } from '@/services/api/api-client';
import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { LogisticsScreen } from "@/features/logistics/screens/logistics-screen";
import { barButton, withChrome } from '../shared/with-chrome';
import {
  listCarriers,
  listVehicles,
  createCarrier,
  updateCarrier,
  deactivateCarrier,
} from "@/services/api/operations-api";
const mockInvalidate=jest.fn();
const mockSession = { accessToken: "test-token", user: { role: "wholesaler" } };
jest.mock("@/features/auth/session/session-provider", () => ({
  useSession: () => ({ session: mockSession,invalidateSession:mockInvalidate }),
}));
jest.mock("expo-font",()=>({useFonts:()=>[true,null]}));
const mockReplace=jest.fn();
const mockBack=jest.fn();const mockDispatch=jest.fn();
jest.mock("expo-router", () => ({useRouter:()=>({back:mockBack,replace:mockReplace,canGoBack:()=>true}),useNavigation:()=>({dispatch:mockDispatch})}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:jest.fn()}));
jest.mock("@/services/api/operations-api", () => ({
  listCarriers: jest.fn(),
  listVehicles: jest.fn(),
  createCarrier: jest.fn(),
  updateCarrier: jest.fn(),
  deactivateCarrier: jest.fn(),
  deactivateVehicle: jest.fn(),
  createVehicle: jest.fn(),
  updateVehicle: jest.fn(),
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
it("distinguishes no matches from empty catalogs and preserves edits while searching", async () => {
  (
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  const carrier = { id: "carrier", name: "José Álvarez", phone: "999123456" };
  jest
    .mocked(listCarriers)
    .mockResolvedValue({ items: [carrier], total: 1, offset: 0, limit: 1 });
  jest
    .mocked(listVehicles)
    .mockResolvedValue({
      items: [
        {
          id: "vehicle",
          plate: "ABC-123",
          description: null,
          carrierId: carrier.id,
          carrier,
        },
      ],
      total: 1,
      offset: 0,
      limit: 1,
    });
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(withChrome(<LogisticsScreen />));
  });
  await act(async () => {
    root.root
      .findAll((node) => node.props.accessibilityLabel === "Editar transportista José Álvarez para ABC-123")[0]
      .props.onPress();
  });
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.accessibilityLabel === "Buscar transportista o vehículo",
      )[0]
      .props.onChangeText("not present");
  });
  expect(
    root.root.findAll(
      (node) => node.props.title === "Sin coincidencias de logística",
    ),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll(
      (node) => node.props.title === "Sin coincidencias de logística",
    ),
  ).not.toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Nombre")[0].props.value,
  ).toBe("José Álvarez");
  expect(createCarrier).not.toHaveBeenCalled();
  expect(updateCarrier).not.toHaveBeenCalled();
  await act(async () => {
    root.root
      .findAll(
        (node) => node.props.accessibilityLabel === "Limpiar búsqueda de logística",
      )[0]
      .props.onPress();
  });
  expect(
    root.root.findAll(
      (node) => node.props.title === "Sin coincidencias de logística",
    ),
  ).toHaveLength(0);
  expect(
    root.root.findAll((node) => node.props.label === "Nombre")[0].props.value,
  ).toBe("José Álvarez");
  await act(async () => {
    root.unmount();
  });
});

it('distinguishes a failed initial load from empty collections and retries without changing records',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.mocked(listCarriers).mockRejectedValueOnce(new Error('network')).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  expect(JSON.stringify(root.toJSON())).toContain('Logística no disponible');expect(JSON.stringify(root.toJSON())).not.toContain('Sin registros de logística');
  await act(async()=>{root.root.findAll(node=>node.props.actionLabel==='Reintentar logística')[0]!.props.onAction();});
  expect(JSON.stringify(root.toJSON())).toContain('Sin registros de logística');expect(JSON.stringify(root.toJSON())).not.toContain('Logística no disponible');
  await act(async()=>root.unmount());
});
it('drops a previous session response after remounting the workspace',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  let resolveOld!:(value:Awaited<ReturnType<typeof listCarriers>>)=>void;
  jest.mocked(listCarriers).mockReturnValueOnce(new Promise(done=>{resolveOld=done;})).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  mockSession.accessToken='new-session';await act(async()=>root.update(<LogisticsScreen/>));
  await act(async()=>resolveOld({items:[{id:'old',name:'Previous session carrier',phone:null}],total:1,offset:0,limit:100}));
  expect(JSON.stringify(root.toJSON())).not.toContain('Previous session carrier');expect(JSON.stringify(root.toJSON())).toContain('Sin registros de logística');
  mockSession.accessToken='test-token';await act(async()=>root.unmount());
});

it('invalidates an expired session without presenting failed catalogs as empty',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  mockInvalidate.mockClear();jest.mocked(listCarriers).mockRejectedValueOnce(new ApiError('expired',401));
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  expect(mockInvalidate).toHaveBeenCalledTimes(1);expect(JSON.stringify(root.toJSON())).not.toContain('Sin registros de logística');
  await act(async()=>root.unmount());
});

it('protects modified fields on return, preserves cancellation, and discards only after confirmation',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  mockBack.mockClear();jest.mocked(listCarriers).mockResolvedValue({items:[],total:0,offset:0,limit:100});jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  const field=()=>root.root.findAll(node=>node.props.label==='Nombre')[0]!;
  const dialog=()=>root.root.findAll(node=>node.props.title==='¿Salir de logística?')[0]!;
  const back=()=>barButton(root,'Atrás');
  await act(async()=>field().props.onChangeText('Borrador QA'));
  await act(async()=>back().props.onPress());expect(mockBack).not.toHaveBeenCalled();expect(dialog().props.visible).toBe(true);expect(field().props.editable).toBe(false);
  await act(async()=>dialog().props.onCancel());expect(field().props.value).toBe('Borrador QA');expect(field().props.editable).toBe(true);
  await act(async()=>back().props.onPress());await act(async()=>dialog().props.onConfirm());expect(mockBack).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());
});
it('returns without warning when the forms remain unchanged',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  mockBack.mockClear();jest.mocked(listCarriers).mockResolvedValue({items:[],total:0,offset:0,limit:100});jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,offset:0,limit:100});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  await act(async()=>barButton(root,'Atrás').props.onPress());expect(mockBack).toHaveBeenCalledTimes(1);
  expect(root.root.findAll(node=>node.props.title==='¿Salir de logística?')[0]!.props.visible).toBe(false);await act(async()=>root.unmount());
});

it('confirms replacing a modified carrier and keeps the separate vehicle draft',async()=>{
  (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
  jest.mocked(createCarrier).mockClear();jest.mocked(updateCarrier).mockClear();
  jest.mocked(listCarriers).mockResolvedValue({items:[{id:'c1',name:'Primer transportista',phone:null},{id:'c2',name:'Segundo transportista',phone:null}],total:2,limit:100,offset:0});jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,limit:100,offset:0});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  const field=(label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
  const dialog=()=>root.root.findAll(node=>node.props.title==='¿Reemplazar la edición?')[0]!;
  await act(async()=>root.root.findAll(node=>String(node.type)==='test-control'&&node.props.label==='Editar')[0]!.props.onPress());
  await act(async()=>{field('Nombre').props.onChangeText('Mi edición');field('Placa').props.onChangeText('QA-OTRO');});
  const previousEditor=field('Nombre');
  await act(async()=>root.root.findAll(node=>String(node.type)==='test-control'&&node.props.label==='Editar')[0]!.props.onPress());expect(dialog().props.visible).toBe(false);expect(field('Nombre').props.value).toBe('Mi edición');
  expect(field('Nombre')).not.toBe(previousEditor);expect(field('Nombre').props.autoFocus).toBe(true);expect(field('Placa').props.value).toBe('QA-OTRO');
  await act(async()=>root.root.findAll(node=>String(node.type)==='test-control'&&node.props.label==='Editar')[1]!.props.onPress());expect(dialog().props.visible).toBe(true);expect(field('Nombre').props.editable).toBe(false);
  await act(async()=>dialog().props.onCancel());expect(field('Nombre').props.value).toBe('Mi edición');
  await act(async()=>root.root.findAll(node=>String(node.type)==='test-control'&&node.props.label==='Editar')[1]!.props.onPress());await act(async()=>dialog().props.onConfirm());
  expect(field('Nombre').props.value).toBe('Segundo transportista');expect(field('Placa').props.value).toBe('QA-OTRO');expect(createCarrier).not.toHaveBeenCalled();expect(updateCarrier).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});

it('keeps both drafts through pagination and search, and discards them only after confirming a new record',async()=>{
  jest.clearAllMocks();
  const carriers=Array.from({length:5},(_,i)=>({id:`c${i}`,name:`Transportista ${i}`,phone:null}));
  jest.mocked(listCarriers).mockResolvedValue({items:carriers,total:5,limit:100,offset:0});
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,limit:100,offset:0});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  const field=(label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
  const action=(label:string)=>root.root.findAll(node=>node.props.accessibilityLabel===label)[0]!;
  const dialog=()=>root.root.findAll(node=>node.props.title==='¿Abrir un registro nuevo?')[0]!;
  await act(async()=>{field('Nombre').props.onChangeText('Nombre pendiente');field('Placa').props.onChangeText('ABC-PEND');});
  await act(async()=>action('Página siguiente de Carros').props.onPress());
  expect(action('Editar transportista Transportista 4')).toBeDefined();
  expect(action('Página siguiente de Carros').props.disabled).toBe(true);
  await act(async()=>action('Buscar transportista o vehículo').props.onChangeText('Transportista 0'));
  expect(action('Editar transportista Transportista 0')).toBeDefined();
  expect(field('Nombre').props.value).toBe('Nombre pendiente');expect(field('Placa').props.value).toBe('ABC-PEND');
  await act(async()=>action('Limpiar búsqueda de logística').props.onPress());
  await act(async()=>action('Nuevo transportista o vehículo').props.onPress());
  expect(dialog().props.visible).toBe(true);
  await act(async()=>dialog().props.onCancel());expect(field('Nombre').props.value).toBe('Nombre pendiente');expect(field('Placa').props.value).toBe('ABC-PEND');
  await act(async()=>action('Nuevo transportista o vehículo').props.onPress());await act(async()=>dialog().props.onConfirm());
  expect(field('Nombre').props.value).toBe('');expect(field('Placa').props.value).toBe('');expect(field('Nombre').props.autoFocus).toBe(true);
  await act(async()=>field('Nombre').props.onChangeText('Nuevo borrador'));
  await act(async()=>barButton(root,'Menú principal').props.onPress());
  expect(mockReplace).not.toHaveBeenCalled();expect(root.root.findAll(node=>node.props.title==='¿Salir de logística?')[0]!.props.visible).toBe(true);
  expect(createCarrier).not.toHaveBeenCalled();expect(updateCarrier).not.toHaveBeenCalled();
  await act(async()=>root.unmount());
});

it('reports a confirmed save separately from failed refresh and retries only the read',async()=>{
  jest.clearAllMocks();
  const carrier={id:'c1',name:'Existente',phone:null};
  const page={items:[carrier],total:1,limit:100,offset:0};
  jest.mocked(listCarriers).mockResolvedValueOnce(page).mockRejectedValueOnce(new Error('Lectura interrumpida')).mockResolvedValue(page);
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,limit:100,offset:0});
  jest.mocked(createCarrier).mockResolvedValue({id:'new',name:'Nuevo',phone:null});
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  const field=()=>root.root.findAll(node=>node.props.label==='Nombre')[0]!;
  await act(async()=>field().props.onChangeText('Nuevo'));
  await act(async()=>root.root.findAll(node=>node.props.label==='Registrar transportista')[0]!.props.onPress());
  expect(createCarrier).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(root.toJSON())).toContain('Registro guardado en el servidor.');
  expect(JSON.stringify(root.toJSON())).toContain('Lectura interrumpida');
  await act(async()=>root.root.findAll(node=>node.props.actionLabel==='Reintentar logística')[0]!.props.onAction());
  expect(createCarrier).toHaveBeenCalledTimes(1);expect(field().props.value).toBe('');
  expect(JSON.stringify(root.toJSON())).not.toContain('Lectura interrumpida');
  await act(async()=>root.unmount());
});

it('keeps failed deactivation open and preserves the other draft after a successful retry',async()=>{
  jest.clearAllMocks();
  const carrier={id:'c1',name:'Transportista activo',phone:null};
  jest.mocked(listCarriers).mockResolvedValue({items:[carrier],total:1,limit:100,offset:0});
  jest.mocked(listVehicles).mockResolvedValue({items:[],total:0,limit:100,offset:0});
  jest.mocked(deactivateCarrier).mockRejectedValueOnce(new Error('Servidor no disponible')).mockResolvedValueOnce(undefined);
  let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<LogisticsScreen/>));});
  const field=(label:string)=>root.root.findAll(node=>node.props.label===label)[0]!;
  const dialog=()=>root.root.findAll(node=>node.props.title==='¿Desactivar registro?')[0]!;
  await act(async()=>root.root.findAll(node=>node.props.accessibilityLabel==='Editar transportista Transportista activo')[0]!.props.onPress());
  await act(async()=>field('Placa').props.onChangeText('BORRADOR'));
  await act(async()=>root.root.findAll(node=>node.props.label==='Desactivar transportista')[0]!.props.onPress());
  await act(async()=>dialog().props.onConfirm());
  expect(dialog().props.visible).toBe(true);expect(dialog().props.message).toContain('Servidor no disponible');
  expect(field('Nombre').props.value).toBe('Transportista activo');
  await act(async()=>dialog().props.onConfirm());
  expect(deactivateCarrier).toHaveBeenCalledTimes(2);expect(dialog().props.visible).toBe(false);
  expect(field('Nombre').props.value).toBe('');expect(field('Placa').props.value).toBe('BORRADOR');
  await act(async()=>root.unmount());
});
