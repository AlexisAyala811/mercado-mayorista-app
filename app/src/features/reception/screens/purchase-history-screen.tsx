import { BottomNavSlots } from '@/ui/navigation/app-chrome';
import { formatKilograms, kilogramsDraft, validateSackWeights } from "@/domain/reception/whole-kilograms";
import { freightLabel, SettlementLotList } from "@/features/reception/components/settlement-lot-list";
import {commercialDescription} from '@/domain/catalog/commercial-characteristic';
import { useCallback, useRef, useState } from "react";
import { type ScrollView, StyleSheet, Text, View } from "react-native";
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
import { CommercialHistoryList, type HistoryListState, type HistoryQuery } from "@/features/history/commercial-history-list";
import { purchaseCard, type HistoryCard, type HistoryChip } from "@/domain/shared/history-cards";
import { listPurchaseHistory, purchaseHistorySummary } from "@/services/api/history-api";
import { PurchasePaymentDialog } from "@/features/reception/components/purchase-payment-dialog";
import { shareReceipt } from "@/services/receipts/receipt-sharing";


type Action =
  "void-reception" | "void-purchase" | "void-sack" | "correct-sack" | null;

export function PurchaseHistoryScreen() {
  const router = useRouter();
  const { session } = useSession();
  const token = session?.accessToken ?? "";
  const [reception, setReception] = useState<Reception | null>(null);
  const [sacks, setSacks] = useState<ReceptionSack[]>([]);
  const [settlement, setSettlement] = useState<PurchaseSettlement | null>(null);
  const [sack, setSack] = useState<ReceptionSack | null>(null);
  const [gross, setGross] = useState("");
  const [tare, setTare] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<Action>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const { enqueue, sendQueued } = useSyncQueue();
  const submitting = useRef(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  // Spec 011 (RQ-ST05): the list keeps its search, chip and page while a
  // detail is open, and reloads from the server when it comes back.
  const [detailLoading, setDetailLoading] = useState(false);
  const [listState, setListState] = useState<HistoryListState | undefined>(undefined);
  const loadPage = useCallback(async (query: HistoryQuery, chip: HistoryChip, offset: number) => {
    const value = await listPurchaseHistory(token, { ...query, limit: 20, offset, paymentState: chip === 'all' ? undefined : chip });
    return { items: value.items.map(purchaseCard), total: value.total };
  }, [token]);
  const loadSummary = useCallback((query: HistoryQuery) => purchaseHistorySummary(token, query), [token]);
  // CL-ST30: «Abonar / Liquidar» on this screen, «Ver ticket» shares the
  // settlement, ✎ opens the detail and 🗑 opens it with the void reason.
  const [paying, setPaying] = useState<HistoryCard | null>(null);
  // 🗑 opens the detail and goes straight to the reason of the void.
  const detailScroll = useRef<ScrollView>(null);
  const scrollToVoid = useRef(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [ticketBusy, setTicketBusy] = useState(false);
  async function ticket(card: HistoryCard) {
    if (!card.sourceId || ticketBusy) return;
    setTicketBusy(true); setError(null);
    try { await shareReceipt('purchases', card.sourceId, token); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo abrir el ticket.'); }
    finally { setTicketBusy(false); }
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
    return { current, purchase };
  }
  async function open(id: string, then?: 'void') {
    setDetailLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const read = await readDetail(id);
      if (then === 'void') {
        scrollToVoid.current = true;
        setReason('');
        if (read.purchase?.state === 'confirmed') setAction('void-purchase');
        else if (read.current.state !== 'settled' && read.current.state !== 'voided') setAction('void-reception');
      }
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
          eyebrow="COMPRA"
          subtitle="Control de compras y liquidaciones"
          title="Ver compras"
        />
        {error ? <FeedbackState title="No se pudo abrir la compra" message={error} tone="error" /> : null}
        {notice ? <FeedbackState title="Operación confirmada" message={notice} tone="success" /> : null}
        <CommercialHistoryList
          kind="purchase"
          initial={listState}
          onStateChange={setListState}
          loadPage={loadPage}
          loadSummary={loadSummary}
          onOpen={(card) => void open(card.id)}
          onSettle={(card) => { setNotice(null); setPaying(card); }}
          onNew={() => router.push('/purchase-flow' as Href)}
          onTicket={(card) => void ticket(card)}
          onEdit={(card) => void open(card.id)}
          onVoid={(card) => void open(card.id, 'void')}
          reloadKey={reloadKey}
          disabled={ticketBusy}
        />
        {paying ? <PurchasePaymentDialog card={paying} onClose={() => setPaying(null)} onPaid={(message) => { setPaying(null); setNotice(message); setReloadKey((value) => value + 1); }} onPending={() => { setPaying(null); router.push('/sync-queue' as Href); }} token={token} /> : null}
      </AppScreen>
    );

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen} scrollRef={detailScroll}>
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
          <View onLayout={(event) => { if (scrollToVoid.current) { scrollToVoid.current = false; detailScroll.current?.scrollTo({ animated: true, y: Math.max(0, event.nativeEvent.layout.y - 12) }); } }}>
          <AppCard title="Motivo de anulación">
            <FormField label="Motivo" onChangeText={setReason} value={reason} />
            <AppButton
              disabled={busy || needsRefresh || !reason.trim()}
              label="Revisar anulación"
              onPress={() => setReviewing(true)}
            />
          </AppCard>
          </View>
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
