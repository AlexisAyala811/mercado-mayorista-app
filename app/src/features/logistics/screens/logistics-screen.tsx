import { usePreventRemove } from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';
import { ApiError } from '@/services/api/api-client';
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, useWindowDimensions, Platform } from "react-native";
import { useRouter,useNavigation } from "expo-router";

import { useSession } from "@/features/auth/session/session-provider";
import {
  createCarrier,
  createVehicle,
  deactivateCarrier,
  deactivateVehicle,
  listCarriers,
  listVehicles,
  updateCarrier,
  updateVehicle,
  type Carrier,
  type LogisticsVehicle,
} from "@/services/api/operations-api";
import {
  AppButton,
  AppCard,
  AppScreen,
  ChoiceDialog,
  ConfirmationDialog,
  FeedbackState,
  FormField,
  LoadingState,
  ScreenHeader,
  SelectionField,
  type Choice,
} from "@/ui/components";
import { spacing } from "@/ui/tokens";
import { backOrHome } from "@/navigation/back-or-home";
import { useBottomNav } from "@/ui/navigation/app-chrome";
import { ReferenceLogisticsScreen } from './reference-logistics-screen';
import { MenuVisualTheme } from '@/ui/visual-theme';

type Removal =
  | { kind: "carrier"; value: Carrier }
  | { kind: "vehicle"; value: LogisticsVehicle }
  | null;

