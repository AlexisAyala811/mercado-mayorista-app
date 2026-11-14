import {useCallback,useEffect,useRef,useState} from 'react';
import {Modal,Platform,StyleSheet,Text,View} from 'react-native';
import {useRouter,useNavigation} from 'expo-router';
import {usePreventRemove} from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';
import {backOrHome} from '@/navigation/back-or-home';
import {useBottomNav} from '@/ui/navigation/app-chrome';
import {formatMoney,moneyInputToCents,type PotatoVariety,type Provider} from '@/domain/reception/reception';
import type {Buyer} from '@/domain/sales/sale';
import type {CommercialCharacteristic} from '@/domain/catalog/commercial-characteristic';
import {useSession} from '@/features/auth/session/session-provider';
import {createCatalogItem,deactivateCatalogItem,loadMasterCatalogs as loadCatalogs,updateCatalogItem,type CatalogKind} from '@/services/api/catalog-api';
import {ApiError} from '@/services/api/api-client';
import {AppButton,AppCard,AppScreen,ConfirmationDialog,EmptyState,FeedbackState,FormField,LoadingState,ScreenHeader} from '@/ui/components';
import {color,spacing,typography} from '@/ui/tokens';

type Item=Provider|Buyer|PotatoVariety|CommercialCharacteristic;
const kinds:readonly {id:CatalogKind;label:string}[]=[{id:'providers',label:'Proveedores'},{id:'buyers',label:'Compradores'},{id:'varieties',label:'Variedades'},{id:'qualities',label:'Calidades'},{id:'origins',label:'Procedencias'}];
type PendingChange={run:()=>void;leave:boolean;message:string};
type EmbeddedProps={referenceKind?:CatalogKind;onClose?:(changed:boolean)=>void;onEditingState?:(dirty:boolean,busy:boolean)=>void};

export function OperationReferenceEditor({kind,onClose,onEditingState}:{kind:CatalogKind;onClose:(changed:boolean)=>void;onEditingState:(dirty:boolean,busy:boolean)=>void}){
  const {session}=useSession();
  return session?.user.role==='wholesaler'?<CatalogWorkspace key={`${session.accessToken}:${kind}`} referenceKind={kind} onClose={onClose} onEditingState={onEditingState}/>:null;
}

export function CatalogScreen(){
  const {session}=useSession();
  return session?<CatalogWorkspace key={session.accessToken}/>:null;
}

