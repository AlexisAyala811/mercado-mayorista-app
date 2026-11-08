import { BottomNavSlots } from '@/ui/navigation/app-chrome';
import { paymentStatusView, receptionsWithPayment } from "@/domain/reception/payment-status";
import { formatKilograms, kilogramsDraft, validateSackWeights } from "@/domain/reception/whole-kilograms";
import { freightLabel, SettlementLotList } from "@/features/reception/components/settlement-lot-list";
import {commercialDescription} from '@/domain/catalog/commercial-characteristic';
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import {
  createOperationId,
  formatMoney,
  type PurchaseSettlement,
  type Reception,
  type ReceptionSack,
} from "@/domain/reception/reception";
import { useSession } from "@/features/auth/session/session-provider";
import {
  getPurchaseSettlement,
  getReception,
  getSacks,
  listReceptions,
  getPurchasePaymentStatus,
  type PurchasePaymentStatus,
  type ReceptionsHistoryQuery,
} from "@/services/api/reception-api";
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
import { color, radius, spacing, typography } from "@/ui/tokens";

import { useSyncQueue } from "@/features/sync/sync-queue-provider";

import {
  emptyReceptionsHistoryFilters,
  receptionsHistoryQuery,
  validateReceptionsHistoryFilters,
  type ReceptionsHistoryFilters,
} from "@/domain/reception/receptions-history";

type Action =
  "void-reception" | "void-purchase" | "void-sack" | "correct-sack" | null;