export function LogisticsScreen() {
  const {session}=useSession();
  return session?<MenuVisualTheme><LogisticsWorkspace key={session.accessToken}/></MenuVisualTheme>:null;
}
function LogisticsWorkspace() {
  const router = useRouter();
  const navigation=useNavigation();
  const exitAllowed=useRef(false);
  const [discarded,setDiscarded]=useState(false);
  const [exitAction,setExitAction]=useState<(()=>void)|null>(null);
  const { session,invalidateSession } = useSession();
  const {width}=useWindowDimensions();
  const active=useRef(true);const generation=useRef(0);const working=useRef(false);
  const token = session?.accessToken ?? "";
  const [carriers, setCarriers] = useState<Carrier[]>([]);
  const [vehicles, setVehicles] = useState<LogisticsVehicle[]>([]);
  const [search, setSearch] = useState("");
  const [editorFocus,setEditorFocus]=useState<{target:'carrier'|'vehicle';request:number}>({target:'carrier',request:0});
  const [newPrompt,setNewPrompt]=useState(false);
  const [editingCarrier, setEditingCarrier] = useState<Carrier | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<LogisticsVehicle | null>(
    null,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [plate, setPlate] = useState("");
  const [description, setDescription] = useState("");
  const [carrierId, setCarrierId] = useState("");
  const [dialog, setDialog] = useState(false);
  const [replacement,setReplacement]=useState<Removal>(null);
  const [removal, setRemoval] = useState<Removal>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice,setNotice]=useState<string|null>(null);
  const [feedbackLocation,setFeedbackLocation]=useState<'main'|'editor'>('main');
  const [catalogError,setCatalogError]=useState<string|null>(null);
  const canEdit = session?.user.role === "wholesaler";

  const carrierDirty=name!==(editingCarrier?.name??'') || phone!==(editingCarrier?.phone??'');
  const vehicleDirty=plate!==(editingVehicle?.plate??'') || description!==(editingVehicle?.description??'') || carrierId!==(editingVehicle?.carrierId??'');
  const hasUnsavedChanges=carrierDirty||vehicleDirty;
  const protectExit=Boolean(session)&&!discarded&&(hasUnsavedChanges||busy);
  const interactionsBlocked=busy||exitAction!==null||replacement!==null||newPrompt||removal!==null;
  useBrowserTraversalGuard(protectExit,exitAllowed,leave=>{
    if(active.current&&!working.current&&!exitAction&&!replacement&&!newPrompt&&!removal)setExitAction(()=>leave);
  },()=>{if(active.current)setError('No se pudo completar la navegación. Inténtalo nuevamente.');});
  usePreventRemove(protectExit,({data})=>{
    if(exitAllowed.current){navigation.dispatch(data.action);return;}
    if(working.current||replacement||newPrompt||removal)return;
    setExitAction(()=>()=>navigation.dispatch(data.action));
  });
  useEffect(()=>{
    if(Platform.OS!=='web'||!protectExit||typeof window==='undefined')return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(exitAllowed.current)return;event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[protectExit]);
  function requestExit(destination:'back'|'home'='back'){
    if(interactionsBlocked)return;
    const leave=()=>destination==='home'?router.replace('/home'):backOrHome(router);
    if(protectExit)setExitAction(()=>leave);else leave();
  }
  // Spec 011 (RQ-ST02): the bottom bar leaves through the same unsaved-changes check.
  useBottomNav({
    back:{label:'Atrás',disabled:interactionsBlocked,onPress:()=>requestExit()},
    home:{label:'Menú principal',disabled:interactionsBlocked,onPress:()=>requestExit('home')},
  });
  function confirmExit(){
    if(working.current||!exitAction)return;
    const leave=exitAction;exitAllowed.current=true;setDiscarded(true);setExitAction(null);leave();
  }

  async function load() {
    const request=++generation.current;
    try {
      const [c,v]=await Promise.all([listCarriers(token),listVehicles(token)]);
      if(active.current&&request===generation.current){setCarriers(c.items);setVehicles(v.items);}
    }catch(cause){
      if(active.current&&request===generation.current){
        if(cause instanceof ApiError&&cause.status===401){setCatalogError('La sesión venció. Inicia sesión nuevamente.');void invalidateSession();}
        else setCatalogError(cause instanceof Error?cause.message:'No se pudo cargar logística.');
      }
    }finally{if(active.current&&request===generation.current)setLoading(false);}
  }
  function refresh(){setLoading(true);setCatalogError(null);void load();}
  useEffect(()=>{
    active.current=true;void Promise.resolve().then(()=>{if(active.current)void load();});
    return()=>{active.current=false;};
    // The workspace is remounted for each access token; initial loading belongs to that session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  function clearCarrier() {
    setEditingCarrier(null);
    setName("");
    setPhone("");
  }
  function clearVehicle() {
    setEditingVehicle(null);
    setPlate("");
    setDescription("");
    setCarrierId("");
  }
  function focusEditor(target:'carrier'|'vehicle'){setEditorFocus(current=>({target,request:current.request+1}));}
  function prepareNew(){clearCarrier();clearVehicle();setError(null);setNotice(null);setNewPrompt(false);focusEditor('carrier');}
  function requestNew(){if(interactionsBlocked||loading||!canEdit)return;if(hasUnsavedChanges)setNewPrompt(true);else prepareNew();}
  function confirmNew(){if(working.current||!newPrompt)return;prepareNew();}

  function editCarrier(value: Carrier) {
    focusEditor('carrier');
    setEditingCarrier(value);
    setName(value.name);
    setPhone(value.phone ?? "");
  }
  function editVehicle(value: LogisticsVehicle) {
    focusEditor('vehicle');
    setEditingVehicle(value);
    setPlate(value.plate);
    setDescription(value.description ?? "");
    setCarrierId(value.carrierId ?? "");
  }

  function requestCarrierEdit(value:Carrier){
    if(interactionsBlocked)return;
    if(carrierDirty){if(editingCarrier?.id!==value.id)setReplacement({kind:'carrier',value});else focusEditor('carrier');return;}
    editCarrier(value);
  }
  function requestVehicleEdit(value:LogisticsVehicle){
    if(interactionsBlocked)return;
    if(vehicleDirty){if(editingVehicle?.id!==value.id)setReplacement({kind:'vehicle',value});else focusEditor('vehicle');return;}
    editVehicle(value);
  }
  function confirmReplacement(){
    if(working.current||!replacement)return;
    const pending=replacement;setReplacement(null);
    if(pending.kind==='carrier')editCarrier(pending.value);else editVehicle(pending.value);
  }

  async function saveCarrier() {
    if(interactionsBlocked||!canEdit)return;setFeedbackLocation('editor');
    if (!name.trim()) {
      setError("Ingresa el nombre del transportista.");
      return;
    }
    await execute(async () => {
      if (editingCarrier)
        await updateCarrier(token, editingCarrier.id, {
          name: name.trim(),
          phone,
        });
      else
        await createCarrier(token, {
          name: name.trim(),
          phone: phone || undefined,
        });
      if(active.current)clearCarrier();
    });
  }
  async function saveVehicle() {
    if(interactionsBlocked||!canEdit)return;setFeedbackLocation('editor');
    if (!plate.trim()) {
      setError("Ingresa la placa.");
      return;
    }
    await execute(async () => {
      const body = {
        plate: plate.trim(),
        carrierId: carrierId || null,
        description,
      };
      if (editingVehicle) await updateVehicle(token, editingVehicle.id, body);
      else
        await createVehicle(token, {
          ...body,
          carrierId: body.carrierId ?? undefined,
        });
      if(active.current)clearVehicle();
    });
  }
  async function remove() {
    if (!removal) return;
    const current = removal;
    setFeedbackLocation('main');
    const saved=await execute(async () => {
      if (current.kind === "carrier") await deactivateCarrier(token,current.value.id);
      else await deactivateVehicle(token,current.value.id);
    },'Registro desactivado. El historial se conserva.');
    if(saved&&active.current){
      if(current.kind==='carrier'&&editingCarrier?.id===current.value.id)clearCarrier();
      if(current.kind==='vehicle'&&editingVehicle?.id===current.value.id)clearVehicle();
      setRemoval(null);
    }
  }
  async function execute(action: () => Promise<void>,successMessage="Registro guardado en el servidor."):Promise<boolean> {
    if(working.current||exitAction!==null||replacement!==null||newPrompt)return false;working.current=true;
    setBusy(true);
    setError(null);setNotice(null);
    try {
      await action();
      if(active.current){setNotice(successMessage);setLoading(true);setCatalogError(null);await load();}
      return true;
    } catch (requestError) {
      if(!active.current)return false;
      if(requestError instanceof ApiError&&requestError.status===401){void invalidateSession();return false;}
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No se pudo completar la operación.",
      );
      return false;
    } finally {
      working.current=false;if(active.current)setBusy(false);
    }
  }

  if (!session) return null;
  if (loading && !carriers.length && !vehicles.length)
    return (
      <AppScreen contentContainerStyle={styles.center} scrollable={false}>
        <LoadingState label="Cargando logística" />
      </AppScreen>
    );
  const selected = carriers.find((item) => item.id === carrierId);

  const editor=canEdit?<>
    <ScreenHeader level="section" eyebrow="LOGÍSTICA" title="Registro de logística" description="Edita los datos del transportista y del vehículo por separado."/>
        <View style={styles.top}>
          <AppButton
            disabled={interactionsBlocked||loading}
            label={loading?"Actualizando…":"Actualizar"}
            onPress={refresh}
            tone="secondary"
          />
        </View>

    {feedbackLocation==='editor'&&notice?<FeedbackState title="Operación confirmada" message={notice} tone="success"/>:null}
    {feedbackLocation==='editor'&&error?<FeedbackState title="Revisa la operación" message={error} tone="error"/>:null}
        {canEdit && !catalogError ? (
          <View key={editorFocus.request} style={[styles.columns,width<760&&styles.columnsPhone]}>
            <AppCard
              style={width>=760?styles.column:styles.columnPhone}
              title={
                editingCarrier ? "Editar transportista" : "Nuevo transportista"
              }
            >
              <FormField autoFocus={editorFocus.request>0&&editorFocus.target==='carrier'} editable={!interactionsBlocked} label="Nombre" onChangeText={setName} value={name} />
              <FormField
                keyboardType="phone-pad"
                editable={!interactionsBlocked}
                label="Teléfono"
                onChangeText={setPhone}
                value={phone}
              />
              <View style={styles.actions}>
                {editingCarrier ? <AppButton disabled={interactionsBlocked} label="Desactivar transportista" onPress={()=>setRemoval({kind:'carrier',value:editingCarrier})} tone="secondary"/> : null}
                {editingCarrier ? (
                  <AppButton
                    disabled={interactionsBlocked}
                    label="Cancelar"
                    onPress={clearCarrier}
                    tone="secondary"
                  />
                ) : null}
                <AppButton
                  disabled={interactionsBlocked}
                  label={
                    editingCarrier
                      ? "Guardar cambios"
                      : "Registrar transportista"
                  }
                  onPress={() => void saveCarrier()}
                />
              </View>
            </AppCard>
            <AppCard
              style={width>=760?styles.column:styles.columnPhone}
              title={editingVehicle ? "Editar vehículo" : "Nuevo vehículo"}
            >
              <FormField
                autoCapitalize="characters"
                editable={!interactionsBlocked}
                autoFocus={editorFocus.request>0&&editorFocus.target==='vehicle'}
                label="Placa"
                onChangeText={setPlate}
                value={plate}
              />
              <SelectionField
                disabled={interactionsBlocked}
                label="Transportista"
                onPress={() => setDialog(true)}
                placeholder="Sin transportista"
                value={selected?.name??(carrierId?`${editingVehicle?.carrier?.name??'Transportista'} (no disponible)`:undefined)}
              />
              <FormField
                editable={!interactionsBlocked}
                label="Descripción"
                onChangeText={setDescription}
                value={description}
              />
              <View style={styles.actions}>
                {editingVehicle ? (
                  <AppButton
                    disabled={interactionsBlocked}
                    label="Cancelar"
                    onPress={clearVehicle}
                    tone="secondary"
                  />
                ) : null}
                <AppButton
                  disabled={interactionsBlocked}
                  label={
                    editingVehicle ? "Guardar cambios" : "Registrar vehículo"
                  }
                  onPress={() => void saveVehicle()}
                />
              </View>
            </AppCard>
          </View>
        ) : null}
  </>:null;
  return (
    <>
      <ReferenceLogisticsScreen carriers={carriers} vehicles={vehicles} search={search} onSearchChange={setSearch} canEdit={canEdit} blocked={interactionsBlocked} loading={loading} unavailable={Boolean(catalogError)} editor={editor} onNew={requestNew} onRefresh={refresh} onEditCarrier={requestCarrierEdit} onEditVehicle={requestVehicleEdit} onDeactivateCarrier={value=>{setError(null);setRemoval({kind:'carrier',value});}} onDeactivateVehicle={value=>{setError(null);setRemoval({kind:'vehicle',value});}} feedback={catalogError||loading||(feedbackLocation==='main'&&(notice||(error&&!removal)))?<>
        {catalogError?<FeedbackState title="Logística no disponible" message={catalogError} tone="error" actionLabel="Reintentar logística" onAction={refresh}/>:null}
        {loading?<LoadingState label="Actualizando logística"/>:null}
        {feedbackLocation==='main'&&notice?<FeedbackState title="Operación confirmada" message={notice} tone="success"/>:null}
        {feedbackLocation==='main'&&error&&!removal?<FeedbackState title="Revisa la operación" message={error} tone="error"/>:null}
      </>:null}/>
      <ConfirmationDialog busy={busy} confirmLabel="Descartar borradores y registrar nuevo" title="¿Abrir un registro nuevo?" message="Los cambios de ambos formularios todavía no se han guardado. Se descartarán para iniciar otro registro." visible={newPrompt} onCancel={()=>setNewPrompt(false)} onConfirm={confirmNew}/>
      <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar" title="¿Salir de logística?" message="Los cambios de transportista y vehículo todavía no se han guardado. Si sales, perderás los datos en edición." visible={exitAction!==null} onCancel={()=>setExitAction(null)} onConfirm={confirmExit}/>
      <ConfirmationDialog busy={busy} confirmLabel="Descartar edición y abrir registro" title="¿Reemplazar la edición?" message={replacement?`Los cambios de ${replacement.kind==='carrier'?'transportista':'vehículo'} no se guardaron. Se descartarán al abrir ${replacement.kind==='carrier'?replacement.value.name:replacement.value.plate}. El otro formulario se conservará.`:''} visible={replacement!==null} onCancel={()=>setReplacement(null)} onConfirm={confirmReplacement}/>
      <ChoiceDialog
        choices={[
          { id: "", label: "Sin transportista" },
          ...carriers.map((item) => ({
            id: item.id,
            label: item.name,
            supportingText: item.phone ?? undefined,
          })),
        ]}
        onClose={() => setDialog(false)}
        onSelect={(choice: Choice) => {
          setCarrierId(choice.id);
          setDialog(false);
        }}
        selectedIds={[carrierId]}
        title="Seleccionar transportista"
        visible={dialog}
      />
      <ConfirmationDialog
        busy={busy}
        confirmLabel="Desactivar"
        message={error?`No se pudo desactivar: ${error}`:'El registro dejará de aparecer en nuevas operaciones y su historial se conservará.'}
        onCancel={() => setRemoval(null)}
        onConfirm={() => void remove()}
        title="¿Desactivar registro?"
        visible={Boolean(removal)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center" },
  top: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  column: { flexBasis: 360, flexGrow: 1 },
  columnsPhone: { flexDirection: "column" },
  columnPhone: { width: "100%" },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end" },
});