function CatalogWorkspace({referenceKind,onClose,onEditingState}:EmbeddedProps={}){
  const embedded=referenceKind!==undefined;const changed=useRef(false);const editingCallback=useRef(onEditingState);editingCallback.current=onEditingState;
  const router=useRouter();const{session,invalidateSession}=useSession();const token=session?.accessToken??'';
  const[kind,setKind]=useState<CatalogKind>(referenceKind??'providers');
  const[data,setData]=useState<Awaited<ReturnType<typeof loadCatalogs>>|null>(null);
  const[editing,setEditing]=useState<Item|null>(null);
  const[editorFocus,setEditorFocus]=useState(0);
  const[name,setName]=useState('');const[phone,setPhone]=useState('');const[destination,setDestination]=useState('');const[credit,setCredit]=useState('');
  const[deleting,setDeleting]=useState<{kind:CatalogKind;item:Item}|null>(null);
  const[loading,setLoading]=useState(true);const[busy,setBusy]=useState(false);
  const[error,setError]=useState<string|null>(null);const[notice,setNotice]=useState<string|null>(null);
  const active=useRef(true);const request=useRef(0);const writing=useRef(false);
  const navigation=useNavigation();const exitAllowed=useRef(false);const pendingRef=useRef<PendingChange|null>(null);
  const[discarded,setDiscarded]=useState(false);const[pending,setPending]=useState<PendingChange|null>(null);
  const originalPhone=editing&&'phone'in editing?editing.phone??'':'';
  const originalDestination=editing&&'destinationDepartment'in editing?editing.destinationDepartment??'':'';
  const originalCredit=editing&&'creditLimitCents'in editing&&editing.creditLimitCents?String(Number(editing.creditLimitCents)/100):'';
  const hasUnsavedChanges=name!==(editing?.name??'')||phone!==originalPhone||destination!==originalDestination||credit!==originalCredit;
  const protectExit=!discarded&&(hasUnsavedChanges||busy);
  useEffect(()=>{editingCallback.current?.(hasUnsavedChanges,busy);},[hasUnsavedChanges,busy]);
  useBrowserTraversalGuard(!embedded&&protectExit,exitAllowed,leave=>{
    if(active.current&&!writing.current&&!pendingRef.current&&!deleting)queueChange({run:leave,leave:true,message:'Los cambios del registro todavía no se han guardado. Salir los descartará.'});
  },()=>{if(active.current){exitAllowed.current=false;setDiscarded(false);setError('No se pudo completar la navegación. Inténtalo nuevamente.');}});
  usePreventRemove(!embedded&&protectExit,({data})=>{
    if(exitAllowed.current){navigation.dispatch(data.action);return;}
    if(writing.current||pendingRef.current||deleting)return;
    queueChange({run:()=>navigation.dispatch(data.action),leave:true,message:'Los cambios del registro todavía no se han guardado. Salir los descartará.'});
  });
  useEffect(()=>{
    if(embedded||Platform.OS!=='web'||!protectExit||typeof window==='undefined')return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(exitAllowed.current)return;event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[embedded,protectExit]);
  function queueChange(change:PendingChange){if(!active.current||pendingRef.current)return;pendingRef.current=change;setPending(change);}
  function cancelDiscard(){if(writing.current)return;pendingRef.current=null;setPending(null);}
  function requestChange(run:()=>void,leave=false){
    if(!active.current||writing.current||loading||pendingRef.current||deleting)return;
    if(hasUnsavedChanges)queueChange({run,leave,message:leave?'Los cambios del registro todavía no se han guardado. Salir los descartará.':'Los cambios del registro todavía no se han guardado. Continuar los descartará.'});
    else run();
  }
  function confirmDiscard(){
    if(!active.current||writing.current||!pendingRef.current)return;
    const change=pendingRef.current;pendingRef.current=null;setPending(null);
    if(change.leave){exitAllowed.current=true;setDiscarded(true);}
    change.run();
  }
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const read=useCallback(async()=>{
    const current=++request.current;
    try{const result=await loadCatalogs(token);if(active.current&&current===request.current)setData(result);}
    catch(cause){if(!active.current||current!==request.current)return;if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof Error?cause.message:'No se pudieron cargar los catálogos.');}
    finally{if(active.current&&current===request.current)setLoading(false);}
  },[token,invalidateSession]);
  function load(){setLoading(true);setError(null);return read();}
  useEffect(()=>{
    const current=++request.current;
    loadCatalogs(token).then(result=>{if(active.current&&current===request.current)setData(result);})
      .catch(cause=>{
        if(!active.current||current!==request.current)return;
        if(cause instanceof ApiError&&cause.status===401)void invalidateSession();
        else setError(cause instanceof Error?cause.message:'No se pudieron cargar los catálogos.');
      }).finally(()=>{if(active.current&&current===request.current)setLoading(false);});
  },[token,invalidateSession]);
  function clear(){setEditing(null);setName('');setPhone('');setDestination('');setCredit('');}
  function choose(next:CatalogKind){if(next===kind)return;requestChange(()=>{setKind(next);setDeleting(null);clear();setError(null);setNotice(null);});}
  function edit(item:Item){
    if(!active.current||writing.current||loading||pendingRef.current||deleting)return;
    if(item.id===editing?.id){setEditorFocus(current=>current+1);return;}
    requestChange(()=>{setEditing(item);setName(item.name);setPhone('phone'in item?item.phone??'':'');setDestination('destinationDepartment'in item?item.destinationDepartment??'':'');setCredit('creditLimitCents'in item&&item.creditLimitCents?String(Number(item.creditLimitCents)/100):'');setNotice(null);setEditorFocus(current=>current+1);});
  }
  async function save(){
    if(writing.current||loading||pendingRef.current||deleting||!data)return;
    const trimmed=name.trim();const max=kind==='providers'||kind==='buyers'?160:120;
    if(!trimmed||trimmed.length>max){setError(`El nombre debe tener entre 1 y ${max} caracteres.`);return;}
    if((kind==='qualities'||kind==='origins')&&trimmed.toLocaleLowerCase('es-PE')==='no informada'){setError('«No informada» se elige en la operación; no necesita un registro.');return;}
    if(kind==='buyers'&&credit.trim()&&moneyInputToCents(credit)===null){setError('Ingresa un límite de crédito válido, con un máximo de dos decimales.');return;}
    writing.current=true;setBusy(true);setError(null);setNotice(null);
    // PATCH must distinguish clearing a field from leaving it unchanged.
    const optionalPhone=editing?phone.trim():phone.trim()||undefined;
    const optionalDestination=editing?destination.trim():destination.trim()||undefined;
    const body=kind==='providers'?{name:trimmed,phone:optionalPhone}:kind==='buyers'?{name:trimmed,phone:optionalPhone,destinationDepartment:optionalDestination,creditLimitCents:credit.trim()?moneyInputToCents(credit):null}:{name:trimmed};
    try{
      if(editing)await updateCatalogItem(token,kind,editing.id,body);else await createCatalogItem(token,kind,body);
      if(!active.current)return;
      changed.current=true;
      clear();setNotice('Registro guardado en el servidor.');await load();
    }catch(cause){if(!active.current)return;if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof Error?cause.message:'No se pudo guardar.');}
    finally{if(active.current){writing.current=false;setBusy(false);}}
  }
  async function remove(){
    if(writing.current||!deleting)return;const selected=deleting;
    writing.current=true;setBusy(true);setError(null);setNotice(null);
    try{
      await deactivateCatalogItem(token,selected.kind,selected.item.id);
      if(!active.current)return;
      changed.current=true;
      setDeleting(null);clear();setNotice('Registro desactivado. Las operaciones anteriores se conservan.');await load();
    }catch(cause){if(!active.current)return;if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof Error?cause.message:'No se pudo desactivar.');}
    finally{if(active.current){writing.current=false;setBusy(false);}}
  }
  const locked=busy||loading||pending!==null||deleting!==null;const items:Item[]=data?.[kind]??[];
  const leave=()=>embedded?onClose?.(changed.current):backOrHome(router);
  // Spec 011 (RQ-ST02): the bottom bar leaves through the same unsaved-changes check.
  useBottomNav({
    back:embedded?null:{label:'Atrás',disabled:locked,onPress:()=>requestChange(leave,true)},
    home:embedded?null:{label:'Menú principal',disabled:locked,onPress:()=>requestChange(()=>router.replace('/home'),true)},
  });
  const content=<><AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.top}>{embedded?<AppButton disabled={locked} label='Volver al formulario' onPress={()=>requestChange(leave,false)} tone="secondary"/>:null}<AppButton disabled={locked} label="Actualizar" onPress={()=>void load()} tone="secondary"/></View>
    <ScreenHeader eyebrow={embedded?'DATOS DE LA OPERACIÓN':'CATÁLOGOS'} title={embedded?kinds.find(item=>item.id===kind)!.label:'Datos maestros'} description={embedded?'Registra o edita una opción y vuelve al formulario de la operación.':'Proveedores, compradores, variedades, calidades y procedencias del negocio.'}/>
    {!embedded?<View style={styles.tabs}>{kinds.map(option=><AppButton key={option.id} disabled={locked} label={option.label} accessibilityState={{selected:kind===option.id}} onPress={()=>choose(option.id)} tone={kind===option.id?'primary':'secondary'}/>)}</View>:null}
    {notice?<FeedbackState title="Operación confirmada" message={notice}/>:null}
    {error?<FeedbackState title="Revisa la operación" message={error} tone="error" actionLabel="Reintentar carga" onAction={()=>{if(!writing.current)void load();}}/>:null}
    {loading?<LoadingState label="Cargando catálogos"/>:null}
    {data?<>
      {kind==='qualities'||kind==='origins'?<Text style={styles.meta}>Define las opciones utilizadas por tu negocio. «No informada» se ofrece en las operaciones cuando no se conoce el dato. Desactivar conserva el historial.</Text>:null}
      <AppCard key={editorFocus} title={editing?'Editar registro':'Nuevo registro'}>
        <FormField autoFocus={editorFocus>0} editable={!locked} label="Nombre" onChangeText={setName} value={name}/>
        {kind==='providers'||kind==='buyers'?<FormField editable={!locked} keyboardType="phone-pad" label="Teléfono" onChangeText={setPhone} value={phone}/>:null}
        {kind==='buyers'?<><FormField editable={!locked} label="Departamento de destino" onChangeText={setDestination} value={destination}/><FormField editable={!locked} keyboardType="decimal-pad" label="Límite de crédito (S/)" onChangeText={setCredit} value={credit}/></>:null}
        <View style={styles.actions}>{editing?<AppButton disabled={locked} label="Cancelar edición" onPress={()=>requestChange(clear)} tone="secondary"/>:null}<AppButton disabled={locked} label={busy?'Guardando…':'Guardar'} onPress={()=>void save()}/></View>
      </AppCard>
      {!items.length&&!loading&&!error?<EmptyState title="Sin registros" message="Agrega el primer registro utilizando el formulario."/>:null}
      {items.map(item=><AppCard key={item.id} title={item.name} description={description(item)}><View style={styles.actions}><AppButton disabled={locked} label="Editar" accessibilityLabel={`Editar ${item.name}`} onPress={()=>edit(item)} tone="secondary"/><AppButton disabled={locked} label="Desactivar" accessibilityLabel={`Desactivar ${item.name}`} onPress={()=>requestChange(()=>{clear();setDeleting({kind,item});})} tone="secondary"/></View></AppCard>)}
    </>:null}
  </AppScreen><ConfirmationDialog busy={busy} confirmLabel="Descartar cambios" message={pending?.message??''} onCancel={cancelDiscard} onConfirm={confirmDiscard} title="¿Descartar cambios sin guardar?" visible={pending!==null}/><ConfirmationDialog busy={busy} confirmLabel="Desactivar" message={`«${deleting?.item.name??''}» dejará de estar disponible para nuevas operaciones, pero el historial se conservará.`} onCancel={()=>{if(!writing.current)setDeleting(null);}} onConfirm={()=>void remove()} title="¿Desactivar registro?" visible={Boolean(deleting)}/></>;
  return embedded?<Modal visible animationType="slide" onRequestClose={()=>requestChange(leave)}>{content}</Modal>:content;
}
function description(item:Item){
  if('destinationDepartment'in item)return `${item.phone??'Sin teléfono'} · ${item.destinationDepartment??'Sin destino'} · Límite ${item.creditLimitCents?formatMoney(item.creditLimitCents):'no definido'}`;
  if('phone'in item)return item.phone??'Sin teléfono';
  if('kind'in item)return item.kind==='quality'?'Calidad comercial activa':'Procedencia de la papa activa';
  return 'Variedad de papa activa';
}
const styles=StyleSheet.create({screen:{gap:spacing.xl},top:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,justifyContent:'space-between'},tabs:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},actions:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm,justifyContent:'flex-end'},meta:{color:color.textSecondary,...typography.bodySmall}});
