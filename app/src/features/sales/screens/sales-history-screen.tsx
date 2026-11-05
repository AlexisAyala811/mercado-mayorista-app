import { backOrHome } from "@/navigation/back-or-home";
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
import type { Sale } from "@/domain/sales/sale";
import {
  emptySalesHistoryFilters,
  formatSaleDate,
  salesHistoryQuery,
  validateSalesHistoryFilters,
  type SalesHistoryFilters,
} from "@/domain/sales/sales-history";
import { useSession } from "@/features/auth/session/session-provider";
import {
  getSale,
  listSales,
  type SaleDetail,
  type SalesHistoryQuery,
} from "@/services/api/sales-api";

import { shareReceipt } from "@/services/receipts/receipt-sharing";
import {
  AppButton,
  AppCard,
  AppScreen,
  ConfirmationDialog,
  EmptyState,
  FeedbackState,
  FormField,
  LoadingState,
  MetricTile,
  ScreenHeader,
} from "@/ui/components";
import {color,spacing,typography} from "@/ui/tokens";
type LineDraft = { sacks: string; weight: string; gross: string };
export function SalesHistoryScreen() {
  const {session}=useSession();
  return session?<SalesHistoryWorkspace key={session.accessToken}/>:null;
}
function SalesHistoryWorkspace() {
  const router = useRouter();
  const navigation=useNavigation();const exitAllowed=useRef(false);
  const [exitAction,setExitAction]=useState<(()=>void)|null>(null);
  const { enqueue, sendQueued } = useSyncQueue();
  const { session } = useSession();
  const token = session?.accessToken ?? "";
  const active=useRef(true);const sharing=useRef(false);const [sharingBusy,setSharingBusy]=useState(false);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [detail, setDetail] = useState<SaleDetail | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LineDraft>>({});
  const [reason, setReason] = useState("");
  const [freight, setFreight] = useState("0");
  const [action, setAction] = useState<"return" | "void" | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState(emptySalesHistoryFilters);
  const [appliedQuery, setAppliedQuery] = useState<SalesHistoryQuery>({});
  const [pageOffset, setPageOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [listLoaded, setListLoaded] = useState(false);
  const requestSequence = useRef(0);
  const lastRequest = useRef<{ query: SalesHistoryQuery; offset: number }>({
    query: {},
    offset: 0,
  });
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const pendingOperation = useRef<{ id: string; signature: string } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [canRetryQuery, setCanRetryQuery] = useState(false);
  const invalidateRequests = useCallback(() => {
    requestSequence.current++;
  }, []);
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
  const pageSize = 20;
  const applyPage = useCallback(
    (
      value: Awaited<ReturnType<typeof listSales>>,
      query: SalesHistoryQuery,
      offset: number,
    ) => {
      setSales(value.items);
      setTotal(value.total);
      setAppliedQuery(query);
      setPageOffset(offset);
      setListLoaded(true);
    },
    [],
  );
  async function load(
    query: SalesHistoryQuery = appliedQuery,
    offset = pageOffset,
  ) {
    const request = ++requestSequence.current;
    lastRequest.current = { query, offset };
    setLoading(true);
    setCanRetryQuery(false);
    setError(null);
    setSales([]);
    setListLoaded(false);
    try {
      let value = await listSales(token, {
        ...query,
        limit: pageSize,
        offset,
      });
      if (request !== requestSequence.current) return;
      // A concurrent cancellation can remove the last filtered page.
      // Return to the first page once, preserving the user's criteria.
      if (offset > 0 && value.items.length === 0) {
        offset = 0;
        lastRequest.current = { query, offset };
        value = await listSales(token, { ...query, limit: pageSize, offset });
      }
      if (request === requestSequence.current) applyPage(value, query, offset);
    } catch (cause) {
      if (request === requestSequence.current) {
        setCanRetryQuery(true);
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las ventas.",
        );
      }
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    const request = ++requestSequence.current;
    listSales(token, { limit: 20, offset: 0 })
      .then((value) => {
        if (request === requestSequence.current) applyPage(value, {}, 0);
      })
      .catch((cause) => {
        if (request === requestSequence.current) {
          setCanRetryQuery(true);
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las ventas.",
          );
        }
      })
      .finally(() => {
        if (request === requestSequence.current) setLoading(false);
      });
    return invalidateRequests;
  }, [applyPage, invalidateRequests, token]);
  function changeFilter<Key extends keyof SalesHistoryFilters>(
    key: Key,
    value: SalesHistoryFilters[Key],
  ) {
    invalidateRequests();
    setCanRetryQuery(false);
    setFilters((current) => ({ ...current, [key]: value }));
    setSales([]);
    setTotal(0);
    setListLoaded(false);
    setLoading(false);
    setError(null);
  }
  function search() {
    const issue = validateSalesHistoryFilters(filters);
    if (issue) {
      setCanRetryQuery(false);
      setError(issue);
      return;
    }
    void load(salesHistoryQuery(filters), 0);
  }
  function clearFilters() {
    setFilters(emptySalesHistoryFilters());
    void load({}, 0);
  }
  async function open(sale: Sale) {
    requestExit(()=>void readSale(sale));
  }
  async function readSale(sale:Sale){
    if(!active.current||submitting.current||sharing.current)return;
    exitAllowed.current=false;
    const request = ++requestSequence.current;
    setDetailLoading(true);
    setCanRetryQuery(false);
    setError(null);
    setReturnReceiptId(null);
    setResult(null);
    try {
      const value = await getSale(token, sale.id);
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
      setDetail(value);setDetailStale(false);await load();
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
          <View style={styles.top}>
            <AppButton
              label="Volver al historial"
              disabled={busy||sharingBusy||Boolean(exitAction)}
              onPress={() => requestExit(closeDetail)}
              tone="secondary"
            />
          </View>
          <ScreenHeader
            eyebrow="VENTAS"
            title="Detalle y devoluciones"
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
          <FormField
            editable={!busy&&!sharingBusy&&!action&&!exitAction&&!detailStale}
            keyboardType="decimal-pad"
            label="Ajuste de flete (S/)"
            onChangeText={value=>{if(!submitting.current&&!sharing.current&&!action&&!exitAction&&!detailStale)setFreight(value);}}
            value={freight}
          />
          {detail.lines.map((line, index) => (
            <AppCard
              key={line.id}
              title={`Línea ${index + 1}`}
              description={`${line.sacks} sacos · ${line.weightKg} kg · ${formatMoney(line.subtotalCents)}`}
            >
              <Text style={styles.characteristics}>{commercialDescription(line)}</Text>
              <View style={styles.columns}>
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
              </View>
            </AppCard>
          ))}
          <View style={styles.actions}>
            <AppButton
              disabled={busy || sharingBusy || Boolean(exitAction) || detailStale || detail.sale.state !== "confirmed"}
              label="Confirmar devolución comercial"
              onPress={() => setAction("return")}
            />
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
        <ConfirmationDialog title="¿Descartar la edición de esta venta?" message="El motivo y los datos de devolución en edición se perderán. La venta y las operaciones ya conservadas en la cola no cambian." confirmLabel="Descartar edición" visible={exitAction!==null} onCancel={()=>setExitAction(null)} onConfirm={confirmExit}/>
      </>
    );
  return (
    <AppScreen contentContainerStyle={styles.screen}>
      <View style={styles.top}>
        <AppButton
          label="Volver"
          onPress={() => backOrHome(router)}
          tone="secondary"
        />
        <AppButton
          disabled={loading || busy}
          label="Actualizar"
          onPress={search}
          tone="secondary"
        />
      </View>
      <ScreenHeader
        eyebrow="VENTAS"
        title="Historial de ventas"
        description="Busca ventas y despachos por fecha o comprador. Fechas del registro central en hora de Lima."
      />
      <AppCard title="Buscar operaciones">
        <View style={styles.columns}>
          <View style={styles.field}>
            <FormField
              label="Desde"
              placeholder="aaaa-mm-dd"
              value={filters.from}
              onChangeText={(value) => changeFilter("from", value)}
            />
          </View>
          <View style={styles.field}>
            <FormField
              label="Hasta"
              placeholder="aaaa-mm-dd"
              value={filters.to}
              onChangeText={(value) => changeFilter("to", value)}
            />
          </View>
          <View style={styles.field}>
            <FormField
              label="Participante comercial"
              placeholder="Nombre del comprador"
              value={filters.search}
              onChangeText={(value) => changeFilter("search", value)}
            />
          </View>
        </View>
        <View style={styles.filterActions}>
          {(
            [
              ["all", "Todas"],
              ["confirmed", "Confirmadas"],
              ["voided", "Anuladas"],
            ] as const
          ).map(([state, label]) => (
            <AppButton
              key={state}
              label={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: filters.state === state }}
              onPress={() => changeFilter("state", state)}
              tone={filters.state === state ? "primary" : "secondary"}
            />
          ))}
        </View>
        <View style={styles.filterActions}>
          <AppButton label="Buscar" onPress={search} />
          <AppButton
            label="Limpiar filtros"
            onPress={clearFilters}
            tone="secondary"
          />
        </View>
      </AppCard>
      {error ? (
        <FeedbackState
          title="No se pudo completar"
          message={error}
          tone="error"
          actionLabel={canRetryQuery ? "Reintentar consulta" : undefined}
          onAction={() =>
            void load(lastRequest.current.query, lastRequest.current.offset)
          }
        />
      ) : null}
      {loading ? (
        <LoadingState label="Consultando historial de ventas" />
      ) : null}
      {!loading && listLoaded ? (
        <Text accessibilityLiveRegion="polite">
          {total
            ? `${pageOffset + 1}–${pageOffset + sales.length} de ${total} operaciones`
            : "0 operaciones"}{" "}
          · {appliedQuery.from ?? "Sin inicio"} /{" "}
          {appliedQuery.to ?? "Sin límite"} ·{" "}
          {appliedQuery.search ?? "Todos los compradores"}
        </Text>
      ) : null}
      {!loading &&
        sales.map((sale) => (
          <AppCard
            key={sale.id}
            title={`${sale.buyerName ?? "Comprador registrado"} · ${formatMoney(sale.totalAmountCents)}`}
            description={`${sale.destinationDepartment} · ${formatSaleDate(sale.createdAt)} · ${sale.state === "confirmed" ? "Confirmada" : "Anulada"}`}
          >
            <AppButton
              label="Abrir detalle"
              accessibilityLabel={`Abrir detalle de venta de ${sale.buyerName ?? 'comprador registrado'}, ${formatSaleDate(sale.createdAt)}, operación ${sale.id}`}
              onPress={() => void open(sale)}
              tone="secondary"
            />
          </AppCard>
        ))}
      {!loading && !error && !sales.length ? (
        <EmptyState
          title={listLoaded ? "Sin resultados" : "Aplica los filtros"}
          message={
            listLoaded
              ? "No hay ventas que coincidan con esta búsqueda."
              : "Pulsa Buscar para consultar el historial con estos criterios."
          }
        />
      ) : null}
      {!loading && listLoaded && total > pageSize ? (
        <View style={styles.filterActions}>
          <AppButton
            label="Página anterior"
            disabled={pageOffset === 0}
            onPress={() =>
              void load(appliedQuery, Math.max(0, pageOffset - pageSize))
            }
            tone="secondary"
          />
          <AppButton
            label="Página siguiente"
            disabled={pageOffset + sales.length >= total}
            onPress={() => void load(appliedQuery, pageOffset + pageSize)}
            tone="secondary"
          />
        </View>
      ) : null}
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
