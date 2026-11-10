import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useNavigation, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';
import { Platform, useWindowDimensions } from 'react-native';
import { backOrHome } from '@/navigation/back-or-home';
import { readInitialPurchaseDraft, rememberInitialPurchaseDraft, clearInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';

import type { PotatoVariety, Provider, PurchaseSettlement, Reception, ReceptionSack, Vehicle } from '@/domain/reception/reception';
import { createOperationId, moneyInputToCents, summarizeSacks } from '@/domain/reception/reception';
import { formatKilograms, kilogramsDraft, validateSackWeights } from '@/domain/reception/whole-kilograms';
import { calculatePurchasePreview, emptyLotDraft, formatPreviewMoney, groupPurchaseLots, settlementLotsPayload, validateCreditSchedule } from '@/domain/reception/purchase-preview';
import { formatLocalDateInput } from '@/domain/shared/date';
import { hasUnresolvedReceptionWrites } from '@/domain/reception/reception-recovery';
import { recoverLocalReception } from '@/domain/reception/local-reception-recovery';
import { useSession } from '@/features/auth/session/session-provider';
import { useSyncQueue } from '@/features/sync/sync-queue-provider';
import { ReceptionDetailsScreen, type ReceptionDetails } from '@/features/reception/screens/reception-details-screen';
import { PurchaseConfirmationScreen } from '@/features/reception/screens/purchase-confirmation-screen';
import { SettlementScreen, type SettlementDraft } from '@/features/reception/screens/settlement-screen';
import { WeighingScreen } from '@/features/reception/screens/weighing-screen';
import { PurchaseSheet } from '@/features/reception/screens/purchase-sheet';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';
import {OperationReferenceActions} from '@/features/catalog/components/operation-reference-actions';
import {OperationReferenceEditor} from '@/features/catalog/screens/catalog-workspace';
import type {CatalogKind} from '@/services/api/catalog-api';
import {captureCommercialSnapshot,commercialDescription,type CommercialCharacteristic,type CommercialInput,type CommercialSnapshot} from '@/domain/catalog/commercial-characteristic';
import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import {




  getReception,
  getSacks,
  loadReceptionCatalogs,
  getPurchaseSettlement,
} from '@/services/api/reception-api';
import { AppScreen, ChoiceDialog, ConfirmationDialog, FeedbackState, LoadingState, type Choice } from '@/ui/components';

type Step = 'details' | 'weighing' | 'settlement' | 'confirmation';
type Dialog = 'provider' | 'vehicle' | 'varieties' | 'sack-variety' | null;

function initialDetails(): ReceptionDetails {
  return { date: formatLocalDateInput(), driverName: '', expectedVarieties: '', providerName: '', providerPhone: '', vehiclePlate: '' };
}
const initialSettlement: SettlementDraft = { advances: '0', discounts: '0', freightBasis: 'none', freightRate: '', freightChargedTo: 'provider', installments: [], paymentMode: 'cash', lots: {} };

export function PurchaseFlowScreen({ initialReceptionId }: { initialReceptionId?: string } = {}) {
  const router = useRouter();
  const navigation = useNavigation();
  const { invalidateSession, isOfflineSession, session } = useSession();
  const { enqueue, sendQueued, operations = [], isLoadingQueue = false, queueError } = useSyncQueue();
  const token = session?.accessToken ?? '';
  // Spec 011 (RQ-ST13): on the tablet the whole purchase is one screen, as in
  // Stitch; narrower screens and large text keep the step by step flow.
  const { fontScale, width } = useWindowDimensions();
  const sheet = width >= 1100 && fontScale <= 1.2;
  const [step, setStep] = useState<Step>('details');
  const [initialDraft] = useState(() => ({ baseline: initialDetails(), recovered: initialReceptionId ? null : readInitialPurchaseDraft(token) }));
  const [details, setDetails] = useState(initialDraft.recovered?.details ?? initialDraft.baseline);
  const originalDetails = initialDraft.baseline;
  const [detailsExitAction, setDetailsExitAction] = useState<(() => void) | null>(null);
  const [detailsDiscarded, setDetailsDiscarded] = useState(false);
  const [initialDetailsSaved, setInitialDetailsSaved] = useState(false);
  const detailsExitAllowed = useRef(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [catalogNotice,setCatalogNotice]=useState<string|undefined>();
  const [catalogLoaded,setCatalogLoaded]=useState(false);
  const [catalogAttempt,setCatalogAttempt]=useState(0);
  const [varieties, setVarieties] = useState<PotatoVariety[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [providerId, setProviderId] = useState(initialDraft.recovered?.providerId ?? '');
  const [vehicleId, setVehicleId] = useState(initialDraft.recovered?.vehicleId ?? '');
  const [expectedVarietyIds, setExpectedVarietyIds] = useState<string[]>(initialDraft.recovered?.expectedVarietyIds ?? []);
  const [reception, setReception] = useState<Reception | null>(null);
  const [sacks, setSacks] = useState<ReceptionSack[]>([]);
  const [qualities,setQualities]=useState<CommercialCharacteristic[]>([]);
  const [origins,setOrigins]=useState<CommercialCharacteristic[]>([]);
  const [qualityId,setQualityId]=useState<string|null>(null);
  const [originId,setOriginId]=useState<string|null>(null);
  const [captureBaseline,setCaptureBaseline]=useState<CommercialInput>({qualityId:null,originId:null});
  const [gross, setGross] = useState('');
  const [tare, setTare] = useState('0');
  const [sackVarietyId, setSackVarietyId] = useState('');
  const [editingSackId, setEditingSackId] = useState<string | null>(null);
  const [settlementDraft, setSettlementDraft] = useState(initialSettlement);
  const [settlement, setSettlement] = useState<PurchaseSettlement | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirmation, setConfirmation] = useState<'close' | 'settle' | null>(null);
  const [stageExitAction, setStageExitAction] = useState<(() => void) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const[referenceKind,setReferenceKind]=useState<CatalogKind|null>(null);
  const[referenceDirty,setReferenceDirty]=useState(false);const[referenceBusy,setReferenceBusy]=useState(false);
  const referenceWorking=useRef(false);const referenceRefresh=useRef(0);
  const referenceReloading=useRef(false);
  const [referenceReloadBusy,setReferenceReloadBusy]=useState(false);
  const [referenceReloadError,setReferenceReloadError]=useState<string|null>(null);
  useEffect(()=>()=>{referenceRefresh.current+=1;},[token]);
  function referenceState(dirty:boolean,working:boolean){referenceWorking.current=working;setReferenceDirty(dirty);setReferenceBusy(working);}
  function manageReference(kind:CatalogKind){if(session?.user.role!=='wholesaler'||isOfflineSession||busy||referenceKind||referenceReloading.current)return;setDialog(null);setReferenceKind(kind);}
  async function refreshReferenceOptions(){
    if(!session||referenceReloading.current)return;
    const request=++referenceRefresh.current;
    referenceReloading.current=true;setReferenceReloadBusy(true);setReferenceReloadError(null);
    try{const data=await loadReceptionCatalogs(token,session);if(request!==referenceRefresh.current)return;setProviders(data.providers);setVarieties(data.varieties);setVehicles(data.vehicles);setQualities(data.qualities??[]);setOrigins(data.origins??[]);setCatalogLoaded(true);setCatalogNotice(data.catalogNotice);}
    catch(cause){if(request===referenceRefresh.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setReferenceReloadError('El dato fue guardado, pero no se pudieron actualizar las opciones. Reintenta la carga antes de seleccionarlo.');}}
    finally{if(request===referenceRefresh.current){referenceReloading.current=false;setReferenceReloadBusy(false);}}
  }
  function closeReference(changed:boolean){
    setReferenceKind(null);referenceState(false,false);if(changed)void refreshReferenceOptions();
  }
  const referenceFeedback=referenceReloadBusy?<LoadingState label="Actualizando opciones de la operación"/>:referenceReloadError?<FeedbackState title="Dato guardado; opciones pendientes" message={referenceReloadError} tone="error" actionLabel="Reintentar opciones" onAction={()=>void refreshReferenceOptions()}/>:null;
  const referenceEditor=referenceKind?<OperationReferenceEditor kind={referenceKind} onClose={changed=>void closeReference(changed)} onEditingState={referenceState}/>:null;
  const referenceManage=session?.user.role==='wholesaler'?manageReference:undefined;
  const [loading, setLoading] = useState(true);

  const createOperationRef = useRef<string | null>(null);
  const sackOperationRef = useRef<string | null>(null);
  const closeOperationRef = useRef<string | null>(null);
  const settlementOperationRef = useRef<string | null>(null);
  const capturing=useRef(false);const pendingReceptionWrites=useRef(false);
  const settling=useRef(false);
  const [confirmedPurchase,setConfirmedPurchase]=useState(false);
  const [recoveryReady, setRecoveryReady] = useState(!initialReceptionId);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const localCreationId = initialReceptionId?.startsWith('local:') ? initialReceptionId.slice(6) : null;
  const localRecovery = useMemo(() => localCreationId ? recoverLocalReception(operations, localCreationId, !isOfflineSession) : null, [localCreationId, operations, isOfflineSession]);
  const detailsChanged = JSON.stringify(details) !== JSON.stringify(originalDetails) || Boolean(providerId || vehicleId || expectedVarietyIds.length);
  const protectDetailsExit = Boolean(session) && step === 'details' && !reception && !initialReceptionId && !detailsDiscarded && !initialDetailsSaved && (detailsChanged || busy || referenceDirty || referenceBusy);
  const weighingChanged = Boolean(qualityId!==captureBaseline.qualityId || originId!==captureBaseline.originId || gross.trim() || editingSackId || (tare.trim() && !/^0(?:[.,]0+)?$/.test(tare.trim())));
  const settlementChanged = JSON.stringify(settlementDraft) !== JSON.stringify(initialSettlement);
  const stageChanged = sheet && (step === 'weighing' || step === 'settlement')
    ? weighingChanged || settlementChanged
    : step === 'weighing' ? weighingChanged : step === 'settlement' && settlementChanged;
  const protectStageExit = Boolean(session) && (step === 'weighing' || step === 'settlement') && (stageChanged || busy || referenceDirty || referenceBusy);
  const protectExit = protectDetailsExit || protectStageExit;
  useEffect(() => {
    if (!token || initialReceptionId || step !== 'details' || reception || detailsExitAllowed.current || detailsDiscarded || initialDetailsSaved) return;
    if (detailsChanged) rememberInitialPurchaseDraft(token, { details, providerId, vehicleId, expectedVarietyIds });
    else clearInitialPurchaseDraft(token);
  }, [token, initialReceptionId, step, reception, detailsDiscarded, initialDetailsSaved, detailsChanged, details, providerId, vehicleId, expectedVarietyIds]);
  useBrowserTraversalGuard(protectExit,detailsExitAllowed,leave=>{
    if(busy||capturing.current||referenceWorking.current)return;
    if(protectDetailsExit&&!detailsExitAction)setDetailsExitAction(()=>leave);
    else if(protectStageExit&&!stageExitAction)setStageExitAction(()=>leave);
  },()=>setError('No se pudo completar la navegación. Inténtalo nuevamente.'));
  usePreventRemove(protectExit, ({ data }) => {
    if (detailsExitAllowed.current) { navigation.dispatch(data.action); return; }
    if (busy || capturing.current || referenceWorking.current) return;
    if(protectDetailsExit&&!detailsExitAction)setDetailsExitAction(() => () => navigation.dispatch(data.action));
    else if(protectStageExit&&!stageExitAction)setStageExitAction(() => () => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !protectExit || typeof window === 'undefined') return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (detailsExitAllowed.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [protectExit]);
  function requestDetailsExit() {
    if (busy || capturing.current || referenceWorking.current) return;
    const leave = () => backOrHome(router);
    if (detailsChanged||referenceDirty) setDetailsExitAction(() => leave);
    else leave();
  }
  function confirmDetailsExit() {
    if (busy || capturing.current || referenceWorking.current || !detailsExitAction) return;
    const leave = detailsExitAction;
    detailsExitAllowed.current = true;
    clearInitialPurchaseDraft(token);
    setDetailsDiscarded(true); setDetailsExitAction(null); leave();
  }
  const recoveryBlocked = Boolean(initialReceptionId && (queueError || (localRecovery ? localRecovery.kind === 'blocked' : hasUnresolvedReceptionWrites(operations, initialReceptionId))));

  useEffect(() => {
    if (!initialReceptionId || recoveryReady || isLoadingQueue || recoveryBlocked) return;
    let active = true;
    const centralId = localRecovery?.kind === 'central' ? localRecovery.receptionId : initialReceptionId;
    const read = localRecovery?.kind === 'open'
      ? Promise.resolve([localRecovery.reception, localRecovery.sacks] as const)
      : Promise.all([getReception(token, centralId), getSacks(token, centralId)]);
    read
      .then(([current, rows]) => {
        if (!active) return;
        if (!['draft', 'weighing', 'weighed'].includes(current.state)) {
          setRecoveryError('Esta recepción ya fue liquidada o anulada. Consulta su estado desde el historial.');
          return;
        }
        setReception(current);
        pendingReceptionWrites.current = localRecovery?.kind === 'open';
        setSacks(rows);
        setProviderId(current.providerId);
        setVehicleId(current.vehicleId ?? '');
        setExpectedVarietyIds(current.expectedVarieties.map((variety) => variety.id));
        setSackVarietyId(current.expectedVarieties[0]?.id ?? '');
        setDetails({ date: current.receivedOn, driverName: current.driverName, providerName: localRecovery?.kind === 'open' ? localRecovery.context.providerName : '', providerPhone: current.providerPhone ?? '', vehiclePlate: localRecovery?.kind === 'open' ? localRecovery.context.vehiclePlate : '', expectedVarieties: current.expectedVarieties.map((variety) => variety.name).join(', ') });
        setStep(current.state === 'weighed' ? 'settlement' : 'weighing');
        setRecoveryReady(true);
      })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
        else setRecoveryError(messageForError(cause));
      });
    return () => { active = false; };
  }, [initialReceptionId, invalidateSession, isLoadingQueue, localRecovery, recoveryAttempt, recoveryBlocked, recoveryReady, token]);

  useEffect(() => {
    if(!session)return;
    if (localCreationId && (isLoadingQueue || !localRecovery || localRecovery.kind === 'blocked')) return;
    let active = true;
    const catalogs = localRecovery?.kind === 'open'
      ? Promise.resolve({ providers: [{ id: localRecovery.reception.providerId, name: localRecovery.context.providerName, phone: localRecovery.reception.providerPhone }], varieties: localRecovery.context.varieties, qualities:localRecovery.context.qualities??[],origins:localRecovery.context.origins??[],catalogNotice:undefined, vehicles: localRecovery.reception.vehicleId ? [{ id: localRecovery.reception.vehicleId, plate: localRecovery.context.vehiclePlate, description: null }] : [] })
      : loadReceptionCatalogs(token,session);
    catalogs
      .then((catalogs) => { if (active) { setCatalogLoaded(true); setCatalogNotice(catalogs.catalogNotice); setProviders(catalogs.providers); setVarieties(catalogs.varieties); setVehicles(catalogs.vehicles);setQualities(catalogs.qualities??[]);setOrigins(catalogs.origins??[]); } })
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
        else setError(messageForError(cause));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [invalidateSession, isLoadingQueue, localCreationId, localRecovery, token, session, catalogAttempt]);

  const expectedVarieties = reception?.expectedVarieties ?? varieties.filter((item) => expectedVarietyIds.includes(item.id));
  const currentReception = reception;
  // On the sheet the active tab is the variety of the next sack.
  const captureVarietyId = sheet ? (expectedVarieties.some((item) => item.id === sackVarietyId) ? sackVarietyId : expectedVarieties[0]?.id ?? '') : sackVarietyId;
  const sackChoices = expectedVarieties.map(toChoice);
  const selectedSackVariety = expectedVarieties.find((item) => item.id === sackVarietyId);
  const activeSacks = useMemo(() => sacks.filter((sack) => !sack.voidedAt), [sacks]);
  const sackViews = activeSacks.map((sack) => ({
    id: sack.id,
    sequence: sack.sequence,
    varietyName: varieties.find((item) => item.id === sack.varietyId)?.name ?? expectedVarieties.find((item) => item.id === sack.varietyId)?.name ?? 'Variedad',
    weightDisplay: `${formatKilograms(sack.netWeightKg)} netos`,
    detailDisplay: `Bruto ${formatKilograms(sack.grossWeightKg)} · Tara ${formatKilograms(sack.tareKg)} · ${commercialDescription(sack)}`,
  }));
  const summary = useMemo(() => summarizeSacks(activeSacks), [activeSacks]);
  const purchaseLots = useMemo(() => groupPurchaseLots(activeSacks, (varietyId) => varieties.find((item) => item.id === varietyId)?.name ?? expectedVarieties.find((item) => item.id === varietyId)?.name ?? 'Variedad'), [activeSacks, varieties, expectedVarieties]);
  const settlementPreview = useMemo(() => calculatePurchasePreview(purchaseLots, settlementDraft), [purchaseLots, settlementDraft]);
  const settlementConfirmationMessage = settlementPreview.kind === 'ready'
    ? `Importes provisionales: ${settlementPreview.lots.length} ${settlementPreview.lots.length === 1 ? 'lote' : 'lotes'}, bruto ${formatPreviewMoney(settlementPreview.grossCents)}; ${settlementPreview.freightDeducted ? `flete descontado ${formatPreviewMoney(settlementPreview.freightCents)}` : settlementDraft.freightBasis === 'none' ? 'sin flete' : `flete a cargo del Mayorista ${formatPreviewMoney(settlementPreview.freightCents)}, no se descuenta`}; adelantos ${formatPreviewMoney(settlementPreview.advancesCents)}; descuentos ${formatPreviewMoney(settlementPreview.discountsCents)}. Total líquido ${formatPreviewMoney(settlementPreview.liquidCents)}. ${settlementDraft.paymentMode === 'cash' ? 'Pago al contado.' : `Crédito con ${settlementDraft.installments.length} ${settlementDraft.installments.length === 1 ? 'cuota' : 'cuotas'}.`} El servidor verificará los importes y registrará los efectos de compra, flete, caja o cuenta por pagar.`
    : 'Revisa los datos de la liquidación antes de confirmar.';
  const varietySummaries = expectedVarieties.map((variety) => ({ varietyId: variety.id, varietyName: variety.name, summary: summarizeSacks(activeSacks.filter((sack) => sack.varietyId === variety.id)) }));
  const displayContext = { username: session?.user?.username ?? '', providerName: details.providerName || providers.find((provider) => provider.id === providerId)?.name || 'Proveedor no disponible', providerPhone: reception?.providerPhone ?? details.providerPhone, receivedOn: reception?.receivedOn ?? details.date };
  const recoveryNotice = localRecovery?.kind === 'open' && recoveryReady ? 'La recepción y sus sacos se recuperaron del almacenamiento cifrado. Los cambios locales deben sincronizarse antes de confirmar efectos comerciales.' : undefined;

  function requestExit(destination: 'home' | 'history') {
    if (busy || capturing.current || referenceWorking.current || stageExitAction) return;
    const leave=()=>router.replace((destination === 'home' ? '/home' : '/purchase-history') as Href);
    if (stageChanged||referenceDirty) setStageExitAction(()=>leave);
    else leave();
  }
  function confirmStageExit() {
    if(busy||capturing.current||referenceWorking.current||!stageExitAction)return;
    const leave=stageExitAction;
    detailsExitAllowed.current=true;
    setStageExitAction(null);
    leave();
  }

  async function handleError(cause: unknown, reloadOnConflict = false) {
    if (cause instanceof ApiError && cause.status === 401) {
      await invalidateSession();
      return;
    }
    if (reloadOnConflict && cause instanceof ApiError && cause.status === 409 && reception) {
      try {
        const [freshReception, freshSacks] = await Promise.all([getReception(token, reception.id), getSacks(token, reception.id)]);
        setReception(freshReception);
        setSacks(freshSacks);
      } catch { /* The original conflict remains visible. */ }
    }
    setError(messageForError(cause));
  }

  async function submitDetails():Promise<Reception|null>{
    if(capturing.current || busy || detailsExitAction)return null;
    setError(null);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(details.date)||!providerId||!details.driverName.trim()||!expectedVarietyIds.length){setError('Completa fecha, proveedor, conductor y al menos una variedad.');return null;}
    capturing.current=true;setBusy(true);createOperationRef.current??=createOperationId();
    const operationId=createOperationRef.current;
    const payload={clientOperationId:operationId,driverName:details.driverName,expectedVarietyIds,providerId,providerPhone:details.providerPhone.trim()||undefined,receivedOn:details.date,vehicleId:vehicleId||undefined};
    let saved=false;
    try{
      await enqueue({body:payload,id:operationId,method:'POST',path:'/receptions',type:'reception.create',receptionContext:{providerName:details.providerName,vehiclePlate:details.vehiclePlate,varieties:expectedVarieties,qualities,origins}});
      clearInitialPurchaseDraft(token);
      setInitialDetailsSaved(true);
      saved=true;createOperationRef.current=null;
      const outcome=await sendQueued(operationId);
      if(outcome.status==='pending'){
        pendingReceptionWrites.current=true;
        const local:Reception={id:`local:${operationId}`,providerId,providerPhone:payload.providerPhone??null,vehicleId:vehicleId||null,driverName:details.driverName,receivedOn:details.date,state:'draft',version:0,expectedVarieties};
        setReception(local);setStep('weighing');return local;
      }
      if(outcome.status!=='confirmed'||!outcome.centralReference){router.replace('/sync-queue' as Href);return null;}
      const created=await getReception(token,outcome.centralReference);
      setReception(created);setStep('weighing');return created;
    }catch(cause){if(saved){router.replace('/sync-queue' as Href);return null;}await handleError(cause);return null}
    finally{capturing.current=false;setBusy(false)}
  }

  async function saveSack(target?:Reception){
    const reception=target??currentReception;
    const sackVarietyId=captureVarietyId;
    if(!reception||!sackVarietyId||capturing.current)return;
    setError(null);
    const weights=validateSackWeights(gross,tare);
    if(!weights.ok){setError(weights.message);return;}
    let characteristics:CommercialSnapshot;
    try{characteristics=captureCommercialSnapshot({qualityId,originId},qualities,origins,sacks.find(sack=>sack.id===editingSackId));}
    catch(cause){setError(cause instanceof Error?cause.message:'Revisa calidad y procedencia.');return;}
    capturing.current=true;setBusy(true);sackOperationRef.current??=createOperationId();
    const operationId=sackOperationRef.current;
    const input={clientOperationId:operationId,expectedReceptionVersion:reception.version,grossWeightKg:weights.value.grossWeightKg,tareKg:weights.value.tareKg,varietyId:sackVarietyId,qualityId,originId};
    const receptionReference=reception.id.startsWith('local:')?`@${reception.id.slice(6)}`:reception.id;
    const sackReference=editingSackId?.startsWith('local:')?`@${editingSackId.slice(6)}`:editingSackId;
    const path=editingSackId?`/receptions/${receptionReference}/sacks/${sackReference}`:`/receptions/${receptionReference}/sacks`;
    let saved=false;
    try{
      await enqueue({body:input,id:operationId,method:editingSackId?'PATCH':'POST',path,type:editingSackId?'reception.sack-correct':'reception.sack-add',sackCharacteristics:characteristics});
      saved=true;sackOperationRef.current=null;setCaptureBaseline({qualityId,originId});
      if(pendingReceptionWrites.current||reception.id.startsWith('local:')){applyLocalSack(operationId,reception,input,editingSackId,characteristics);return;}
      const outcome=await sendQueued(operationId);
      if(outcome.status==='pending'){pendingReceptionWrites.current=true;applyLocalSack(operationId,reception,input,editingSackId,characteristics);return;}
      if(outcome.status!=='confirmed'){router.replace('/sync-queue' as Href);return;}
      const [freshReception,freshSacks]=await Promise.all([getReception(token,reception.id),getSacks(token,reception.id)]);
      setReception(freshReception);setSacks(freshSacks);setGross('');setTare('0');setEditingSackId(null);
    }catch(cause){if(saved){router.replace('/sync-queue' as Href);return;}await handleError(cause)}
    finally{capturing.current=false;setBusy(false)}
  }
  function applyLocalSack(operationId:string,currentReception:Reception,input:CommercialInput&{grossWeightKg:string;tareKg?:string;varietyId:string},correctedId:string|null,characteristics:CommercialSnapshot){const original=sacks.find(x=>x.id===correctedId);const local={...characteristics,id:`local:${operationId}`,sequence:original?.sequence??Math.max(0,...sacks.map(sack=>sack.sequence))+1,varietyId:input.varietyId,grossWeightKg:Number(input.grossWeightKg).toFixed(3),tareKg:Number(input.tareKg??0).toFixed(3),netWeightKg:(Number(input.grossWeightKg)-Number(input.tareKg??0)).toFixed(3)};setSacks(current=>correctedId?current.map(x=>x.id===correctedId?local:x):[...current,local]);setReception({...currentReception,state:'weighing',version:currentReception.version+1});setGross('');setTare('0');setEditingSackId(null)}

  async function confirmClose():Promise<Reception|null>{
    if(!reception||capturing.current)return null;
    capturing.current=true;setConfirmation(null);setBusy(true);setError(null);closeOperationRef.current??=createOperationId();
    const operationId=closeOperationRef.current;const reference=reception.id.startsWith('local:')?`@${reception.id.slice(6)}`:reception.id;
    const payload={clientOperationId:operationId,expectedReceptionVersion:reception.version};
    let saved=false;
    try{
      await enqueue({body:payload,id:operationId,method:'POST',path:`/receptions/${reference}/close-weighing`,type:'reception.close'});
      saved=true;closeOperationRef.current=null;
      const closedLocally:Reception={...reception,state:'weighed',version:reception.version+1};
      if(pendingReceptionWrites.current||reception.id.startsWith('local:')){setReception(closedLocally);setStep('settlement');return closedLocally;}
      const outcome=await sendQueued(operationId);
      if(outcome.status==='pending'){pendingReceptionWrites.current=true;setReception(closedLocally);setStep('settlement');return closedLocally;}
      if(outcome.status!=='confirmed'){router.replace('/sync-queue' as Href);return null;}
      const closed=await getReception(token,reception.id);
      setReception(closed);setStep('settlement');return closed;
    }catch(cause){if(saved){router.replace('/sync-queue' as Href);return null;}await handleError(cause);return null}
    finally{capturing.current=false;setBusy(false)}
  }
  function requestSettlement() {
    if (busy || confirmedPurchase) return;
    setError(null);
    const preview = settlementPreview;
    if (preview.kind !== 'ready') { setError(preview.message); return; }
    if (settlementDraft.paymentMode === 'credit') {
      const scheduleError = validateCreditSchedule(settlementDraft.installments, preview.liquidCents);
      if (scheduleError) { setError(scheduleError); return; }
    }
    const unitPrice = Boolean(purchaseLots?.length && purchaseLots.every((lot) => (moneyInputToCents(settlementDraft.lots[lot.key]?.unitPrice ?? '') ?? 0) > 0));
    const freightRate = settlementDraft.freightBasis === 'none' ? 0 : moneyInputToCents(settlementDraft.freightRate);
    const advances = moneyInputToCents(settlementDraft.advances);
    const discounts = moneyInputToCents(settlementDraft.discounts);
    const installmentsValid = settlementDraft.paymentMode === 'cash' || (settlementDraft.installments.length > 0 && settlementDraft.installments.every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.dueOn) && (moneyInputToCents(item.amount) ?? 0) > 0));
    if (!unitPrice || freightRate === null || advances === null || discounts === null || !installmentsValid) {
      setError('Revisa los importes y, para crédito, registra cuotas con fecha e importe válidos.'); return;
    }
    setConfirmation('settle');
  }

  async function confirmSettlement(target?:Reception) {
    const reception=target??currentReception;
    if(!reception||settling.current||confirmedPurchase||!purchaseLots)return;
    settling.current=true;setConfirmation(null);setBusy(true);setError(null);
    settlementOperationRef.current??=createOperationId();
    const operationId=settlementOperationRef.current;
    const payload={
      advancesCents:moneyInputToCents(settlementDraft.advances)!,clientOperationId:operationId,
      discountsCents:moneyInputToCents(settlementDraft.discounts)!,expectedReceptionVersion:reception.version,
      ...(settlementDraft.freightBasis==='none'?{}:{freightBasis:settlementDraft.freightBasis,freightRateCents:moneyInputToCents(settlementDraft.freightRate)!,freightChargedTo:settlementDraft.freightChargedTo}),
      installments:settlementDraft.paymentMode==='cash'?[]:settlementDraft.installments.map(item=>({amountCents:moneyInputToCents(item.amount)!,dueOn:item.dueOn})),
      paymentMode:settlementDraft.paymentMode,lots:settlementLotsPayload(purchaseLots,settlementDraft.lots)
    };
    let saved=false;
    try{
      const reference=reception.id.startsWith('local:')?`@${reception.id.slice(6)}`:reception.id;
      await enqueue({body:payload,id:operationId,method:'POST',path:`/purchases/receptions/${reference}/settlement`,type:'purchase.settle'});
      saved=true;settlementOperationRef.current=null;
      if(pendingReceptionWrites.current||reception.id.startsWith('local:')){router.replace('/sync-queue' as Href);return;}
      const outcome=await sendQueued(operationId);
      if(outcome.status!=='confirmed'){router.replace('/sync-queue' as Href);return;}
      saved=false;setConfirmedPurchase(true);setStep('confirmation');
      setSettlement(await getPurchaseSettlement(token,reception.id));
    }catch(cause){
      if(saved){router.replace('/sync-queue' as Href);return;}
      await handleError(cause);
    }finally{settling.current=false;setBusy(false)}
  }
  async function reloadConfirmedPurchase(){
    if(!reception||!confirmedPurchase)return;
    setBusy(true);setError(null);
    try{setSettlement(await getPurchaseSettlement(token,reception.id))}
    catch(cause){await handleError(cause)}
    finally{setBusy(false)}
  }
  // Spec 011 (RQ-ST13): handlers of the single screen. The first sack creates
  // the reception with the data typed above; «Guardar compra» closes the
  // weighing and settles in that order, through the same queued operations.
  async function saveSheetSack(){
    if(busy||capturing.current)return;
    if(reception){await saveSack();return;}
    const weights=validateSackWeights(gross,tare);
    if(!weights.ok){setError(weights.message);return;}
    const created=await submitDetails();
    if(created)await saveSack(created);
  }
  function requestSheetSave(){
    if(gross.trim()||editingSackId){setError('Añade o cancela el peso que estás escribiendo antes de guardar la compra.');return;}
    requestSettlement();
  }
  async function confirmSheetSave(){
    if(!reception)return;
    if(reception.state==='weighed'){await confirmSettlement();return;}
    const closed=await confirmClose();
    if(closed)await confirmSettlement(closed);
  }
  function clearSheet(){
    if(reception||busy)return;
    clearInitialPurchaseDraft(token);
    setDetails(initialDetails());setProviderId('');setVehicleId('');setExpectedVarietyIds([]);setSackVarietyId('');
    setGross('');setTare('0');setQualityId(null);setOriginId(null);setSettlementDraft(initialSettlement);setError(null);
  }
  function editSack(id:string){
    const sack=sacks.find((item)=>item.id===id);if(!sack)return;
    setEditingSackId(sack.id);setGross(kilogramsDraft(sack.grossWeightKg));setTare(kilogramsDraft(sack.tareKg));setSackVarietyId(sack.varietyId);setQualityId(sack.qualityId??null);setOriginId(sack.originId??null);
  }

  function selectChoice(choice: Choice) {
    if (dialog === 'provider') {
      const selected = providers.find((item) => item.id === choice.id)!;
      setProviderId(selected.id); setDetails((current) => ({ ...current, providerName: selected.name, providerPhone: selected.phone ?? '' })); setDialog(null);
    } else if (dialog === 'vehicle') {
      const selected = vehicles.find((item) => item.id === choice.id)!;
      setVehicleId(selected.id); setDetails((current) => ({ ...current, vehiclePlate: selected.plate })); setDialog(null);
    } else if (dialog === 'varieties') {
      const next = expectedVarietyIds.includes(choice.id) ? expectedVarietyIds.filter((id) => id !== choice.id) : [...expectedVarietyIds, choice.id];
      setExpectedVarietyIds(next); setDetails((current) => ({ ...current, expectedVarieties: varieties.filter((item) => next.includes(item.id)).map((item) => item.name).join(', ') }));
    } else if (dialog === 'sack-variety') { setSackVarietyId(choice.id); setDialog(null); }
  }

  if (!session) return null;
  if (initialReceptionId && !recoveryReady && recoveryBlocked) return <AppScreen><FeedbackState title="Revisa la sincronización" message={queueError ?? (localRecovery?.kind === 'blocked' ? localRecovery.message : 'Hay operaciones de esta recepción sin resolver. Comprueba su resultado antes de continuar.')} actionLabel="Revisar sincronización" onAction={() => router.replace('/sync-queue' as Href)} /></AppScreen>;
  if (initialReceptionId && !recoveryReady && recoveryError) return <AppScreen><FeedbackState title="No se pudo recuperar la recepción" message={recoveryError} tone="error" actionLabel="Reintentar recuperación" onAction={() => { setRecoveryError(null); setRecoveryAttempt((attempt) => attempt + 1); }} /><FeedbackState title="Consultar historial" message="La recepción existente se conserva sin registrar otra." actionLabel="Volver al historial" onAction={() => router.replace('/purchase-history' as Href)} /></AppScreen>;
  if (initialReceptionId && !recoveryReady) return <AppScreen scrollable={false}><LoadingState label="Recuperando recepción y pesaje guardados" /></AppScreen>;
  if (loading) return <AppScreen contentContainerStyle={{ justifyContent: 'center' }} scrollable={false}><LoadingState label="Cargando proveedores, variedades y vehículos" /></AppScreen>;
  if(step==='details'&&!catalogLoaded)return <AppScreen><FeedbackState title="Catálogos no disponibles" message={error??'Consulta los catálogos antes de registrar una recepción.'} tone="error" actionLabel="Reintentar catálogos" onAction={()=>{setLoading(true);setError(null);setCatalogAttempt(value=>value+1);}}/></AppScreen>;
  if (sheet && (step === 'details' || step === 'weighing' || step === 'settlement')) {
    const started = Boolean(reception);
    const editing = sacks.find((sack) => sack.id === editingSackId);
    const leave = () => { if (step === 'details') requestDetailsExit(); else requestExit('home'); };
    return <>
      {referenceEditor}
      <PurchaseSheet
        notice={[started ? recoveryNotice : initialDraft.recovered ? 'Se conservaron tus datos durante esta sesión. La compra se registra al añadir el primer saco.' : undefined, catalogNotice].filter(Boolean).join(' ') || undefined}
        errorMessage={error ?? undefined} busy={busy} blocked={Boolean(detailsExitAction || stageExitAction || referenceKind)}
        details={started ? { ...details, providerName: displayContext.providerName, providerPhone: displayContext.providerPhone, date: displayContext.receivedOn } : details} detailsLocked={started}
        onChangeDetail={(field, value) => setDetails((current) => ({ ...current, [field]: value }))}
        onSelectProvider={() => setDialog('provider')} onSelectVehicle={() => setDialog('vehicle')}
        referenceActions={<>{referenceFeedback}<OperationReferenceActions compact kinds={['providers','varieties']} onManage={referenceManage} disabled={busy||isOfflineSession||Boolean(referenceKind)||referenceReloadBusy}/></>}
        varieties={expectedVarieties} activeVarietyId={captureVarietyId} onSelectVariety={setSackVarietyId}
        onAddVariety={started ? undefined : () => setDialog('varieties')}
        sacks={activeSacks.map((sack) => ({ id: sack.id, sequence: sack.sequence, varietyId: sack.varietyId, netDisplay: kilogramsDraft(sack.netWeightKg), detail: `Bruto ${formatKilograms(sack.grossWeightKg)}, tara ${formatKilograms(sack.tareKg)}. ${commercialDescription(sack)}` }))}
        weighingLocked={reception?.state === 'weighed'}
        gross={gross} tare={tare} onGrossChange={setGross} onTareChange={setTare}
        editingSequence={editing?.sequence ?? null} onEditSack={editSack} onCancelEdit={() => { setEditingSackId(null); setGross(''); setTare('0'); }}
        onSaveSack={() => void saveSheetSack()}
        characteristics={<CharacteristicFields appearance="stitch" value={{qualityId,originId}} qualities={qualities} origins={origins} disabled={busy} historical={editing} onChange={(field,id)=>{if(busy)return;if(field==='qualityId')setQualityId(id);else setOriginId(id);}}/>}
        lots={purchaseLots ?? []} values={settlementDraft} preview={settlementPreview}
        onChange={(field, value) => setSettlementDraft((current) => ({ ...current, [field]: value }))}
        onChangeLot={(key, field, value) => setSettlementDraft((current) => ({ ...current, lots: { ...current.lots, [key]: { ...(current.lots[key] ?? emptyLotDraft), [field]: value } } }))}
        onAddInstallment={() => setSettlementDraft((current) => ({ ...current, installments: [...current.installments, { amount: '', dueOn: '', id: createOperationId() }] }))}
        onChangeInstallment={(id, field, value) => setSettlementDraft((current) => ({ ...current, installments: current.installments.map((item) => item.id === id ? { ...item, [field]: value } : item) }))}
        onRemoveInstallment={(id) => setSettlementDraft((current) => ({ ...current, installments: current.installments.filter((item) => item.id !== id) }))}
        onClear={started ? undefined : clearSheet} onSave={requestSheetSave} onBack={leave} onGoHome={leave}
      />
      <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar la recepción" title="¿Salir de los datos de compra?" message="Los datos en edición todavía no se han guardado como recepción. Si sales, tendrás que ingresarlos nuevamente." visible={Boolean(detailsExitAction)} onCancel={() => setDetailsExitAction(null)} onConfirm={confirmDetailsExit} />
      <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar estos datos" title="¿Salir de la compra?" message="El peso, los precios, las deducciones y las cuotas en edición todavía no se han guardado. Los sacos ya registrados se conservan en la recepción." visible={stageExitAction !== null} onCancel={() => setStageExitAction(null)} onConfirm={confirmStageExit} />
      <ConfirmationDialog busy={busy} confirmLabel="Guardar compra" message={`${reception?.state === 'weighed' ? '' : 'Se cerrará el pesaje: después, cualquier corrección requiere autorización del Mayorista. '}${settlementConfirmationMessage}`} onCancel={() => setConfirmation(null)} onConfirm={() => void confirmSheetSave()} title="¿Guardar la compra?" visible={confirmation === 'settle'} />
      <ChoiceDialog choices={dialog === 'provider' ? providers.map(toChoice) : dialog === 'vehicle' ? vehicles.map((item) => ({ id: item.id, label: item.plate, supportingText: item.description ?? undefined })) : varieties.map(toChoice)} multiple={dialog === 'varieties'} onClose={() => setDialog(null)} onSelect={selectChoice} selectedIds={dialog === 'varieties' ? expectedVarietyIds : [providerId, vehicleId]} title={dialog === 'provider' ? 'Seleccionar proveedor' : dialog === 'vehicle' ? 'Seleccionar vehículo' : 'Seleccionar variedades'} visible={dialog === 'provider' || dialog === 'vehicle' || dialog === 'varieties'} />
    </>;
  }
  if (step === 'details') return <>
    {referenceEditor}
    <ReceptionDetailsScreen referenceFeedback={referenceFeedback} referenceActions={<OperationReferenceActions kinds={['providers','varieties']} onManage={referenceManage} disabled={busy||isOfflineSession||Boolean(referenceKind)||referenceReloadBusy}/>} recoveryNotice={initialDraft.recovered ? "Se conservaron tus datos durante esta sesión. Todavía no hay una recepción guardada; continuar los registrará en la cola. Esta copia se pierde al cerrar o recargar la aplicación." : undefined} notice={catalogNotice} errorMessage={error ?? undefined} isSubmitting={busy} isInteractionBlocked={Boolean(detailsExitAction||referenceKind)} onBack={requestDetailsExit} onChange={(field, value) => setDetails((current) => ({ ...current, [field]: value }))} onContinue={() => void submitDetails()} onSelectProvider={() => setDialog('provider')} onSelectVarieties={() => setDialog('varieties')} onSelectVehicle={() => setDialog('vehicle')} values={details} />
    <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar la recepción" title="¿Salir de los datos de compra?" message="Los datos iniciales en edición todavía no se han guardado como recepción. Si sales, tendrás que ingresarlos nuevamente." visible={Boolean(detailsExitAction)} onCancel={() => setDetailsExitAction(null)} onConfirm={confirmDetailsExit} />
    <ChoiceDialog choices={dialog === 'provider' ? providers.map(toChoice) : dialog === 'vehicle' ? vehicles.map((item) => ({ id: item.id, label: item.plate, supportingText: item.description ?? undefined })) : varieties.map(toChoice)} multiple={dialog === 'varieties'} onClose={() => setDialog(null)} onSelect={selectChoice} selectedIds={dialog === 'varieties' ? expectedVarietyIds : [providerId, vehicleId]} title={dialog === 'provider' ? 'Seleccionar proveedor' : dialog === 'vehicle' ? 'Seleccionar vehículo' : 'Seleccionar variedades'} visible={dialog !== null} />
  </>;
  if (step === 'weighing') return <>
    {referenceEditor}
    <WeighingScreen characteristics={<>{referenceFeedback}<OperationReferenceActions kinds={['qualities','origins']} onManage={referenceManage} disabled={busy||isOfflineSession||Boolean(referenceKind)||referenceReloadBusy}/><CharacteristicFields value={{qualityId,originId}} qualities={qualities} origins={origins} disabled={busy} historical={sacks.find(sack=>sack.id===editingSackId)} onChange={(field,id)=>{if(busy)return;if(field==='qualityId')setQualityId(id);else setOriginId(id);}}/></>} displayContext={displayContext} varietySummaries={varietySummaries} onGoHome={() => requestExit('home')} onGoHistory={() => requestExit('history')} notice={[recoveryNotice,catalogNotice].filter(Boolean).join(' ')||undefined} currentGrossWeight={gross} currentTare={tare} entries={sackViews} errorMessage={error ?? undefined} isSubmitting={busy} onAddSack={() => void saveSack()} onContinue={() => setConfirmation('close')} onEditEntry={(entry) => { const sack = sacks.find((item) => item.id === entry.id); if (!sack) return; setEditingSackId(sack.id); setGross(kilogramsDraft(sack.grossWeightKg)); setTare(kilogramsDraft(sack.tareKg)); setSackVarietyId(sack.varietyId);setQualityId(sack.qualityId??null);setOriginId(sack.originId??null); }} onGrossWeightChange={setGross} onSelectVariety={() => setDialog('sack-variety')} onTareChange={setTare} selectedVariety={selectedSackVariety?.name} summary={summary} />
    <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar este peso" title="¿Salir del pesaje?" message="El peso o las características en edición todavía no se han guardado. Los sacos ya registrados se conservan en la recepción." visible={stageExitAction !== null} onCancel={() => setStageExitAction(null)} onConfirm={confirmStageExit} />
    <ChoiceDialog choices={sackChoices} onClose={() => setDialog(null)} onSelect={selectChoice} selectedIds={[sackVarietyId]} title="Seleccionar variedad" visible={dialog === 'sack-variety'} />
    <ConfirmationDialog busy={busy} confirmLabel="Cerrar pesaje" message="Después del cierre, el detalle queda bloqueado y cualquier corrección posterior requiere autorización del Mayorista." onCancel={() => setConfirmation(null)} onConfirm={() => void confirmClose()} title="¿Cerrar el pesaje?" visible={confirmation === 'close'} />
  </>;
  if (step === 'settlement') return <>
    <SettlementScreen displayContext={displayContext} sacks={activeSacks} lots={purchaseLots ?? []} preview={settlementPreview} onChangeLot={(key, field, value) => setSettlementDraft((current) => ({ ...current, lots: { ...current.lots, [key]: { ...(current.lots[key] ?? emptyLotDraft), [field]: value } } }))} sackEntries={sackViews} onGoHome={() => requestExit('home')} onGoHistory={() => requestExit('history')} notice={[recoveryNotice,catalogNotice].filter(Boolean).join(' ')||undefined} errorMessage={error ?? undefined} isSubmitting={busy} onAddInstallment={() => setSettlementDraft((current) => ({ ...current, installments: [...current.installments, { amount: '', dueOn: '', id: createOperationId() }] }))} onChange={(field, value) => setSettlementDraft((current) => ({ ...current, [field]: value }))} onChangeInstallment={(id, field, value) => setSettlementDraft((current) => ({ ...current, installments: current.installments.map((item) => item.id === id ? { ...item, [field]: value } : item) }))} onRemoveInstallment={(id) => setSettlementDraft((current) => ({ ...current, installments: current.installments.filter((item) => item.id !== id) }))} onSubmit={requestSettlement} values={settlementDraft} />
    <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar estos datos" title="¿Salir de la liquidación?" message="Los precios, deducciones y cuotas en edición todavía no se han confirmado. El pesaje cerrado y sus sacos se conservan." visible={stageExitAction !== null} onCancel={() => setStageExitAction(null)} onConfirm={confirmStageExit} />
    <ConfirmationDialog busy={busy} confirmLabel="Liquidar compra" message={settlementConfirmationMessage} onCancel={() => setConfirmation(null)} onConfirm={() => void confirmSettlement()} title="¿Confirmar la liquidación?" visible={confirmation === 'settle'} />
  </>;
  if(confirmedPurchase&&!settlement)return <AppScreen><FeedbackState title="Compra confirmada" message="La liquidación fue confirmada por el servidor. Falta cargar su detalle." tone="success"/>{error?<FeedbackState title="No se pudo cargar el detalle" message={error} tone="error"/>:null}<FeedbackState title="Consultar liquidación" message={busy?'Cargando el detalle confirmado…':'Reintenta la consulta sin registrar otra compra.'} actionLabel={busy?undefined:'Reintentar consulta de liquidación'} onAction={busy?undefined:()=>void reloadConfirmedPurchase()}/></AppScreen>;
  if (settlement) return <PurchaseConfirmationScreen providerName={displayContext.providerName} onNew={() => router.replace({ pathname: '/purchase-flow', params: { nueva: String(Date.now()) } } as Href)} settlement={settlement} />;
  return <AppScreen><FeedbackState title="No se pudo mostrar la operación" message="Vuelve al menú e inténtalo nuevamente." actionLabel="Volver al menú" onAction={() => router.replace('/home' as Href)} tone="error" /></AppScreen>;
}

function toChoice(item: Provider | PotatoVariety): Choice { return { id: item.id, label: item.name, ...('phone' in item && item.phone ? { supportingText: item.phone } : {}) }; }

function messageForError(error: unknown) {
  if (error instanceof ApiUnavailableError) return 'No se pudo conectar con el servidor. Revisa la conexión e intenta nuevamente.';
  if (error instanceof ApiError) {
    if (error.status === 409) return `${error.message} Se recargó la versión vigente.`;
    return error.message;
  }
  return error instanceof Error ? error.message : 'La operación no pudo completarse.';
}
