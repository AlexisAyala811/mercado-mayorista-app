import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRouter, type Href } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import {useBrowserTraversalGuard} from '@/navigation/use-browser-traversal-guard';

import { createOperationId, formatMoney, moneyInputToCents, type PotatoVariety, type Vehicle } from '@/domain/reception/reception';
import { calculateSalePreview } from '@/domain/sales/sale-preview';
import { validateCreditSchedule } from '@/domain/reception/purchase-preview';
import { validateSaleLine, type Buyer, type Sale, type SaleLineDraft } from '@/domain/sales/sale';
import { useSession } from '@/features/auth/session/session-provider';
import { useSyncQueue } from '@/features/sync/sync-queue-provider';
import type { InstallmentDraft } from '@/features/reception/screens/settlement-screen';
import {CharacteristicFields} from '@/features/catalog/components/characteristic-fields';
import {OperationReferenceActions} from '@/features/catalog/components/operation-reference-actions';
import {OperationReferenceEditor} from '@/features/catalog/screens/catalog-workspace';
import type {CatalogKind} from '@/services/api/catalog-api';
import {captureCommercialSnapshot,commercialDescription,commercialLineKey,type CommercialCharacteristic} from '@/domain/catalog/commercial-characteristic';
import { ApiError, ApiUnavailableError } from '@/services/api/api-client';
import { getSale, loadSaleCatalogs, type SaleLine } from '@/services/api/sales-api';
import { saleConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { ConfirmationCard } from '@/features/receipts/components/confirmation-card';
import { AppButton, AppCard, AppScreen, ChoiceDialog, ConfirmationDialog, FeedbackState, FormField, LoadingState, MetricTile, ScreenHeader, SelectionField, StepProgress, type Choice } from '@/ui/components';
import { useBottomNav } from '@/ui/navigation/app-chrome';
import { color, spacing, typography } from '@/ui/tokens';

type Dialog = 'buyer' | 'vehicle' | 'variety' | null;
const steps = ['Despacho', 'Variedades', 'Liquidación', 'Confirmación'] as const;

export function SaleFlowScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { invalidateSession, session, isOfflineSession } = useSession();
  const { enqueue, sendQueued } = useSyncQueue();
  const token = session?.accessToken ?? '';
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

  const preview = calculateSalePreview(lines, {freightBasis,freightRate,freightIncluded,discounts});
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
    if (!buyerId || !destination.trim() || preview.kind !== 'ready') {
      setError(preview.kind === 'invalid' ? preview.message : 'Completa comprador y destino.'); return;
    }
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
    const payload = {
      buyerId, clientOperationId: operationRef.current!, destinationDepartment: destination.trim(), discountsCents: moneyInputToCents(discounts)!,
      driverName: driver.trim() || undefined, freightIncludedInTotal: freightIncluded,
      ...(freightBasis === 'none' ? {} : { freightBasis, freightRateCents: moneyInputToCents(freightRate)! }),
      installments: paymentMode === 'cash' ? [] : installments.map((item) => ({ amountCents: moneyInputToCents(item.amount)!, dueOn: item.dueOn })),
      lines: lines.map((line) => ({ varietyId: line.varietyId, qualityId:line.qualityId??null,originId:line.originId??null,priceBasis: line.priceBasis, sacks: Number(line.sacks), unitPriceCents: moneyInputToCents(line.unitPrice)!, weightKg: line.weightKg.trim().replace(',', '.') })),
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

  async function reloadConfirmedSale() {
    if(!confirmedSaleId)return;
    setBusy(true);setError(null);
    try{const confirmed=await getSale(token,confirmedSaleId);setSale(confirmed.sale);setSaleLines(confirmed.lines)}
    catch(cause){setError(errorMessage(cause))}
    finally{setBusy(false)}
  }
  // Spec 011 (RQ-ST02, CL-ST07): while editing, the bottom bar leaves through
  // the unsaved-sale check and offers the review as its step action.
  const editing = Boolean(session) && !loading && catalogLoaded && !sale && !confirmedSaleId;
  useBottomNav({
    back: editing ? { label: 'Atrás', disabled: busy, onPress: () => requestExit() } : null,
    home: editing ? { label: 'Menú principal', disabled: busy, onPress: () => requestExit('home') } : null,
    next: editing ? { label: busy ? 'Confirmando…' : 'Revisar y confirmar', disabled: busy, onPress: () => requestConfirmation() } : null,
  });
  if (!session) return null;
  if (loading) return <AppScreen contentContainerStyle={{ justifyContent: 'center' }} scrollable={false}><LoadingState label="Cargando compradores y variedades" /></AppScreen>;
  if (!catalogLoaded) return <AppScreen><FeedbackState actionLabel="Reintentar" onAction={retryCatalogs} title="No se pudieron cargar los catálogos" message={error ?? 'Reintenta la consulta.'} tone="error" /></AppScreen>;
  if (sale || confirmedSaleId) return (
    <AppScreen contentContainerStyle={styles.screen}>
      <ScreenHeader eyebrow="VENTAS Y DESPACHOS" title="Venta confirmada" description="La venta y su efecto financiero fueron registrados por el servidor." />
      <StepProgress activeIndex={3} steps={steps} />
      {sale ? <ConfirmationCard title="Venta guardada" party={sale.buyerName ?? buyer?.name ?? 'Comprador registrado'} summary={saleConfirmationSummary(sale, saleLines, (id) => varieties.find((item) => item.id === id)?.name)} receipt={{ kind: 'sales', id: sale.id }} newLabel="Nueva venta" onNew={() => router.replace({ pathname: '/sale-flow', params: { nueva: String(Date.now()) } } as Href)} /> : null}
      <FeedbackState title="Operación confirmada" message="La venta fue registrada de forma idempotente." tone="success" />
      {sale ? <View style={styles.metrics}><MetricTile label="Importe bruto" value={formatMoney(sale.grossAmountCents)} /><MetricTile label="Flete" value={formatMoney(sale.freightAmountCents)} /><MetricTile label="Descuentos" value={formatMoney(sale.discountsCents)} /><MetricTile label="Total" value={formatMoney(sale.totalAmountCents)} /></View> : null}
      {error ? <FeedbackState title="No se pudo cargar el detalle de la venta confirmada" message={error} tone="error" /> : null}
      {!sale ? <AppButton disabled={busy} label={busy?'Cargando detalle…':'Reintentar consulta del detalle'} onPress={()=>void reloadConfirmedSale()} tone="secondary" /> : null}
    </AppScreen>
  );

  const scheduleReview = paymentMode === 'credit' ? installments.map((item, index) => {
    const cents = moneyInputToCents(item.amount);
    return `Cuota ${index + 1}: ${item.dueOn || 'Fecha pendiente'} · ${cents === null ? 'Importe pendiente' : formatMoney(cents)}.`;
  }).join(' ') : '';
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
    <ChoiceDialog choices={dialog === 'buyer' ? buyers.map((item) => ({ id: item.id, label: item.name, supportingText: item.destinationDepartment ?? undefined })) : dialog === 'vehicle' ? vehicles.map((item) => ({ id: item.id, label: item.plate, supportingText: item.description ?? undefined })) : varietyChoices} onClose={() => setDialog(null)} onSelect={select} selectedIds={[buyerId, vehicleId, draft.varietyId]} title={dialog === 'buyer' ? 'Seleccionar comprador' : dialog === 'vehicle' ? 'Seleccionar vehículo' : 'Seleccionar variedad'} visible={dialog !== null} />
    <ConfirmationDialog busy={busy} confirmLabel="Confirmar venta" message={preview.kind === 'ready' ? `${buyer?.name ?? 'Comprador'} · ${destination}. Bruto ${formatMoney(preview.grossCents)}, flete ${formatMoney(preview.freightCents)} (${freightIncluded ? 'incluido' : 'separado'}), descuento ${formatMoney(preview.discountsCents)} y total ${formatMoney(preview.totalCents)}. Pago ${paymentMode === 'cash' ? 'al contado' : 'a crédito'}. ${scheduleReview} Se registrará la venta y su efecto financiero.` : 'Revisa los datos de la venta.'} onCancel={() => setConfirming(false)} onConfirm={() => void submit()} title="¿Confirmar la venta?" visible={confirming} />
    <ConfirmationDialog busy={busy} confirmLabel="Salir sin guardar" title="¿Salir de la venta?" message="Los datos en edición todavía no se han guardado. Si sales, perderás este borrador de venta." visible={exitAction !== null} onCancel={()=>setExitAction(null)} onConfirm={confirmExit} />
  </>;
}

function errorMessage(error: unknown) {
  if (error instanceof ApiUnavailableError) return 'No se pudo conectar con el servidor. Reintenta la consulta.';
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : 'La operación no pudo completarse.';
}

const styles = StyleSheet.create({
  installmentFields: {flexGrow:1,flexBasis:400,minWidth:0,maxWidth:'100%'},
  screen: { gap: spacing.xl }, columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, column: { flexBasis: 230, flexGrow: 1 },
  toggle: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, line: { alignItems: 'center', borderTopColor: color.border, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingTop: spacing.md },
  lineTitle: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' }, help: { color: color.textSecondary, ...typography.bodySmall }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' }, metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});

