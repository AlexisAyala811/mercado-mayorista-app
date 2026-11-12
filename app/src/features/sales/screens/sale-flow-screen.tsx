import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';

import { createOperationId, formatMoney, moneyInputToCents, type PotatoVariety, type Vehicle } from '@/domain/reception/reception';
import { calculateSalePreview } from '@/domain/sales/sale-preview';
import { validateCreditSchedule } from '@/domain/reception/purchase-preview';
import { validateSaleLine, withSlots, type Buyer, type Sale, type SaleLineDraft } from '@/domain/sales/sale';
import { SaleSheet } from '@/features/sales/screens/sale-sheet';
import { LotDialog, type NewLot } from '@/features/sales/components/lot-dialog';
import { formatLocalDateInput } from '@/domain/shared/date';
import { useSession } from '@/features/auth/session/session-provider';
import { useSyncQueue } from '@/features/sync/sync-queue-provider';
import type { InstallmentDraft } from '@/features/reception/screens/settlement-screen';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';
import {OperationReferenceActions} from '@/features/catalog/components/operation-reference-actions';
import {OperationReferenceEditor} from '@/features/catalog/screens/catalog-workspace';
import {createCatalogItem,updateCatalogItem,type CatalogKind} from '@/services/api/catalog-api';
import {captureCommercialSnapshot,commercialDescription,commercialLineKey,type CommercialCharacteristic} from '@/domain/catalog/commercial-characteristic';
import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import { getSale, loadSaleCatalogs, type SaleLine } from '@/services/api/sales-api';
import { saleConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { ConfirmationCard } from '@/features/receipts/components/confirmation-card';
import { AppButton, AppCard, AppScreen, ChoiceDialog, ConfirmationDialog, FeedbackState, FormField, LoadingState, MetricTile, ScreenHeader, SelectionField, StepProgress, type Choice } from '@/ui/components';
import { useBottomNav } from '@/ui/navigation/app-chrome';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, spacing, typography } from '@/ui/tokens';

type Dialog = 'buyer' | 'vehicle' | 'variety' | 'lot-edit' | null;
const steps = ['Despacho', 'Variedades', 'Liquidación', 'Confirmación'] as const;