export function PurchaseHistoryScreen() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.accessToken ?? "";
  const [receptions, setReceptions] = useState<Reception[]>([]);
  // Spec 011 (CL-MD05): server payment state per reception, or 'unavailable' offline.
  const [paymentStatus, setPaymentStatus] = useState<Map<string, PurchasePaymentStatus> | 'unavailable' | null>(null);
  const [reception, setReception] = useState<Reception | null>(null);
  const [sacks, setSacks] = useState<ReceptionSack[]>([]);
  const [settlement, setSettlement] = useState<PurchaseSettlement | null>(null);
  const [sack, setSack] = useState<ReceptionSack | null>(null);
  const [gross, setGross] = useState("");
  const [tare, setTare] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const { enqueue, sendQueued } = useSyncQueue();
  const submitting = useRef(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  const [filters, setFilters] = useState(emptyReceptionsHistoryFilters);
  const [appliedQuery, setAppliedQuery] = useState<ReceptionsHistoryQuery>({});
  const [pageOffset, setPageOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [listLoaded, setListLoaded] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [canRetryQuery, setCanRetryQuery] = useState(false);
  const requestSequence = useRef(0);
  const lastRequest = useRef<{ query: ReceptionsHistoryQuery; offset: number }>(
    { query: {}, offset: 0 },
  );
  const invalidateRequests = useCallback(() => {
    requestSequence.current++;
  }, []);
  const pageSize = 20;
  const applyPage = useCallback(
    (
      value: Awaited<ReturnType<typeof listReceptions>>,
      query: ReceptionsHistoryQuery,
      offset: number,
    ) => {
      setReceptions(value.items);
      setPaymentStatus(null);
      const ids = receptionsWithPayment(value.items);
      const request = requestSequence.current;
      if (ids.length)
        getPurchasePaymentStatus(token, ids)
          .then((items) => { if (request === requestSequence.current) setPaymentStatus(new Map(items.map((item) => [item.receptionId, item]))); })
          .catch(() => { if (request === requestSequence.current) setPaymentStatus('unavailable'); });
      setTotal(value.total);
      setAppliedQuery(query);
      setPageOffset(offset);
      setListLoaded(true);
    },
    [token],
  );
  async function loadList(
    query: ReceptionsHistoryQuery = appliedQuery,
    offset = pageOffset,
  ) {
    const request = ++requestSequence.current;
    lastRequest.current = { query, offset };
    setLoading(true);
    setError(null);
    setCanRetryQuery(false);
    setReceptions([]);
    setListLoaded(false);
    try {
      let value = await listReceptions(token, {
        ...query,
        limit: pageSize,
        offset,
      });
      if (request !== requestSequence.current) return;
      if (offset > 0 && !value.items.length) {
        offset = 0;
        lastRequest.current = { query, offset };
        value = await listReceptions(token, {
          ...query,
          limit: pageSize,
          offset,
        });
      }
      if (request === requestSequence.current) applyPage(value, query, offset);
    } catch (cause) {
      if (request === requestSequence.current) {
        setCanRetryQuery(true);
        setError(
          cause instanceof Error
            ? cause.message
            : "No se pudieron cargar las recepciones.",
        );
      }
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    const request = ++requestSequence.current;
    listReceptions(token, { limit: 20, offset: 0 })
      .then((value) => {
        if (request === requestSequence.current) applyPage(value, {}, 0);
      })
      .catch((cause) => {
        if (request === requestSequence.current) {
          setCanRetryQuery(true);
          setError(
            cause instanceof Error
              ? cause.message
              : "No se pudieron cargar las recepciones.",
          );
        }
      })
      .finally(() => {
        if (request === requestSequence.current) setLoading(false);
      });
    return invalidateRequests;
  }, [applyPage, invalidateRequests, token]);
  function changeFilter<Key extends keyof ReceptionsHistoryFilters>(
    key: Key,
    value: ReceptionsHistoryFilters[Key],
  ) {
    invalidateRequests();
    setFilters((current) => ({ ...current, [key]: value }));
    setReceptions([]);
    setTotal(0);
    setListLoaded(false);
    setLoading(false);
    setError(null);
    setCanRetryQuery(false);
  }
  function search() {
    const message = validateReceptionsHistoryFilters(filters);
    if (message) {
      setError(message);
      setCanRetryQuery(false);
      return;
    }
    void loadList(receptionsHistoryQuery(filters), 0);
  }
  function clearFilters() {
    const next = emptyReceptionsHistoryFilters();
    setFilters(next);
    void loadList(receptionsHistoryQuery(next), 0);
  }

  async function readDetail(id: string) {
    const [current, bagRows] = await Promise.all([
      getReception(token, id),
      getSacks(token, id),
    ]);
    const purchase =
      current.state === "settled"
        ? await getPurchaseSettlement(token, id)
        : null;
    setReception(current);
    setSacks(bagRows);
    setSettlement(purchase);
    setNeedsRefresh(false);
  }
  async function open(value: Reception) {
    invalidateRequests();
    setDetailLoading(true);
    setError(null);
    setSuccess(null);
    setCanRetryQuery(false);
    try {
      await readDetail(value.id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo abrir la recepción.",
      );
    } finally {
      setDetailLoading(false);
    }
  }
  async function retryDetail() {
    if (!reception || busy) return;
    setBusy(true);
    setError(null);
    try {
      await readDetail(reception.id);
      await loadList();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la recepción.",
      );
    } finally {
      setBusy(false);
    }
  }
  function chooseSack(
    value: ReceptionSack,
    next: Exclude<Action, "void-reception" | "void-purchase" | null>,
  ) {
    setSack(value);
    setGross(kilogramsDraft(value.grossWeightKg));
    setTare(kilogramsDraft(value.tareKg));
    setReason("");
    setAction(next);
  }
  async function confirm() {
    if (submitting.current || needsRefresh) return;
    if (!reception || !action || !reason.trim()) {
      setReviewing(false);
      setError("Indica el motivo de la operación.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setReviewing(false);
    setError(null);
    setSuccess(null);
    let saved = false;
    try {
      const id = createOperationId();
      const base = {
        clientOperationId: id,
        expectedReceptionVersion: reception.version,
        reason: reason.trim(),
      };
      let input: {
        id: string;
        type: string;
        path: string;
        method: "POST" | "PATCH";
        body: unknown;
      };
      if (action === "void-reception")
        input = {
          id,
          type: "reception.void",
          path: `/receptions/${reception.id}/void`,
          method: "POST",
          body: base,
        };
      else if (action === "void-purchase" && settlement)
        input = {
          id,
          type: "purchase.void",
          path: `/purchases/${settlement.id}/void`,
          method: "POST",
          body: { ...base, expectedPurchaseVersion: settlement.version },
        };
      else if (action === "void-sack" && sack)
        input = {
          id,
          type: "reception.sack-void",
          path: `/receptions/${reception.id}/sacks/${sack.id}/void`,
          method: "POST",
          body: base,
        };
      else if (action === "correct-sack" && sack) {
        // Spec 011 (T1121): corrections are also captured in whole kilograms.
        const weights = validateSackWeights(gross, tare);
        if (!weights.ok) throw new Error(weights.message);
        const grossValue = weights.value.grossWeightKg;
        const tareValue = weights.value.tareKg;
        const openWeighing =
          reception.state === "draft" || reception.state === "weighing";
        const body = {
          clientOperationId: id,
          expectedReceptionVersion: reception.version,
          grossWeightKg: grossValue,
          tareKg: tareValue,
          varietyId: sack.varietyId,
          ...(openWeighing ? {} : { reason: reason.trim() }),
        };
        input = {
          id,
          type: "reception.sack-correct",
          path: `/receptions/${reception.id}/sacks/${sack.id}${openWeighing ? "" : "/correct-closed"}`,
          method: openWeighing ? "PATCH" : "POST",
          body,
        };
      } else
        throw new Error(
          "Vuelve a seleccionar la operación y su detalle vigente.",
        );
      await enqueue(input);
      saved = true;
      const outcome = await sendQueued(id);
      if (outcome.status !== "confirmed") {
        setAction(null);
        router.push("/sync-queue" as Href);
        return;
      }
      saved = false;
      setNeedsRefresh(true);
      setSuccess(
        action === "correct-sack"
          ? "Corrección registrada."
          : "Anulación registrada con sus efectos compensatorios.",
      );
      setAction(null);
      setSack(null);
      setReason("");
      await readDetail(reception.id);
      await loadList();
    } catch (cause) {
      if (saved) {
        setAction(null);
        router.push("/sync-queue" as Href);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar la operación.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (!session || session.user.role !== "wholesaler") return null;
  if (detailLoading)
    return (
      <AppScreen contentContainerStyle={styles.center} scrollable={false}>
        <LoadingState label="Cargando detalle de compra" />
      </AppScreen>
    );
  if (!reception)
    return (
      <AppScreen contentContainerStyle={styles.screen}>
        <ScreenHeader
          eyebrow="COMPRAS"
          title="Historial de recepciones"
          description="Busca compras y pesajes por fecha de recepción o proveedor. Consulta el detalle y sus correcciones trazables."
        />
        <View style={styles.top}><AppButton label="Actualizar" disabled={loading} onPress={search} tone="secondary" /></View>
        <AppCard title="Buscar operaciones">
          <View style={styles.filterFields}>
            <View style={styles.filterField}>
              <FormField
                label="Desde"
                placeholder="aaaa-mm-dd"
                value={filters.from}
                onChangeText={(value) => changeFilter("from", value)}
              />
            </View>
            <View style={styles.filterField}>
              <FormField
                label="Hasta"
                placeholder="aaaa-mm-dd"
                value={filters.to}
                onChangeText={(value) => changeFilter("to", value)}
              />
            </View>
            <View style={styles.filterField}>
              <FormField
                label="Participante comercial"
                placeholder="Nombre del proveedor"
                value={filters.search}
                onChangeText={(value) => changeFilter("search", value)}
              />
            </View>
          </View>
          <View style={styles.filterActions}>
            {(
              [
                "all",
                "draft",
                "weighing",
                "weighed",
                "settled",
                "voided",
              ] as const
            ).map((state) => (
              <AppButton
                key={state}
                label={state === "all" ? "Todas" : stateName(state)}
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
              void loadList(
                lastRequest.current.query,
                lastRequest.current.offset,
              )
            }
          />
        ) : null}
        {loading ? (
          <LoadingState label="Consultando historial de compras" />
        ) : null}
        {!loading && listLoaded ? (
          <Text accessibilityLiveRegion="polite">
            {total
              ? `${pageOffset + 1}–${pageOffset + receptions.length} de ${total} operaciones`
              : "0 operaciones"}{" "}
            · {appliedQuery.from ?? "Sin inicio"} /{" "}
            {appliedQuery.to ?? "Sin límite"} ·{" "}
            {appliedQuery.search ?? "Todos los proveedores"}
          </Text>
        ) : null}
        {!loading &&
          receptions.map((item) => (
            <AppCard
              key={item.id}
              title={`${item.providerName ?? "Proveedor registrado"} · ${item.receivedOn}`}
              description={`${stateName(item.state)} · ${item.driverName} · versión ${item.version}`}
            >
              <PaymentStatusLine reception={item} status={paymentStatus} />
              <AppButton
                label="Abrir detalle"
                accessibilityLabel={`Abrir detalle de compra de ${item.providerName ?? 'proveedor registrado'}, ${item.receivedOn}, operación ${item.id}`}
                onPress={() => void open(item)}
                tone="secondary"
              />
            </AppCard>
          ))}
        {!loading && !error && !receptions.length ? (
          <EmptyState
            title={listLoaded ? "Sin resultados" : "Aplica los filtros"}
            message={
              listLoaded
                ? "No hay recepciones que coincidan con esta búsqueda."
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
                void loadList(appliedQuery, Math.max(0, pageOffset - pageSize))
              }
              tone="secondary"
            />
            <AppButton
              label="Página siguiente"
              disabled={pageOffset + receptions.length >= total}
              onPress={() => void loadList(appliedQuery, pageOffset + pageSize)}
              tone="secondary"
            />
          </View>
        ) : null}
      </AppScreen>
    );

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen}>
        <BottomNavSlots back={{ label: "Atrás", accessibilityLabel: "Volver al historial", onPress: () => { setReception(null); setSettlement(null); } }} />
        <ScreenHeader
          eyebrow="COMPRAS"
          title="Detalle de recepción"
          description={`${reception.providerName ?? "Proveedor registrado"} · ${reception.receivedOn} · ${reception.driverName}. Las correcciones conservan trazabilidad.`}
        />
        {error ? (
          <FeedbackState
            title="Revisa la operación"
            message={error}
            tone="error"
          />
        ) : null}
        {success ? (
          <FeedbackState
            title="Operación confirmada"
            message={success}
            tone="success"
          />
        ) : null}
        {needsRefresh ? (
          <FeedbackState
            title="Detalle pendiente de actualizar"
            message="La operación está confirmada. Actualiza el detalle antes de registrar otra."
            actionLabel="Reintentar consulta de recepción"
            onAction={() => void retryDetail()}
          />
        ) : null}
        {["draft", "weighing", "weighed"].includes(reception.state) ? (
          <AppButton
            disabled={busy || needsRefresh}
            label={
              reception.state === "weighed"
                ? "Continuar liquidación"
                : "Continuar pesaje"
            }
            onPress={() =>
              router.push({
                pathname: "/purchase-flow",
                params: { receptionId: reception.id },
              } as Href)
            }
          />
        ) : null}
        <View style={styles.metrics}>
          <MetricTile label="Estado" value={stateName(reception.state)} />
          <MetricTile label="Versión" value={String(reception.version)} />
          <MetricTile
            label="Sacos vigentes"
            value={String(sacks.filter((item) => !item.voidedAt).length)}
          />
          {settlement ? (
            <MetricTile
              label="Liquidación"
              value={formatMoney(settlement.liquidAmountCents)}
            />
          ) : null}
        </View>
        {settlement ? (
          <AppCard title={settlement.state === "voided" ? "Liquidación anulada" : "Liquidación"}>
            <SettlementLotList settlement={settlement} />
            <View style={styles.metrics}>
              <MetricTile label="Importe bruto" value={formatMoney(settlement.grossAmountCents)} />
              <MetricTile label={freightLabel(settlement)} value={formatMoney(settlement.freightAmountCents)} />
              <MetricTile label="Adelantos y descuentos" value={formatMoney(String(BigInt(settlement.advancesCents) + BigInt(settlement.discountsCents)))} />
              <MetricTile label="Monto líquido" value={formatMoney(settlement.liquidAmountCents)} />
              <MetricTile label="Forma de pago" value={settlement.paymentMode === "cash" ? "Contado" : "Crédito"} />
            </View>
          </AppCard>
        ) : null}
        <AppCard title="Pesaje">
          {sacks.length ? (
            sacks.map((item) => (
              <View key={item.id} style={styles.row}>
                <View style={styles.copy}>
                  <Text style={styles.title}>
                    Saco {item.sequence} · {formatKilograms(item.netWeightKg)} netos
                  </Text>
                  <Text style={styles.meta}>{commercialDescription(item)}</Text>
                  <Text style={styles.meta}>
                    Bruto {formatKilograms(item.grossWeightKg)} · tara {formatKilograms(item.tareKg)}
                    {item.voidedAt ? " · anulado" : ""}
                  </Text>
                </View>
                {!item.voidedAt && reception.state !== "voided" ? (
                  <View style={styles.actions}>
                    <AppButton
                      disabled={busy || needsRefresh}
                      label="Corregir"
                      onPress={() => chooseSack(item, "correct-sack")}
                      tone="secondary"
                    />
                    {reception.state !== "settled" ? (
                      <AppButton
                        disabled={busy || needsRefresh}
                        label="Anular saco"
                        onPress={() => chooseSack(item, "void-sack")}
                        tone="secondary"
                      />
                    ) : null}
                  </View>
                ) : null}
              </View>
            ))
          ) : (
            <EmptyState
              title="Sin sacos"
              message="La recepción todavía no tiene pesajes."
            />
          )}
        </AppCard>
        {action === "correct-sack" ? (
          <AppCard title="Nueva medición">
            <FormField
              keyboardType="number-pad"
              label="Peso bruto (kg)"
              onChangeText={setGross}
              value={gross}
            />
            <FormField
              keyboardType="number-pad"
              label="Tara (kg)"
              onChangeText={setTare}
              value={tare}
            />
            <FormField label="Motivo" onChangeText={setReason} value={reason} />
            <AppButton
              disabled={busy || needsRefresh || !reason.trim()}
              label="Revisar corrección"
              onPress={() => setReviewing(true)}
            />
          </AppCard>
        ) : null}
        {action && action !== "correct-sack" ? (
          <AppCard title="Motivo de anulación">
            <FormField label="Motivo" onChangeText={setReason} value={reason} />
            <AppButton
              disabled={busy || needsRefresh || !reason.trim()}
              label="Revisar anulación"
              onPress={() => setReviewing(true)}
            />
          </AppCard>
        ) : null}
        <View style={styles.actions}>
          {settlement?.state === "confirmed" ? (
            <AppButton
              disabled={busy || needsRefresh}
              label="Anular compra"
              onPress={() => {
                setReason("");
                setAction("void-purchase");
              }}
              tone="secondary"
            />
          ) : reception.state !== "settled" && reception.state !== "voided" ? (
            <AppButton
              disabled={busy || needsRefresh}
              label="Anular recepción"
              onPress={() => {
                setReason("");
                setAction("void-reception");
              }}
              tone="secondary"
            />
          ) : null}
        </View>
      </AppScreen>
      <ConfirmationDialog
        busy={busy}
        confirmLabel={action === "correct-sack" ? "Corregir" : "Anular"}
        message="El backend validará la versión actual y conservará toda la trazabilidad."
        onCancel={() => setReviewing(false)}
        onConfirm={() => void confirm()}
        title={
          action === "correct-sack"
            ? "¿Confirmar corrección?"
            : "¿Confirmar anulación?"
        }
        visible={reviewing}
      />
    </>
  );
}

function PaymentStatusLine({ reception, status }: { reception: Reception; status: Map<string, PurchasePaymentStatus> | "unavailable" | null }) {
  if (reception.state !== "settled" && reception.state !== "voided") return null;
  if (status === "unavailable") return <Text style={styles.paymentUnavailable}>Estado de pago no disponible sin conexión.</Text>;
  const item = status?.get(reception.id);
  if (!item) return status ? null : <Text style={styles.paymentUnavailable}>Consultando estado de pago…</Text>;
  const view = paymentStatusView(item);
  const tone = view.tone === "success" ? paymentTones.paid : view.tone === "danger" ? paymentTones.debt : paymentTones.voided;
  return (
    <View accessibilityLabel={`Estado de pago: ${view.label}${view.detail ? `, ${view.detail}` : ""}`} style={[styles.paymentBadge, tone.box]}>
      <Text style={[styles.paymentLabel, tone.text]}>{view.label}</Text>
      {view.detail ? <Text style={[styles.paymentDetail, tone.text]}>{view.detail}</Text> : null}
    </View>
  );
}

const paymentTones = {
  paid: StyleSheet.create({ box: { backgroundColor: color.successMuted, borderColor: color.successAccent }, text: { color: color.success } }),
  debt: StyleSheet.create({ box: { backgroundColor: color.dangerMuted, borderColor: color.dangerAccent }, text: { color: color.danger } }),
  voided: StyleSheet.create({ box: { backgroundColor: color.surface, borderColor: color.border }, text: { color: color.textSecondary } }),
};

function stateName(value: Reception["state"]) {
  return (
    {
      draft: "Borrador",
      weighing: "En pesaje",
      weighed: "Pesada",
      settled: "Liquidada",
      voided: "Anulada",
    } as const
  )[value];
}
const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  paymentBadge: { alignSelf: "flex-start", borderLeftWidth: 4, borderRadius: radius.sm, gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  paymentLabel: { ...typography.body, fontWeight: "800" },
  paymentDetail: { ...typography.bodySmall, fontWeight: "700" },
  paymentUnavailable: { color: color.textSecondary, ...typography.bodySmall },
  filterFields: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  filterField: { flex: 1, minWidth: 220 },
  filterActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  center: { justifyContent: "center" },
  top: { flexDirection: "row", justifyContent: "space-between" },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  row: {
    alignItems: "center",
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  copy: { flex: 1, minWidth: 220 },
  title: {
    color: color.textPrimary,
    ...typography.bodySmall,
    fontWeight: "700",
  },
  meta: { color: color.textSecondary, ...typography.bodySmall },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "flex-end",
  },
});
