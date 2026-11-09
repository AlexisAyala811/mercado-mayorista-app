import { CommercialHistoryList, type HistoryListState, type HistoryQuery } from '@/features/history/commercial-history-list';
import { saleCard, type HistoryChip } from '@/domain/shared/history-cards';
import { salesHistorySummary } from '@/services/api/history-api';
import { BottomNavSlots } from '@/ui/navigation/app-chrome';
import {commercialDescription} from '@/domain/catalog/commercial-characteristic';
import { useBrowserTraversalGuard } from '@/navigation/use-browser-traversal-guard';
import { useSyncQueue } from "@/features/sync/sync-queue-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useRouter, useNavigation, type Href } from "expo-router";
import {usePreventRemove} from 'expo-router/react-navigation';
import {
  createOperationId,
  formatMoney,
  moneyInputToCents,
} from "@/domain/reception/reception";
import { formatSaleDate } from "@/domain/sales/sales-history";
import { useSession } from "@/features/auth/session/session-provider";
import {
  getSale,
  listSales,
  type SaleDetail,
} from "@/services/api/sales-api";

import { shareReceipt } from "@/services/receipts/receipt-sharing";
import {
  AppButton,
  AppCard,
  AppScreen,
  ConfirmationDialog,
  FeedbackState,
  FormField,
  LoadingState,
  MetricTile,
  ScreenHeader,
} from "@/ui/components";
import {color,spacing,typography} from "@/ui/tokens";
type LineDraft = { sacks: string; weight: string; gross: string };
// CL-FM14 (spec 011): the business does not use commercial returns, so the
// app hides them; voiding a sale stays available to the Mayorista.
export function SalesHistoryScreen({allowReturns=false}:{allowReturns?:boolean}={}) {
  const {session}=useSession();
  return session?<SalesHistoryWorkspace key={session.accessToken} allowReturns={allowReturns}/>:null;
}
function SalesHistoryWorkspace({allowReturns}:{allowReturns:boolean}) {
  const router = useRouter();
  const navigation=useNavigation();const exitAllowed=useRef(false);
  const [exitAction,setExitAction]=useState<(()=>void)|null>(null);
  const { enqueue, sendQueued } = useSyncQueue();
  const { session } = useSession();
  const token = session?.accessToken ?? "";
  const active=useRef(true);const sharing=useRef(false);const [sharingBusy,setSharingBusy]=useState(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [reason, setReason] = useState("");
  const [freight, setFreight] = useState("0");
  const [action, setAction] = useState<"return" | "void" | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const pendingOperation = useRef<{ id: string; signature: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const [result, setResult] = useState<string | null>(null);
  const [returnReceiptId, setReturnReceiptId] = useState<string | null>(null);
  const [detailStale,setDetailStale]=useState(false);const [refreshError,setRefreshError]=useState<string|null>(null);
  const [refreshing,setRefreshing]=useState(false);const refreshRequest=useRef(0);const refreshingRef=useRef(false);
  const hasUnsavedChanges=Boolean(detail)&&(Boolean(reason.trim())||freight!=='0'||Object.values(drafts).some(line=>line.sacks!=='0'||line.weight!=='0'||line.gross!=='0'));
  const protectExit=Boolean(session)&&(hasUnsavedChanges||busy||sharingBusy);
  const requestExit=useCallback((leave:()=>void)=>{
    if(!active.current||submitting.current||sharing.current||exitAction)return;
    if(hasUnsavedChanges){setAction(null);setExitAction(()=>leave);}else leave();
  },[exitAction,hasUnsavedChanges]);
  usePreventRemove(protectExit,({data})=>{
    if(exitAllowed.current){navigation.dispatch(data.action);return;}
    requestExit(()=>navigation.dispatch(data.action));
  });
  useEffect(()=>{
    if(Platform.OS!=='web'||!protectExit||typeof window==='undefined')return;
    const beforeUnload=(event:BeforeUnloadEvent)=>{if(exitAllowed.current)return;event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);
  },[protectExit]);
  function resetEditableDraft(lines:SaleDetail['lines']=[]){
    setReason('');setFreight('0');setDrafts(Object.fromEntries(lines.map(line=>[line.id,{sacks:'0',weight:'0',gross:'0'}])));
    pendingOperation.current=null;
  }
  function closeDetail(){requestSequence.current++;refreshRequest.current++;refreshingRef.current=false;setRefreshing(false);setDetailStale(false);setRefreshError(null);resetEditableDraft();setDetail(null);setAction(null);setError(null);setResult(null);setReturnReceiptId(null);}
  useBrowserTraversalGuard(protectExit,exitAllowed,requestExit,()=>{
    if(active.current)setError('No se pudo completar la navegación. Inténtalo nuevamente.');
  });
  function confirmExit(){
    if(!active.current||submitting.current||sharing.current||!exitAction)return;
    const leave=exitAction;exitAllowed.current=true;setExitAction(null);closeDetail();leave();
  }
  // Spec 011 (RQ-ST05): the list keeps its search, chip and page while a
  // detail is open, and reloads from the server when it comes back.
  const [listState, setListState] = useState<HistoryListState | undefined>(undefined);
  const loadPage = useCallback(async (query: HistoryQuery, chip: HistoryChip, offset: number) => {
    const value = await listSales(token, { ...query, limit: 20, offset, paymentState: chip === 'all' || chip === 'unsettled' ? undefined : chip });
    return { items: value.items.map((sale) => saleCard(sale, formatSaleDate(sale.createdAt))), total: value.total };
  }, [token]);
  const loadSummary = useCallback((query: HistoryQuery) => salesHistorySummary(token, query), [token]);
  function open(id: string) {
    requestExit(()=>void readSale(id));
  }
  async function readSale(id: string){
    if(!active.current||submitting.current||sharing.current)return;
    exitAllowed.current=false;
    const request = ++requestSequence.current;
    setDetailLoading(true);
    setError(null);
    setReturnReceiptId(null);
    setResult(null);
    try {
      const value = await getSale(token, id);
      if (request !== requestSequence.current) return;
      setDetail(value);
      setDetailStale(false);setRefreshError(null);
      resetEditableDraft(value.lines);
      setAction(null);
    } catch (cause) {
      if (request === requestSequence.current)
        setError(
          cause instanceof Error ? cause.message : "No se pudo abrir la venta.",
        );
    } finally {
      if (request === requestSequence.current) setDetailLoading(false);
    }
  }

  function update(id: string, field: keyof LineDraft, value: string) {
    if(submitting.current||sharing.current||action||exitAction||detailStale)return;
    setDrafts((all) => ({ ...all, [id]: { ...all[id], [field]: value } }));
  }
  function operationId(payload: unknown) {
    const signature = JSON.stringify(payload);
    if (
      pendingOperation.current &&
      pendingOperation.current.signature !== signature
    )
      throw new Error(
        "Existe una operación sin respuesta definitiva. Reintenta con los mismos datos antes de modificarlos.",
      );
    pendingOperation.current ??= { id: createOperationId(), signature };
    return pendingOperation.current.id;
  }
  async function confirm() {
    if (!active.current||submitting.current||sharing.current||detailStale) return;
    if (!detail || !action || !reason.trim()) {
      setError("Indica el motivo.");
      setAction(null);
      return;
    }
    submitting.current = true;
    setBusy(true);
    let saved = false;
    try {
      setError(null);
      let outgoing: { id: string; path: string; body: unknown; type: string };
      if (action === "void") {
        const body = {
          clientOperationId: operationId({
            type: "void",
            saleId: detail.sale.id,
            version: detail.sale.version,
            reason,
          }),
          expectedSaleVersion: detail.sale.version,
          reason,
        };
        outgoing = {
          id: body.clientOperationId,
          path: "/sales/" + detail.sale.id + "/void",
          body,
          type: "sale.void",
        };
      } else {
        const freightCents = moneyInputToCents(freight);
        if (freightCents === null) {
          setError(
            "Ingresa un ajuste de flete válido, con un máximo de dos decimales.",
          );
          setAction(null);
          return;
        }
        const lines = detail.lines
          .map((line) => ({
            saleLineId: line.id,
            sacks: Number(drafts[line.id]?.sacks ?? 0),
            weightKg: (drafts[line.id]?.weight ?? "0").replace(",", "."),
            authorizedGrossCents:
              moneyInputToCents(drafts[line.id]?.gross ?? "0") ?? 0,
          }))
          .filter((x) => x.sacks > 0 || Number(x.weightKg) > 0);
        if (
          !lines.length ||
          lines.some(
            (x) =>
              x.authorizedGrossCents < 1 ||
              !Number.isSafeInteger(x.sacks) ||
              x.sacks < 0 ||
              !/^\d+(?:\.\d{1,3})?$/.test(x.weightKg),
          )
        ) {
          setError(
            "Registra una línea devuelta con sacos enteros, peso válido e importe autorizado.",
          );
          setAction(null);
          return;
        }
        const body = {
          clientOperationId: operationId({
            type: "return",
            saleId: detail.sale.id,
            version: detail.sale.version,
            freightCents,
            lines,
            reason,
          }),
          expectedSaleVersion: detail.sale.version,
          freightAdjustmentCents: freightCents,
          lines,
          reason,
        };
        outgoing = {
          id: body.clientOperationId,
          path: "/sales/" + detail.sale.id + "/commercial-returns",
          body,
          type: "sale.return",
        };
      }
      await enqueue({ ...outgoing, method: "POST" });
      saved = true;
      pendingOperation.current = null;
      if(!active.current)return;
      resetEditableDraft(detail.lines);
      const outcome = await sendQueued(outgoing.id);
      if(!active.current)return;
      setAction(null);
      if (outcome.status !== "confirmed") {
        router.push("/sync-queue" as Href);
        return;
      }
      saved = false;
      setReturnReceiptId(
        action === "return" ? (outcome.centralReference ?? null) : null,
      );
      setResult(
        action === "return"
          ? "Devolución confirmada. El comprobante contiene el importe autorizado."
          : "Venta anulada. Se conservaron los movimientos compensatorios.",
      );
      setReason("");
      setDetailStale(true);
      await refreshConfirmedDetail(detail.sale.id);
    } catch (cause) {
      if(!active.current)return;
      setAction(null);
      if (saved) {
        router.push("/sync-queue" as Href);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo conservar la operación. No se envió al servidor.",
      );
    } finally {
      submitting.current = false;
      if(active.current)setBusy(false);
    }
  }
  async function refreshConfirmedDetail(saleId:string){
    if(!active.current||refreshingRef.current)return;
    const request=++refreshRequest.current;refreshingRef.current=true;setRefreshing(true);setRefreshError(null);
    try{
      const value=await getSale(token,saleId);
      if(!active.current||request!==refreshRequest.current)return;
      setDetail(value);setDetailStale(false);
    }catch(cause){if(active.current&&request===refreshRequest.current)setRefreshError(cause instanceof Error?cause.message:'No se pudo actualizar el detalle confirmado.');}
    finally{if(active.current&&request===refreshRequest.current){refreshingRef.current=false;setRefreshing(false);}}
  }
  async function shareReturn(){
    if(!active.current||submitting.current||sharing.current||!returnReceiptId)return;
    sharing.current=true;setSharingBusy(true);setError(null);
    try{await shareReceipt('sale-returns',returnReceiptId,token,()=>active.current);}
    catch(cause){if(active.current)setError(cause instanceof Error?cause.message:'No se pudo compartir el comprobante.');}
    finally{sharing.current=false;if(active.current)setSharingBusy(false);}
  }
  if (!session) return null;
  if (detailLoading)
    return (
      <AppScreen
        contentContainerStyle={{ justifyContent: "center" }}
        scrollable={false}
      >
        <LoadingState label="Cargando ventas" />
      </AppScreen>
    );
  if (detail)
    return (
      <>
        <AppScreen contentContainerStyle={styles.screen}>
          <BottomNavSlots back={{ label: "Atrás", accessibilityLabel: "Volver al historial", disabled: busy||sharingBusy||Boolean(exitAction), onPress: () => requestExit(closeDetail) }} />
          <ScreenHeader
            eyebrow="VENTAS"
            title={allowReturns?"Detalle y devoluciones":"Detalle de la venta"}
            description={`${detail.sale.buyerName ?? "Comprador registrado"} · ${detail.sale.destinationDepartment} · ${formatSaleDate(detail.sale.createdAt)}`}
          />
          {error ? (
            <FeedbackState
              title="Revisa la operación"
              message={error}
              tone="error"
            />
          ) : null}
          {result ? (
            <FeedbackState
              title="Operación confirmada"
              message={result}
              tone="success"
            />
          ) : null}
          {detailStale?<FeedbackState title="Detalle pendiente de actualización" message={refreshError?`La operación ya está confirmada. El detalle muestra una versión anterior. ${refreshError}`:'La operación ya está confirmada; estamos recuperando su detalle actualizado.'} tone="warning" actionLabel={refreshError?'Reintentar consulta del detalle':undefined} onAction={refreshError?()=>{if(!busy&&!refreshingRef.current&&detail)void refreshConfirmedDetail(detail.sale.id);}:undefined}/>:null}
          {refreshing?<LoadingState label="Actualizando detalle confirmado"/>:null}
          {returnReceiptId ? (
            <AppCard
              title="Comprobante de devolución"
              description="El PDF quedó disponible para descargar o compartir."
            >
              <AppButton
                label="Compartir comprobante"
                disabled={busy||sharingBusy}
                onPress={()=>void shareReturn()}
              />
            </AppCard>
          ) : null}
          <View style={styles.metrics}>
            <MetricTile
              label="Total"
              value={formatMoney(detail.sale.totalAmountCents)}
            />
            <MetricTile
              label="Estado"
              value={
                detail.sale.state === "confirmed" ? "Confirmada" : "Anulada"
              }
            />
            <MetricTile label="Versión" value={String(detail.sale.version)} />
          </View>
          <FormField editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale} label="Motivo" onChangeText={value=>{if(!submitting.current&&!sharing.current&&!action&&!exitAction&&!detailStale)setReason(value);}} value={reason} />
          {allowReturns?<FormField
            editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale}
            keyboardType="decimal-pad"
            label="Ajuste de flete (S/)"
            onChangeText={value=>{if(!submitting.current&&!sharing.current&&!action&&!exitAction&&!detailStale)setFreight(value);}}
            value={freight}
          />:null}
          {detail.lines.map((line, index) => (
            <AppCard
              key={line.id}
              title={`Línea ${index + 1}`}
              description={`${line.sacks} sacos · ${line.weightKg} kg · ${formatMoney(line.subtotalCents)}`}
            >
              <Text style={styles.characteristics}>{commercialDescription(line)}</Text>
              {allowReturns?<View style={styles.columns}>
                <View style={styles.field}>
                  <FormField
                    editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale}
                    keyboardType="number-pad"
                    label="Sacos devueltos"
                    onChangeText={(v) => update(line.id, "sacks", v)}
                    value={drafts[line.id]?.sacks}
                  />
                </View>
                <View style={styles.field}>
                  <FormField
                    editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale}
                    keyboardType="decimal-pad"
                    label="Peso devuelto"
                    onChangeText={(v) => update(line.id, "weight", v)}
                    value={drafts[line.id]?.weight}
                  />
                </View>
                <View style={styles.field}>
                  <FormField
                    editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale}
                    keyboardType="decimal-pad"
                    label="Importe bruto autorizado (S/)"
                    onChangeText={(v) => update(line.id, "gross", v)}
                    value={drafts[line.id]?.gross}
                  />
                </View>
              </View>:null}
            </AppCard>
          ))}
          <View style={styles.actions}>
            {allowReturns?<AppButton
              disabled={busy || sharingBusy || Boolean(exitAction) || detailStale || detail.sale.state !== "confirmed"}
              label="Confirmar devolución comercial"
              onPress={() => setAction("return")}
            />:null}
            <AppButton
              disabled={busy || sharingBusy || Boolean(exitAction) || detailStale || detail.sale.state !== "confirmed"}
              label="Anular venta"
              onPress={() => setAction("void")}
              tone="secondary"
            />
          </View>
        </AppScreen>
        <ConfirmationDialog
          busy={busy}
          confirmLabel={
            action === "void" ? "Anular venta" : "Confirmar devolución"
          }
          message={
            action === "void"
              ? "Se crearán movimientos compensatorios; el historial original se conservará."
              : "Se compensará la cuenta o caja y se invalidará el PDF vigente."
          }
          onCancel={() => setAction(null)}
          onConfirm={() => {
            if (!submitting.current) void confirm();
          }}
          title={
            action === "void"
              ? "¿Anular la venta?"
              : "¿Confirmar devolución comercial?"
          }
          visible={Boolean(action)}
        />
        <ConfirmationDialog title="¿Descartar la edición de esta venta?" message={allowReturns?"El motivo y los datos de devolución en edición se perderán. La venta y las operaciones ya conservadas en la cola no cambian.":"El motivo en edición se perderá. La venta y las operaciones ya conservadas en la cola no cambian."} confirmLabel="Descartar edición" visible={exitAction!==null} onCancel={()=>setExitAction(null)} onConfirm={confirmExit}/>
      </>
    );
  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <ScreenHeader eyebrow="VENTA · VENTAS COBRADAS Y CON DEUDA" title="Ver ventas" />
      {error ? <FeedbackState title="No se pudo abrir la venta" message={error} tone="error" /> : null}
      <CommercialHistoryList
        kind="sale"
        disabled={busy}
        initial={listState}
        onStateChange={setListState}
        loadPage={loadPage}
        loadSummary={loadSummary}
        onOpen={(card) => open(card.id)}
        onSettle={(card) => router.push({ pathname: '/collections', params: { sourceId: card.sourceId ?? '' } } as Href)}
      />
    </AppScreen>
  );
}
const styles = StyleSheet.create({
  characteristics:{color:color.textSecondary,...typography.bodySmall},
  screen: { gap: spacing.xl },
  top: { flexDirection: "row", justifyContent: "space-between" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  columns: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  field: { flexBasis: 220, flexGrow: 1 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
  filterActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