export function SaleFlowScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { invalidateSession, session, isOfflineSession } = useSession();
  const { enqueue, sendQueued } = useSyncQueue();
  const token = session?.accessToken ?? '';
  // Spec 011 (RQ-ST14, CL-ST19): on the tablet the sale is one screen, as in
  // Stitch; narrower screens and large text keep the form.
  const { fontScale, width } = useWindowDimensions();
  const sheet = width >= 1100 && fontScale <= 1.2;
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [dispatchDate, setDispatchDate] = useState(() => formatLocalDateInput());
  // CL-ST23: the buyer is typed in the sheet. A new name is registered when the
  // sale is saved; RUC / DNI and the date stay on this tablet.
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerDocument, setBuyerDocument] = useState('');
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [varieties, setVarieties] = useState<PotatoVariety[]>([]);
  const [qualities,setQualities]=useState<CommercialCharacteristic[]>([]);
  const [origins,setOrigins]=useState<CommercialCharacteristic[]>([]);
  const [buyerId, setBuyerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [destination, setDestination] = useState('');
  const [driver, setDriver] = useState('');
  const [lines, setLines] = useState<SaleLineDraft[]>([]);
  // CL-ST23: as in the mockup, the sheet opens with «Lote A» of the first
  // variety and ten empty cells. It becomes a real line on its first change.
  const [initialLotId] = useState(() => createOperationId());
  const [draft, setDraft] = useState<SaleLineDraft>({ id: createOperationId(), varietyId: '', priceBasis: 'kilogram', sacks: '', unitPrice: '', weightKg: '' });
  const [freightBasis, setFreightBasis] = useState<'none' | 'kilogram' | 'sack'>('none');
  const [freightRate, setFreightRate] = useState('0');
  const [freightIncluded, setFreightIncluded] = useState(false);
  const [discounts, setDiscounts] = useState('0');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'credit'>('cash');
  const [installments, setInstallments] = useState<InstallmentDraft[]>([]);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogNotice,setCatalogNotice]=useState<string|undefined>();

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
    try{const data=await loadSaleCatalogs(token,session);if(request!==referenceRefresh.current)return;setBuyers(data.buyers);setVarieties(data.varieties);setVehicles(data.vehicles);setQualities(data.qualities??[]);setOrigins(data.origins??[]);setCatalogLoaded(true);setCatalogNotice(data.catalogNotice);}
    catch(cause){if(request===referenceRefresh.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setReferenceReloadError('El dato fue guardado, pero no se pudieron actualizar las opciones. Reintenta la carga antes de seleccionarlo.');}}
    finally{if(request===referenceRefresh.current){referenceReloading.current=false;setReferenceReloadBusy(false);}}
  }
  function closeReference(changed:boolean){
    setReferenceKind(null);referenceState(false,false);if(changed)void refreshReferenceOptions();
  }
  const referenceFeedback=referenceReloadBusy?<LoadingState label="Actualizando opciones de la operación"/>:referenceReloadError?<FeedbackState title="Dato guardado; opciones pendientes" message={referenceReloadError} tone="error" actionLabel="Reintentar opciones" onAction={()=>void refreshReferenceOptions()}/>:null;
  const referenceEditor=referenceKind?<OperationReferenceEditor kind={referenceKind} onClose={changed=>void closeReference(changed)} onEditingState={referenceState}/>:null;
  const canManageReferences=session?.user.role==='wholesaler';
  const referenceManage=canManageReferences?manageReference:undefined;

  const [sale, setSale] = useState<Sale | null>(null);
  const [saleLines, setSaleLines] = useState<SaleLine[]>([]);
  const operationRef = useRef<string | null>(null);
  const submitting = useRef(false);
  const exitAllowed = useRef(false);
  const [isSavedOrDiscarded, setSavedOrDiscarded] = useState(false);
  const [exitAction, setExitAction] = useState<(() => void) | null>(null);
  const [confirmedSaleId, setConfirmedSaleId] = useState<string | null>(null);

  useEffect(() => {
    if(!session)return;
    let active = true;
    loadSaleCatalogs(token,session).then((data) => {
      if (!active) return;
      setCatalogNotice(data.catalogNotice); setCatalogLoaded(true); setBuyers(data.buyers); setVehicles(data.vehicles); setVarieties(data.varieties);setQualities(data.qualities??[]);setOrigins(data.origins??[]);
    }).catch((cause) => {
      if (!active) return;
      if (cause instanceof ApiError && cause.status === 401) void invalidateSession();
      else setError(errorMessage(cause));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [catalogRevision, invalidateSession, token, session]);

  const unfinishedLine = Boolean(draft.varietyId || draft.sacks || draft.weightKg || draft.unitPrice || draft.qualityId || draft.originId);
  const hasUnsavedChanges = Boolean(buyerId || vehicleId || destination || driver || lines.length || unfinishedLine || draft.priceBasis !== 'kilogram' || freightBasis !== 'none' || freightRate !== '0' || freightIncluded || discounts !== '0' || paymentMode !== 'cash' || installments.length);
  const protectExit = Boolean(session) && !sale && !confirmedSaleId && !isSavedOrDiscarded && (hasUnsavedChanges || busy || referenceDirty || referenceBusy);
  useBrowserTraversalGuard(protectExit,exitAllowed,leave=>{
    if(!submitting.current&&!referenceWorking.current&&!exitAction)setExitAction(()=>leave);
  },()=>setError('No se pudo completar la navegación. Inténtalo nuevamente.'));
  usePreventRemove(protectExit, ({data}) => {
    if (exitAllowed.current) {navigation.dispatch(data.action);return;}
    if (submitting.current||referenceWorking.current) return;
    setExitAction(() => () => navigation.dispatch(data.action));
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || !protectExit || typeof window === 'undefined') return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (exitAllowed.current) return;
      event.preventDefault(); event.returnValue = '';
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [protectExit]);
  function requestExit(destination: 'back' | 'home' = 'back') {
    if (submitting.current||referenceWorking.current) return;
    const leave = () => {if(destination==='back'&&router.canGoBack()) router.back();else router.replace('/home' as Href);};
    if (protectExit) setExitAction(() => leave);else leave();
  }
  function confirmExit() {
    if (submitting.current || referenceWorking.current || !exitAction) return;
    const leave = exitAction; setExitAction(null);
    // Dispatching an already intercepted action continues its original route.
    // Explicit cancel uses an approval flag so its fresh navigation can proceed.
    exitAllowed.current = true; setSavedOrDiscarded(true); leave();
  }

  // CL-ST23: the sheet offers «Por sacos» / «Por kilaje»; a rate of 0 means
  // the sale goes without freight.
  const sheetFreightBasis = freightBasis === 'none' ? 'sack' : freightBasis;
  const effectiveFreightBasis = sheet ? ((moneyInputToCents(freightRate) ?? 0) > 0 ? sheetFreightBasis : 'none') : freightBasis;
  const initialLot = useMemo(() => (sheet && varieties.length ? withSlots({ id: initialLotId, varietyId: varieties[0]!.id, priceBasis: 'kilogram', sacks: '0', unitPrice: '', weightKg: '0', qualityId: null, qualityName: null, originId: null, originName: null }, Array.from({ length: 10 }, () => '')) : null), [initialLotId, sheet, varieties]);
  const sheetLines = lines.length || !initialLot ? lines : [initialLot];
  // Lots still without sacks stay on the sheet (0 sacos, S/ 0.00) but are not sent.
  const sentLines = sheet ? sheetLines.filter((line) => Number(line.sacks) > 0) : lines;
  const preview = calculateSalePreview(sentLines, {freightBasis: effectiveFreightBasis,freightRate,freightIncluded,discounts});
  function retryCatalogs() {setLoading(true);setError(null);setCatalogRevision(value=>value+1);}
  const buyer = buyers.find((item) => item.id === buyerId);
  const vehicle = vehicles.find((item) => item.id === vehicleId);
  const selectedVariety = varieties.find((item) => item.id === draft.varietyId);
  const varietyChoices = varieties.map((item) => ({id:item.id,label:item.name}));
  const lineError = draft.varietyId ? validateSaleLine(draft, selectedVariety) : null;
  const step = sale ? 3 : lines.length ? 2 : buyerId ? 1 : 0;

  function select(choice: Choice) {
    if (dialog === 'buyer') {
      const selected = buyers.find((item) => item.id === choice.id)!;
      setBuyerId(selected.id); setDestination(selected.destinationDepartment ?? ''); setDialog(null);
    } else if (dialog === 'vehicle') { setVehicleId(choice.id); setDialog(null); }
    else if (dialog === 'variety') { setDraft((current) => ({ ...current, varietyId: choice.id })); setDialog(null); }
  }

  // Sheet: each lot is a line whose sacks are weighed one by one.
  // «Crear lote» of the sheet (CL-ST22): variety, quality, price and the
  // number of empty cells the lot starts with.
  function addLot(lot: NewLot) {
    setError(null);
    let line = withSlots({ id: createOperationId(), varietyId: lot.varietyId, priceBasis: 'kilogram', sacks: '0', unitPrice: lot.unitPrice, weightKg: '0', qualityId: lot.qualityId, originId: lot.originId }, Array.from({ length: lot.plannedSacks }, () => ''));
    if (sheetLines.some((item) => commercialLineKey(item) === commercialLineKey(line))) { setError('Esta variedad ya tiene un lote con esa calidad; cambia la calidad o la procedencia para añadir otro.'); return false; }
    try { line = { ...line, ...captureCommercialSnapshot(line, qualities, origins) }; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa la calidad del lote.'); return false; }
    setLines((current) => [...withInitial(current), line]);
    setActiveLineId(line.id);
    return true;
  }
  // The initial lot becomes a real line the first time it changes.
  const withInitial = (current: SaleLineDraft[]) => (current.length || !initialLot ? current : [initialLot]);
  function updateLine(id: string, change: (line: SaleLineDraft) => SaleLineDraft) {
    setLines((current) => withInitial(current).map((line) => (line.id === id ? change(line) : line)));
  }
  // ✎ of the lot: variety, quality, origin and price of the active lot.
  function editLot(lot: NewLot) {
    const active = sheetLines.find((line) => line.id === activeLineId) ?? sheetLines[0];
    if (!active) return false;
    const next = { ...active, varietyId: lot.varietyId, qualityId: lot.qualityId, originId: lot.originId, unitPrice: lot.unitPrice };
    if (sheetLines.some((item) => item.id !== active.id && commercialLineKey(item) === commercialLineKey(next))) { setError('Esta combinación de variedad, calidad y procedencia ya está en otro lote.'); return false; }
    try { const snapshot = captureCommercialSnapshot(next, qualities, origins); setError(null); updateLine(active.id, () => ({ ...next, ...snapshot })); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa calidad y procedencia.'); return false; }
  }
  function changeLotCharacteristic(field: 'qualityId' | 'originId', id: string | null) {
    const active = lines.find((line) => line.id === activeLineId);
    if (!active || busy) return;
    const next = { ...active, [field]: id };
    if (lines.some((item) => item.id !== active.id && commercialLineKey(item) === commercialLineKey(next))) { setError('Esta combinación de variedad, calidad y procedencia ya está agregada.'); return; }
    try { const snapshot = captureCommercialSnapshot(next, qualities, origins); setError(null); updateLine(active.id, () => ({ ...next, ...snapshot })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Revisa calidad y procedencia.'); }
  }
  function clearSale() {
    if (busy) return;
    setBuyerId(''); setVehicleId(''); setDestination(''); setDriver(''); setLines([]); setActiveLineId(null);
    setFreightBasis('none'); setFreightRate('0'); setFreightIncluded(false); setDiscounts('0'); setPaymentMode('cash'); setInstallments([]); setError(null);
  }

  function addLine() {
    setError(null);
    const issue = validateSaleLine(draft, selectedVariety);
    if (issue || !moneyInputToCents(draft.unitPrice)) { setError(issue ?? 'Ingresa un precio válido mayor que cero.'); return; }
    if (lines.some(line => commercialLineKey(line) === commercialLineKey(draft))) {setError('Esta combinación de variedad, calidad y procedencia ya está agregada.'); return;}
    try{const characteristics=captureCommercialSnapshot(draft,qualities,origins);setLines((current) => [...current, {...draft,...characteristics}]);}
    catch(cause){setError(cause instanceof Error?cause.message:'Revisa calidad y procedencia.');return;}
    setDraft({ id: createOperationId(), varietyId: '', priceBasis: 'kilogram', sacks: '', unitPrice: '', weightKg: '' });
  }

  function requestConfirmation() {
    if (submitting.current||referenceWorking.current) return;
    setError(null);
    if (unfinishedLine) {setError('Agrega la variedad en edición o vacía sus campos antes de revisar la venta.');return;}
    if (!(buyerId || (sheet && buyerName.trim())) || !destination.trim() || preview.kind !== 'ready') {
      setError(preview.kind === 'invalid' ? preview.message : 'Completa comprador y destino.'); return;
    }
    if (sheet && !buyerId && session?.user.role !== 'wholesaler') { setError('Solo el Mayorista registra compradores nuevos: elige uno de la lista.'); return; }
    if (sheet && !buyerId && isOfflineSession) { setError('Para registrar un comprador nuevo necesitas conexión.'); return; }
    const issue = paymentMode === 'credit' ? validateCreditSchedule(installments,preview.totalCents) : null;
    if (issue) {setError(issue.replace('monto líquido','total de venta'));return;}
    setConfirming(true);
  }

  async function submit() {
    if (submitting.current||referenceWorking.current) return;
    submitting.current = true;
    let saved = false;
    operationRef.current ??= createOperationId(); setConfirming(false); setBusy(true); setError(null);
    try {
    const saleBuyerId = sheet ? await ensureBuyer() : buyerId;
    const payload = {
      buyerId: saleBuyerId, clientOperationId: operationRef.current!, destinationDepartment: destination.trim(), discountsCents: moneyInputToCents(discounts)!,
      driverName: driver.trim() || undefined, freightIncludedInTotal: freightIncluded,
      ...(effectiveFreightBasis === 'none' ? {} : { freightBasis: effectiveFreightBasis, freightRateCents: moneyInputToCents(freightRate)! }),
      installments: paymentMode === 'cash' ? [] : installments.map((item) => ({ amountCents: moneyInputToCents(item.amount)!, dueOn: item.dueOn })),
      lines: sentLines.map((line) => ({ varietyId: line.varietyId, qualityId:line.qualityId??null,originId:line.originId??null,priceBasis: line.priceBasis, sacks: Number(line.sacks), unitPriceCents: moneyInputToCents(line.unitPrice)!, weightKg: line.weightKg.trim().replace(',', '.') })),
      paymentMode, vehicleId: vehicleId || undefined,
    };
      await enqueue({body:payload,id:payload.clientOperationId,method:'POST',path:'/sales',type:'sale.create'});
      saved=true;
      exitAllowed.current=true;
      setSavedOrDiscarded(true);
      operationRef.current=null;
      const outcome=await sendQueued(payload.clientOperationId);
      if(outcome.status!=='confirmed'||!outcome.centralReference){router.replace('/sync-queue' as Href);return;}
      saved=false;
      setConfirmedSaleId(outcome.centralReference);
      const confirmed=await getSale(token,outcome.centralReference);setSale(confirmed.sale);setSaleLines(confirmed.lines);
    } catch (cause) {
      if(saved){router.replace('/sync-queue' as Href);return;}
      setError(errorMessage(cause));
    } finally {submitting.current=false;setBusy(false);}
  }

  // The buyer of the sheet: a new name is created and a changed phone is kept
  // in the catalog (only the Mayorista, online). After creating it the id is
  // kept, so a retry does not create it twice.
  async function ensureBuyer() {
    const name = buyerName.trim();
    const phone = buyerPhone.trim();
    if (buyerId) {
      const current = buyers.find((item) => item.id === buyerId);
      if (current && session?.user.role === 'wholesaler' && !isOfflineSession && phone !== (current.phone ?? '')) {
        const updated = await updateCatalogItem<Buyer>(token, 'buyers', buyerId, { phone: phone || undefined });
        setBuyers((all) => all.map((item) => (item.id === buyerId ? { ...item, ...updated } : item)));
      }
      return buyerId;
    }
    const created = await createCatalogItem<Buyer>(token, 'buyers', { name, phone: phone || undefined, destinationDepartment: destination.trim() || undefined });
    setBuyers((all) => [...all, created]);
    setBuyerId(created.id);
    return created.id;
  }
  function typeBuyerName(value: string) {
    setBuyerName(value);
    const match = buyers.find((item) => item.name.trim().toLowerCase() === value.trim().toLowerCase());
    setBuyerId(match?.id ?? '');
  }
  function pickBuyer(id: string) {
    const selected = buyers.find((item) => item.id === id);
    if (!selected) return;
    setBuyerId(selected.id); setBuyerName(selected.name); setBuyerPhone(selected.phone ?? ''); setDestination(selected.destinationDepartment ?? '');
  }

  async function reloadConfirmedSale() {
    if(!confirmedSaleId)return;
    setBusy(true);setError(null);
    try{const confirmed=await getSale(token,confirmedSaleId);setSale(confirmed.sale);setSaleLines(confirmed.lines)}
    catch(cause){setError(errorMessage(cause))}
    finally{setBusy(false)}
  }
  // Spec 011 (RQ-ST02, CL-ST07): while editing, the bottom bar leaves through
  // the unsaved-sale check and offers the review as its step action.
  const editing = Boolean(session) && !loading && catalogLoaded && !sale && !confirmedSaleId && !sheet;
  useBottomNav({
    back: editing ? { label: 'Atrás', disabled: busy, onPress: () => requestExit() } : null,
    home: editing ? { label: 'Menú principal', disabled: busy, onPress: () => requestExit('home') } : null,
    next: editing ? { label: busy ? 'Confirmando…' : 'Revisar y confirmar', disabled: busy, onPress: () => requestConfirmation() } : null,
  });
  if (!session) return null;
  if (loading) return <AppScreen contentContainerStyle={{ justifyContent: 'center' }} scrollable={false}><LoadingState label="Cargando compradores y variedades" /></AppScreen>;
  if (!catalogLoaded) return <AppScreen><FeedbackState actionLabel="Reintentar" onAction={retryCatalogs} title="No se pudieron cargar los catálogos" message={error ?? 'Reintenta la consulta.'} tone="error" /></AppScreen>;
  // Spec 011 (RQ-ST04, CL-ST18): the Stitch «Guardado exitosamente» screen.
  if (sale || confirmedSaleId) return (
    <AppScreen contentContainerStyle={styles.saved}>
      <AppHeader eyebrow="DESPACHO" subtitle="Venta y despacho confirmados" title="Venta" />
      {sale ? <ConfirmationCard documentLabel="NOTA DE VENTA" title="La venta" party={sale.buyerName ?? buyer?.name ?? 'Comprador registrado'} summary={saleConfirmationSummary(sale, saleLines, (id) => varieties.find((item) => item.id === id)?.name)} receipt={{ kind: 'sales', id: sale.id }} newLabel="Nueva venta" onNew={() => router.replace({ pathname: '/sale-flow', params: { nueva: String(Date.now()) } } as Href)} /> : <FeedbackState title="Venta confirmada" message="La venta fue registrada por el servidor. Falta cargar su detalle." tone="success" />}
      {error ? <FeedbackState title="No se pudo cargar el detalle de la venta confirmada" message={error} tone="error" /> : null}
      {!sale ? <AppButton disabled={busy} label={busy?'Cargando detalle…':'Reintentar consulta del detalle'} onPress={()=>void reloadConfirmedSale()} tone="secondary" /> : null}
    </AppScreen>
  );

  const scheduleReview = paymentMode === 'credit' ? installments.map((item, index) => {
    const cents = moneyInputToCents(item.amount);
    return `Cuota ${index + 1}: ${item.dueOn || 'Fecha pendiente'} · ${cents === null ? 'Importe pendiente' : formatMoney(cents)}.`;
  }).join(' ') : '';
  const dialogs = <>
    <ChoiceDialog choices={dialog === 'buyer' ? buyers.map((item) => ({ id: item.id, label: item.name, supportingText: item.destinationDepartment ?? undefined })) : dialog === 'vehicle' ? vehicles.map((item) => ({ id: item.id, label: item.plate, supportingText: item.description ?? undefined })) : varietyChoices} onClose={() => setDialog(null)} onSelect={select} selectedIds={[buyerId, vehicleId, draft.varietyId]} title={dialog === 'buyer' ? 'Seleccionar comprador' : dialog === 'vehicle' ? 'Seleccionar vehículo' : 'Seleccionar variedad'} visible={dialog !== null && dialog !== 'lot-edit' && !(sheet && dialog === 'variety')} />
    <LotDialog key={`${dialog}-${activeLineId}`} initial={dialog === 'lot-edit' ? (() => { const active = sheetLines.find((line) => line.id === activeLineId) ?? sheetLines[0]; return active ? { varietyId: active.varietyId, qualityId: active.qualityId ?? null, originId: active.originId ?? null, unitPrice: active.unitPrice } : undefined; })() : undefined} onCancel={() => setDialog(null)} onCreate={(lot) => { if (dialog === 'lot-edit' ? editLot(lot) : addLot(lot)) setDialog(null); }} origins={origins.filter((item) => item.isActive).map((item) => ({ id: item.id, label: item.name }))} qualities={qualities.filter((item) => item.isActive).map((item) => ({ id: item.id, label: item.name }))} varieties={varietyChoices.map((item) => ({ id: item.id, label: item.label }))} visible={sheet && (dialog === 'variety' || dialog === 'lot-edit')} />
    <ConfirmationDialog busy={busy} confirmLabel="Confirmar venta" message={preview.kind === 'ready' ? `${buyer?.name ?? 'Comprador'} · ${destination}. Bruto ${formatMoney(preview.grossCents)}, flete ${formatMoney(preview.freightCents)} (${freightIncluded ? 'incluido' : 'separado'}), descuento ${formatMoney(preview.discountsCents)} y total ${formatMoney(preview.totalCents)}. Pago ${paymentMode === 'cash' ? 'al contado' : 'a crédito'}. ${scheduleReview} Se registrará la venta y su efecto financiero.` : 'Revisa los datos de la venta.'} onCancel={() => setConfirming(false)} onConfirm={() => void submit()} title="¿Confirmar la venta?" visible={confirming} />
    <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar" title="¿Salir de la venta?" message="Los datos en edición todavía no se han guardado. Si sales, perderás este borrador de venta." visible={exitAction !== null} onCancel={()=>setExitAction(null)} onConfirm={confirmExit} />
  </>;
  if (sheet) {
    const activeLine = sheetLines.find((line) => line.id === activeLineId) ?? sheetLines[0];
    const lineName = (line: SaleLineDraft) => { const name = varieties.find((item) => item.id === line.varietyId)?.name ?? 'Variedad'; return line.qualityName ? `${name} · ${line.qualityName}` : name; };
    return <>
      {referenceEditor}
      <SaleSheet
        errorMessage={error ?? undefined} busy={busy}
        notice={<>{referenceFeedback}{catalogNotice ? <FeedbackState title="Datos de referencia" message={catalogNotice} /> : null}</>}
        buyerName={buyerName} onBuyerNameChange={typeBuyerName} onPickBuyer={pickBuyer}
        buyerSuggestions={buyerName.trim().length >= 2 && !buyerId ? buyers.filter((item) => item.name.toLowerCase().includes(buyerName.trim().toLowerCase())).slice(0, 5).map((item) => ({ id: item.id, label: item.name, supportingText: item.destinationDepartment ?? undefined })) : []}
        buyerNotice={[buyerName.trim() && !buyerId ? (session?.user.role === 'wholesaler' ? 'Comprador nuevo: se registrará al guardar la venta.' : 'Elige un comprador de la lista: solo el Mayorista registra compradores nuevos.') : null, buyerDocument || dispatchDate !== formatLocalDateInput() ? 'RUC / DNI y fecha de despacho quedan en esta tablet; el servidor registra la venta con la fecha y hora en que se guarda.' : null].filter(Boolean).join(' ') || undefined}
        buyerPhone={buyerPhone} onBuyerPhoneChange={setBuyerPhone} phoneEditable={!buyerId || session?.user.role === 'wholesaler'}
        buyerDocument={buyerDocument} onBuyerDocumentChange={setBuyerDocument}
        dispatchDate={dispatchDate} onDispatchDateChange={setDispatchDate}
        destination={destination} onDestinationChange={setDestination} vehiclePlate={vehicle?.plate} driver={driver} onDriverChange={setDriver}
        onSelectVehicle={() => setDialog('vehicle')}
        lotCharacteristics={activeLine ? <CharacteristicFields appearance="stitch" value={activeLine} qualities={qualities} origins={origins} disabled={busy} onChange={changeLotCharacteristic}/> : null}
        lines={sheetLines} lineName={lineName} activeLineId={activeLine?.id ?? null} onSelectLine={setActiveLineId}
        onAddLot={() => setDialog('variety')} onEditLot={() => setDialog('lot-edit')} onRemoveLot={(id) => { setLines((current) => withInitial(current).filter((line) => line.id !== id)); setActiveLineId(null); }}
        onChangeSlots={(id, slots) => updateLine(id, (line) => withSlots(line, slots))}
        onChangeLine={(id, field, value) => updateLine(id, (line) => ({ ...line, [field]: value }))}
        preview={preview} freightBasis={sheetFreightBasis} freightRate={freightRate} freightIncluded={freightIncluded} discounts={discounts} paymentMode={paymentMode} installments={installments}
        onChange={(field, value) => { if (field === 'freightBasis') setFreightBasis(value as typeof freightBasis); else if (field === 'freightRate') setFreightRate(value); else if (field === 'freightIncluded') setFreightIncluded(value === 'true'); else if (field === 'discounts') setDiscounts(value); else setPaymentMode(value as typeof paymentMode); }}
        onAddInstallment={() => setInstallments((all) => [...all, { amount: '', dueOn: '', id: createOperationId() }])}
        onChangeInstallment={(id, field, value) => setInstallments((all) => all.map((item) => (item.id === id ? { ...item, [field]: value } : item)))}
        onRemoveInstallment={(id) => setInstallments((all) => all.filter((item) => item.id !== id))}
        onClear={clearSale} onSave={requestConfirmation} onBack={() => requestExit()} onGoHome={() => requestExit('home')}
      />
      {dialogs}
    </>;
  }
  return <>
    {referenceEditor}
    <AppScreen contentContainerStyle={styles.screen}>
      <ScreenHeader eyebrow="VENTAS Y DESPACHOS" title="Nueva venta" description="Registra variedades, cantidades y precios y revisa el acuerdo antes de confirmar." />
      <StepProgress activeIndex={step} steps={steps} />
      {referenceFeedback}
      {error ? <FeedbackState title="Revisa la operación" message={error} tone="error" /> : null}
      {catalogNotice?<FeedbackState title="Datos de referencia" message={catalogNotice}/>:null}
      {!buyers.length || !varieties.length ? <FeedbackState actionLabel={canManageReferences&&!isOfflineSession&&!referenceReloadBusy?'Registrar datos':undefined} onAction={canManageReferences&&!isOfflineSession&&!referenceReloadBusy?()=>manageReference(!buyers.length?'buyers':'varieties'):undefined} title="Completa los datos de la venta" message={canManageReferences?'Registra un comprador y una variedad desde este formulario antes de crear la venta.':'El Mayorista debe registrar un comprador y una variedad para poder seleccionarlos.'} /> : null}
      <AppCard title="Comprador y despacho">
        <OperationReferenceActions kinds={['buyers']} onManage={referenceManage} disabled={busy||isOfflineSession||Boolean(referenceKind)||referenceReloadBusy}/>
        <SelectionField disabled={busy} label="Comprador" onPress={() => setDialog('buyer')} placeholder="Selecciona un comprador" value={buyer?.name} />
        <View style={styles.columns}><View style={styles.column}><FormField editable={!busy} label="Departamento de destino" onChangeText={setDestination} value={destination} /></View><View style={styles.column}><SelectionField disabled={busy} label="Vehículo" onPress={() => setDialog('vehicle')} placeholder="Opcional" value={vehicle?.plate} /></View><View style={styles.column}><FormField editable={!busy} label="Conductor" onChangeText={setDriver} value={driver} /></View></View>
      </AppCard>
      <AppCard title="Variedades de la venta" description="Registra los sacos y el peso de esta operación.">
        <OperationReferenceActions kinds={['varieties','qualities','origins']} onManage={referenceManage} disabled={busy||isOfflineSession||Boolean(referenceKind)||referenceReloadBusy}/>
        <CharacteristicFields value={draft} qualities={qualities} origins={origins} disabled={busy} onChange={(field,id)=>setDraft(current=>({...current,[field]:id}))}/>
        <SelectionField disabled={busy} error={lineError ?? undefined} label="Variedad" onPress={() => setDialog('variety')} placeholder="Selecciona una variedad" value={selectedVariety?.name} />
        <View style={styles.columns}><View style={styles.column}><FormField editable={!busy} keyboardType="number-pad" label="Sacos" onChangeText={(v) => setDraft((d) => ({ ...d, sacks: v }))} value={draft.sacks} /></View><View style={styles.column}><FormField editable={!busy} keyboardType="decimal-pad" label="Peso (kg)" onChangeText={(v) => setDraft((d) => ({ ...d, weightKg: v }))} value={draft.weightKg} /></View><View style={styles.column}><FormField editable={!busy} keyboardType="decimal-pad" label="Precio (S/)" onChangeText={(v) => setDraft((d) => ({ ...d, unitPrice: v }))} value={draft.unitPrice} /></View></View>
        <View style={styles.toggle}><AppButton disabled={busy} label="Precio por kg" onPress={() => setDraft((d) => ({ ...d, priceBasis: 'kilogram' }))} accessibilityRole="radio" accessibilityState={{ checked: draft.priceBasis === 'kilogram' }} tone={draft.priceBasis === 'kilogram' ? 'primary' : 'secondary'} /><AppButton disabled={busy} label="Precio por saco" onPress={() => setDraft((d) => ({ ...d, priceBasis: 'sack' }))} accessibilityRole="radio" accessibilityState={{ checked: draft.priceBasis === 'sack' }} tone={draft.priceBasis === 'sack' ? 'primary' : 'secondary'} /><AppButton disabled={busy} label="Agregar línea" onPress={addLine} /></View>
        {lines.map((line, index) => { const name = varieties.find((item) => item.id === line.varietyId)?.name ?? 'Variedad'; return <View key={line.id} style={styles.line}><View style={{ flex: 1 }}><Text style={styles.lineTitle}>{name}</Text><Text style={styles.help}>{commercialDescription(line)}</Text><Text style={styles.help}>{line.sacks} sacos · {line.weightKg} kg · S/ {line.unitPrice} por {line.priceBasis === 'kilogram' ? 'kg' : 'saco'}</Text></View><AppButton disabled={busy} label="Quitar" accessibilityLabel={`Quitar línea ${index + 1}: ${name}`} onPress={() => setLines((current) => current.filter((item) => item.id !== line.id))} tone="secondary" /></View>; })}
      </AppCard>
      <AppCard title="Liquidación">
        <View style={styles.toggle}>{([['none', 'Sin flete'], ['kilogram', 'Flete por kg'], ['sack', 'Flete por saco']] as const).map(([v, label]) => <AppButton disabled={busy} key={v} label={label} onPress={() => setFreightBasis(v)} accessibilityRole="radio" accessibilityState={{ checked: freightBasis === v }} tone={freightBasis === v ? 'primary' : 'secondary'} />)}</View>
        {freightBasis !== 'none' ? <><FormField editable={!busy} keyboardType="decimal-pad" label="Tarifa de flete (S/)" onChangeText={setFreightRate} value={freightRate} /><View style={styles.toggle}><AppButton disabled={busy} label="Flete separado" onPress={() => setFreightIncluded(false)} accessibilityRole="radio" accessibilityState={{ checked: !freightIncluded }} tone={!freightIncluded ? 'primary' : 'secondary'} /><AppButton disabled={busy} label="Incluir en total" onPress={() => setFreightIncluded(true)} accessibilityRole="radio" accessibilityState={{ checked: freightIncluded }} tone={freightIncluded ? 'primary' : 'secondary'} /></View></> : null}
        <FormField editable={!busy} keyboardType="decimal-pad" label="Descuentos (S/)" onChangeText={setDiscounts} value={discounts} />
        <View style={styles.toggle}><AppButton disabled={busy} label="Contado" onPress={() => setPaymentMode('cash')} accessibilityRole="radio" accessibilityState={{ checked: paymentMode === 'cash' }} tone={paymentMode === 'cash' ? 'primary' : 'secondary'} /><AppButton disabled={busy} label="Crédito" onPress={() => setPaymentMode('credit')} accessibilityRole="radio" accessibilityState={{ checked: paymentMode === 'credit' }} tone={paymentMode === 'credit' ? 'primary' : 'secondary'} /></View>
        {paymentMode === 'credit' ? <View style={{ gap: spacing.md }}>{installments.map((item, index) => <View key={item.id} style={styles.line}><View style={[styles.columns, styles.installmentFields]}><View style={styles.column}><FormField editable={!busy} label={`Vencimiento cuota ${index + 1}`} onChangeText={(v) => setInstallments((all) => all.map((x) => x.id === item.id ? { ...x, dueOn: v } : x))} placeholder="aaaa-mm-dd" value={item.dueOn} /></View><View style={styles.column}><FormField editable={!busy} keyboardType="decimal-pad" label="Importe (S/)" accessibilityLabel={`Importe cuota ${index + 1} (S/)`} onChangeText={(v) => setInstallments((all) => all.map((x) => x.id === item.id ? { ...x, amount: v } : x))} value={item.amount} /></View></View><AppButton disabled={busy} label="Quitar" accessibilityLabel={`Quitar cuota ${index + 1}`} onPress={() => setInstallments((all) => all.filter((x) => x.id !== item.id))} tone="secondary" /></View>)}<AppButton disabled={busy} label="Agregar cuota" onPress={() => setInstallments((all) => [...all, { amount: '', dueOn: '', id: createOperationId() }])} tone="secondary" /></View> : null}
      </AppCard>
      {preview.kind === 'ready' ? <View style={styles.metrics}><MetricTile label="Bruto provisional" value={formatMoney(preview.grossCents)} /><MetricTile label="Flete provisional" value={formatMoney(preview.freightCents)} /><MetricTile label="Descuentos" value={formatMoney(preview.discountsCents)} /><MetricTile label="Total provisional" value={formatMoney(preview.totalCents)} /></View> : null}
      <View style={styles.actions}><AppButton disabled={busy} label={busy ? 'Confirmando…' : 'Revisar y confirmar'} onPress={requestConfirmation} /></View>
    </AppScreen>
    {dialogs}
  </>;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiUnavailableError) return 'No se pudo conectar con el servidor. Reintenta la consulta.';
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'La operación no pudo completarse.';
}

const styles = StyleSheet.create({
  installmentFields: {flexGrow:1,flexBasis:400,minWidth:0,maxWidth:'100%'},
  screen: { gap: spacing.xl },
  saved: { gap: spacing.md, justifyContent: 'center', paddingBottom: spacing.md, paddingTop: spacing.sm }, columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, column: { flexBasis: 230, flexGrow: 1 },
  toggle: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, line: { alignItems: 'center', borderTopColor: color.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.md },
  lineTitle: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' }, help: { color: color.textSecondary, ...typography.bodySmall }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});

