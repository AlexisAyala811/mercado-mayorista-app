import React from 'react';
import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {CatalogScreen} from '@/features/catalog/screens/catalog-screen';
import {createCatalogItem,deactivateCatalogItem,loadMasterCatalogs,updateCatalogItem} from '@/services/api/catalog-api';
import {ApiError} from '@/services/api/api-client';
import {usePreventRemove} from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';
import {OperationReferenceEditor} from '@/features/catalog/screens/catalog-workspace';
import {Modal} from 'react-native';
import { barButton, withChrome } from '../shared/with-chrome';

let mockToken='qa-token';let mockRole='wholesaler';const mockInvalidate=jest.fn();const mockReplace=jest.fn();const mockDispatch=jest.fn();
jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({session:{accessToken:mockToken,user:{role:mockRole}},invalidateSession:mockInvalidate})}));
jest.mock('expo-router',()=>({useRouter:()=>({replace:mockReplace,canGoBack:()=>false}),useNavigation:()=>({dispatch:mockDispatch})}));
jest.mock('expo-router/react-navigation',()=>({usePreventRemove:jest.fn()}));
jest.mock('@/navigation/use-browser-traversal-guard',()=>({useBrowserTraversalGuard:jest.fn()}));
jest.mock('@/services/api/catalog-api',()=>({loadMasterCatalogs:jest.fn(),createCatalogItem:jest.fn(),updateCatalogItem:jest.fn(),deactivateCatalogItem:jest.fn()}));
jest.mock('@/ui/components',()=>{
  const react=jest.requireActual('react');const host=(props:object)=>react.createElement('test-control',props);
  return{AppButton:host,AppCard:host,AppScreen:host,ConfirmationDialog:host,EmptyState:host,FeedbackState:host,FormField:host,LoadingState:host,ScreenHeader:host};
});
const data=()=>({providers:[],buyers:[],varieties:[],qualities:[{id:'q1',name:'Calidad QA',kind:'quality' as const,isActive:true}],origins:[{id:'o1',name:'Origen QA',kind:'origin' as const,isActive:true}]});
function control(root:ReactTestRenderer,key:string,value:string){return root.root.findAll(node=>String(node.type)==='test-control'&&node.props[key]===value)[0];}
async function open(){let root!:ReactTestRenderer;await act(async()=>{root=create(withChrome(<CatalogScreen/>));});return root;}
beforeEach(()=>{(globalThis as typeof globalThis&{IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;jest.clearAllMocks();mockToken='qa-token';mockRole='wholesaler';jest.mocked(loadMasterCatalogs).mockResolvedValue(data());jest.mocked(createCatalogItem).mockResolvedValue({});jest.mocked(deactivateCatalogItem).mockResolvedValue(undefined);});

it.each([['Calidades','qualities'],['Procedencias','origins']])('saves %s to its own collection with only a trimmed name',async(label,kind)=>{
  const root=await open();await act(async()=>control(root,'label',label).props.onPress());
  expect(control(root,'label','Teléfono')).toBeUndefined();
  await act(async()=>control(root,'label','Nombre').props.onChangeText('  Nombre QA  '));
  await act(async()=>control(root,'label','Guardar').props.onPress());
  expect(createCatalogItem).toHaveBeenCalledWith('qa-token',kind,{name:'Nombre QA'});
  expect(control(root,'title','Operación confirmada')).toBeDefined();expect(control(root,'label','Nombre').props.value).toBe('');await act(async()=>root.unmount());
});
it('preserves a confirmed save when refreshing fails, and retries reads without another write',async()=>{
  const root=await open();await act(async()=>control(root,'label','Calidades').props.onPress());
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Nueva calidad'));
  jest.mocked(loadMasterCatalogs).mockRejectedValueOnce(new Error('Lectura temporalmente no disponible'));
  await act(async()=>control(root,'label','Guardar').props.onPress());
  expect(control(root,'title','Operación confirmada')).toBeDefined();expect(control(root,'title','Revisa la operación')).toBeDefined();
  await act(async()=>control(root,'title','Revisa la operación').props.onAction());expect(createCatalogItem).toHaveBeenCalledTimes(1);await act(async()=>root.unmount());
});
it('confirms the named option, blocks double submission, and leaves history intact through deactivation',async()=>{
  let resolve!:()=>void;jest.mocked(deactivateCatalogItem).mockImplementation(()=>new Promise<void>(done=>{resolve=done;}));
  const root=await open();await act(async()=>control(root,'label','Calidades').props.onPress());
  await act(async()=>control(root,'accessibilityLabel','Desactivar Calidad QA').props.onPress());
  const confirm=()=>control(root,'confirmLabel','Desactivar');expect(confirm().props.message).toContain('Calidad QA');
  let work!:Promise<void>;await act(async()=>{work=confirm().props.onConfirm();confirm().props.onConfirm();});
  expect(deactivateCatalogItem).toHaveBeenCalledTimes(1);expect(deactivateCatalogItem).toHaveBeenCalledWith('qa-token','qualities','q1');expect(control(root,'label','Procedencias').props.disabled).toBe(true);
  await act(async()=>{resolve();await work;});expect(confirm().props.visible).toBe(false);await act(async()=>root.unmount());
});
it('does not expose a false empty collection when the initial request fails',async()=>{
  jest.mocked(loadMasterCatalogs).mockRejectedValueOnce(new Error('Sin conexión'));
  const root=await open();expect(control(root,'title','Sin registros')).toBeUndefined();expect(control(root,'label','Nombre')).toBeUndefined();
  await act(async()=>control(root,'title','Revisa la operación').props.onAction());expect(control(root,'label','Nombre')).toBeDefined();await act(async()=>root.unmount());
});
it('does not close a new session or restore an old form after a previous write rejects late',async()=>{
  let reject!:(cause:Error)=>void;jest.mocked(createCatalogItem).mockImplementation(()=>new Promise((_resolve,fail)=>{reject=fail;}));
  const root=await open();await act(async()=>control(root,'label','Calidades').props.onPress());await act(async()=>control(root,'label','Nombre').props.onChangeText('Anterior'));
  let work!:Promise<void>;await act(async()=>{work=control(root,'label','Guardar').props.onPress();});
  mockToken='new-token';await act(async()=>root.update(<CatalogScreen/>));
  await act(async()=>{reject(new ApiError('Sesión anterior rechazada',401));await work;});
  expect(mockInvalidate).not.toHaveBeenCalled();expect(control(root,'label','Nombre').props.value).toBe('');expect(control(root,'title','Operación confirmada')).toBeUndefined();await act(async()=>root.unmount());
});

const discard=(root:ReactTestRenderer)=>control(root,'confirmLabel','Descartar cambios');
it('cancels a tab replacement without losing fields and discards only after confirmation',async()=>{
  const root=await open();
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Proveedor sin guardar'));
  await act(async()=>control(root,'label','Teléfono').props.onChangeText('999123456'));
  await act(async()=>control(root,'label','Calidades').props.onPress());
  expect(discard(root).props.visible).toBe(true);expect(control(root,'label','Guardar').props.disabled).toBe(true);
  await act(async()=>discard(root).props.onCancel());
  expect(control(root,'label','Nombre').props.value).toBe('Proveedor sin guardar');expect(control(root,'label','Teléfono').props.value).toBe('999123456');
  await act(async()=>control(root,'label','Calidades').props.onPress());await act(async()=>discard(root).props.onConfirm());
  expect(control(root,'label','Teléfono')).toBeUndefined();expect(control(root,'label','Nombre').props.value).toBe('');
  expect(createCatalogItem).not.toHaveBeenCalled();expect(deactivateCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('preserves same-record edits and confirms replacement or cancellation of an edited record',async()=>{
  jest.mocked(loadMasterCatalogs).mockResolvedValue({...data(),providers:[{id:'p1',name:'Proveedor uno',phone:'999111222'},{id:'p2',name:'Proveedor dos',phone:null}]});
  const root=await open();await act(async()=>control(root,'accessibilityLabel','Editar Proveedor uno').props.onPress());
  expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Nombre editado'));
  await act(async()=>control(root,'accessibilityLabel','Editar Proveedor uno').props.onPress());
  expect(discard(root).props.visible).toBe(false);expect(control(root,'label','Nombre').props.value).toBe('Nombre editado');
  await act(async()=>control(root,'accessibilityLabel','Editar Proveedor dos').props.onPress());await act(async()=>discard(root).props.onCancel());
  expect(control(root,'label','Nombre').props.value).toBe('Nombre editado');
  await act(async()=>control(root,'label','Cancelar edición').props.onPress());await act(async()=>discard(root).props.onCancel());
  expect(control(root,'label','Nombre').props.value).toBe('Nombre editado');
  await act(async()=>control(root,'accessibilityLabel','Editar Proveedor dos').props.onPress());await act(async()=>discard(root).props.onConfirm());
  expect(control(root,'label','Nombre').props.value).toBe('Proveedor dos');expect(control(root,'label','Teléfono').props.value).toBe('');
  expect(createCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('does not treat unchanged or restored fields as a new draft',async()=>{
  const root=await open();await act(async()=>control(root,'label','Calidades').props.onPress());await act(async()=>control(root,'accessibilityLabel','Editar Calidad QA').props.onPress());
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Cambiado'));await act(async()=>control(root,'label','Nombre').props.onChangeText('Calidad QA'));
  await act(async()=>control(root,'label','Procedencias').props.onPress());
  expect(discard(root).props.visible).toBe(false);expect(control(root,'label','Nombre').props.value).toBe('');await act(async()=>root.unmount());
});
it('retains local draft on cancelled back navigation and resumes the original native action after discard',async()=>{
  const root=await open();await act(async()=>control(root,'label','Nombre').props.onChangeText('Sin guardar'));
  const guard=jest.mocked(usePreventRemove).mock.lastCall!;expect(guard[0]).toBe(true);
  const action={type:'GO_BACK'};await act(async()=>guard[1]({data:{action}} as Parameters<typeof guard[1]>[0]));
  expect(mockDispatch).not.toHaveBeenCalled();await act(async()=>discard(root).props.onCancel());
  expect(control(root,'label','Nombre').props.value).toBe('Sin guardar');
  await act(async()=>jest.mocked(usePreventRemove).mock.lastCall![1]({data:{action}} as Parameters<typeof guard[1]>[0]));
  await act(async()=>discard(root).props.onConfirm());expect(mockDispatch).toHaveBeenCalledWith(action);expect(createCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('preserves the browser destination through cancellation and discard',async()=>{
  const root=await open();await act(async()=>control(root,'label','Nombre').props.onChangeText('Borrador'));
  const leave=jest.fn();await act(async()=>jest.mocked(useBrowserTraversalGuard).mock.lastCall![2](leave));
  await act(async()=>discard(root).props.onCancel());expect(leave).not.toHaveBeenCalled();expect(control(root,'label','Nombre').props.value).toBe('Borrador');
  await act(async()=>barButton(root,'Atrás').props.onPress());await act(async()=>discard(root).props.onCancel());expect(mockReplace).not.toHaveBeenCalled();
  await act(async()=>jest.mocked(useBrowserTraversalGuard).mock.lastCall![2](leave));await act(async()=>discard(root).props.onConfirm());expect(leave).toHaveBeenCalledTimes(1);expect(mockReplace).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('does not start deactivation while a draft discard is cancelled',async()=>{
  const root=await open();await act(async()=>control(root,'label','Calidades').props.onPress());await act(async()=>control(root,'label','Nombre').props.onChangeText('Nuevo nombre'));
  await act(async()=>control(root,'accessibilityLabel','Desactivar Calidad QA').props.onPress());
  expect(control(root,'confirmLabel','Desactivar').props.visible).toBe(false);await act(async()=>discard(root).props.onCancel());expect(control(root,'label','Nombre').props.value).toBe('Nuevo nombre');
  await act(async()=>control(root,'accessibilityLabel','Desactivar Calidad QA').props.onPress());await act(async()=>discard(root).props.onConfirm());
  expect(control(root,'confirmLabel','Desactivar').props.visible).toBe(true);expect(deactivateCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('blocks native/browser departure while a write is in flight and preserves failed input',async()=>{
  let reject!:(cause:Error)=>void;jest.mocked(createCatalogItem).mockReturnValueOnce(new Promise((_done,fail)=>{reject=fail;}));
  const root=await open();await act(async()=>control(root,'label','Nombre').props.onChangeText('Conservar'));
  await act(async()=>control(root,'label','Guardar').props.onPress());
  const guard=jest.mocked(usePreventRemove).mock.lastCall!;await act(async()=>guard[1]({data:{action:{type:'GO_BACK'}}} as Parameters<typeof guard[1]>[0]));
  const leave=jest.fn();await act(async()=>jest.mocked(useBrowserTraversalGuard).mock.lastCall![2](leave));
  expect(discard(root).props.visible).toBe(false);expect(mockDispatch).not.toHaveBeenCalled();expect(leave).not.toHaveBeenCalled();
  await act(async()=>{reject(new Error('Fallo de red'));});expect(control(root,'label','Nombre').props.value).toBe('Conservar');
  expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);await act(async()=>root.unmount());
});

it('keeps the first destination and resumes it only once despite rapid repeated callbacks',async()=>{
  const root=await open();await act(async()=>control(root,'label','Nombre').props.onChangeText('Borrador'));
  const leave=jest.fn();const requestExit=jest.mocked(useBrowserTraversalGuard).mock.lastCall![2];
  await act(async()=>{requestExit(leave);control(root,'label','Procedencias').props.onPress();});
  const confirm=discard(root).props.onConfirm;await act(async()=>{confirm();confirm();});
  expect(leave).toHaveBeenCalledTimes(1);expect(control(root,'label','Teléfono')).toBeDefined();expect(createCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});

it('restores draft protection when the browser fails to resume the confirmed destination',async()=>{
  const root=await open();await act(async()=>control(root,'label','Nombre').props.onChangeText('Conservar tras fallo'));
  await act(async()=>jest.mocked(useBrowserTraversalGuard).mock.lastCall![2](jest.fn()));await act(async()=>discard(root).props.onConfirm());
  expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  await act(async()=>jest.mocked(useBrowserTraversalGuard).mock.lastCall![3]());
  expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);expect(control(root,'label','Nombre').props.value).toBe('Conservar tras fallo');
  expect(control(root,'title','Revisa la operación').props.message).toContain('navegación');await act(async()=>root.unmount());
});

it('compares every buyer field against its original and clears protection after a confirmed save',async()=>{
  jest.mocked(loadMasterCatalogs).mockResolvedValue({...data(),buyers:[{id:'b1',name:'Comprador QA',phone:'999000111',destinationDepartment:'Junín',creditLimitCents:'12345'}]});
  const root=await open();await act(async()=>control(root,'label','Compradores').props.onPress());await act(async()=>control(root,'accessibilityLabel','Editar Comprador QA').props.onPress());
  expect(control(root,'label','Límite de crédito (S/)').props.value).toBe('123.45');expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  for(const [field,changed,original] of [['Teléfono','999999999','999000111'],['Departamento de destino','Lima','Junín'],['Límite de crédito (S/)','123.46','123.45']]){
    await act(async()=>control(root,'label',field!).props.onChangeText(changed));expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(true);
    await act(async()=>control(root,'label',field!).props.onChangeText(original));expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);
  }
  await act(async()=>control(root,'label','Cancelar edición').props.onPress());expect(discard(root).props.visible).toBe(false);
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Comprador nuevo'));await act(async()=>control(root,'label','Guardar').props.onPress());
  expect(jest.mocked(usePreventRemove).mock.lastCall?.[0]).toBe(false);expect(control(root,'label','Nombre').props.value).toBe('');await act(async()=>root.unmount());
});

it('opens only the contextual list and reports confirmed changes when returning to the operation',async()=>{
  const close=jest.fn();const state=jest.fn();let root!:ReactTestRenderer;
  await act(async()=>{root=create(<OperationReferenceEditor kind="qualities" onClose={close} onEditingState={state}/>);});
  expect(control(root,'title','Datos maestros')).toBeUndefined();expect(control(root,'title','Calidades')).toBeDefined();expect(control(root,'label','Procedencias')).toBeUndefined();
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Calidad contextual'));expect(state).toHaveBeenLastCalledWith(true,false);
  await act(async()=>control(root,'label','Guardar').props.onPress());expect(createCatalogItem).toHaveBeenCalledWith('qa-token','qualities',{name:'Calidad contextual'});
  await act(async()=>control(root,'label','Volver al formulario').props.onPress());expect(close).toHaveBeenCalledWith(true);expect(mockReplace).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it.each(['providers','buyers'] as const)('clears optional %s fields explicitly without altering an existing credit limit',async(kind)=>{
  const initial=kind==='providers'?{id:'p-clear',name:'Referencia QA',phone:'999000111'}:{id:'b-clear',name:'Referencia QA',phone:'999000111',destinationDepartment:'Junín',creditLimitCents:'12345'};
  jest.mocked(loadMasterCatalogs).mockResolvedValue({...data(),[kind]:[initial]});
  const close=jest.fn();let root!:ReactTestRenderer;
  await act(async()=>{root=create(<OperationReferenceEditor kind={kind} onClose={close} onEditingState={jest.fn()}/>);});
  await act(async()=>control(root,'accessibilityLabel','Editar Referencia QA').props.onPress());
  await act(async()=>{control(root,'label','Teléfono').props.onChangeText('');if(kind==='buyers')control(root,'label','Departamento de destino').props.onChangeText('');});
  await act(async()=>control(root,'label','Cancelar edición').props.onPress());await act(async()=>discard(root).props.onCancel());
  expect(control(root,'label','Teléfono').props.value).toBe('');expect(updateCatalogItem).not.toHaveBeenCalled();
  const cleared=kind==='providers'?{...initial,phone:null}:{...initial,phone:null,destinationDepartment:null};
  jest.mocked(loadMasterCatalogs).mockResolvedValue({...data(),[kind]:[cleared]});
  await act(async()=>control(root,'label','Guardar').props.onPress());
  expect(updateCatalogItem).toHaveBeenCalledWith('qa-token',kind,initial.id,kind==='providers'?{name:'Referencia QA',phone:''}:{name:'Referencia QA',phone:'',destinationDepartment:'',creditLimitCents:12345});
  await act(async()=>control(root,'accessibilityLabel','Editar Referencia QA').props.onPress());
  expect(control(root,'label','Teléfono').props.value).toBe('');
  if(kind==='buyers'){expect(control(root,'label','Departamento de destino').props.value).toBe('');expect(control(root,'label','Límite de crédito (S/)').props.value).toBe('123.45');}
  await act(async()=>control(root,'label','Volver al formulario').props.onPress());expect(close).toHaveBeenCalledWith(true);expect(createCatalogItem).not.toHaveBeenCalled();expect(deactivateCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('keeps contextual changes when dismiss is cancelled and never writes on discard',async()=>{
  const close=jest.fn();let root!:ReactTestRenderer;await act(async()=>{root=create(<OperationReferenceEditor kind="origins" onClose={close} onEditingState={jest.fn()}/>);});
  await act(async()=>control(root,'label','Nombre').props.onChangeText('Procedencia no guardada'));await act(async()=>root.root.findAllByType(Modal)[0]!.props.onRequestClose());
  await act(async()=>discard(root).props.onCancel());expect(control(root,'label','Nombre').props.value).toBe('Procedencia no guardada');expect(close).not.toHaveBeenCalled();
  await act(async()=>control(root,'label','Volver al formulario').props.onPress());await act(async()=>discard(root).props.onConfirm());expect(close).toHaveBeenCalledWith(false);expect(createCatalogItem).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
it('does not expose contextual administration to the assistant',async()=>{
  mockRole='assistant';let root!:ReactTestRenderer;await act(async()=>{root=create(<OperationReferenceEditor kind="providers" onClose={jest.fn()} onEditingState={jest.fn()}/>);});
  expect(root.toJSON()).toBeNull();expect(loadMasterCatalogs).not.toHaveBeenCalled();await act(async()=>root.unmount());
});
