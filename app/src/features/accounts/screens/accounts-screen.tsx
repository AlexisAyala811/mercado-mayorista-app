import { AccountsOverview } from "./accounts-overview";
import { accountKindCopy, type AccountKind } from "@/domain/accounts/account-kind";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { createOperationId, formatMoney } from "@/domain/reception/reception";
import { useSession } from "@/features/auth/session/session-provider";
import { useSyncQueue } from "@/features/sync/sync-queue-provider";
import { ApiError } from "@/services/api/api-client";
import {
  getAccount,
  listAccounts,
  listCashMovements,
  type Account,
  type AccountDetail,
  type CashMovement,
  type Payment,
} from "@/services/api/operations-api";
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
import { color, spacing, typography } from "@/ui/tokens";
import { backOrHome } from "@/navigation/back-or-home";
import { reviewAccountPayment } from "@/domain/accounts/payment-review";
import { paymentWasReversed, reviewPaymentReversal } from "@/domain/accounts/reversal-review";
import {
  accountCounterpartyName,
  filterAccounts,
  type AccountFilters,
} from "@/domain/accounts/account-filters";

// Spec 011 (CL-FM18): one screen per kind, Deudas or Cobranzas.
export function AccountsScreen({ kind }: { kind: AccountKind }) {
  const { session } = useSession();
  return session ? <AccountsContent key={`${session.accessToken}:${kind}`} kind={kind} /> : null;
}

function AccountsContent({ kind }: { kind: AccountKind }) {
  const copy = accountKindCopy[kind];
  const router = useRouter();
  const { session, invalidateSession } = useSession();
  const { enqueue, sendQueued } = useSyncQueue();
  const token = session?.accessToken ?? "";
  const mounted = useRef(true);
  const collectionRequest = useRef(0);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; collectionRequest.current += 1; };
  }, []);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountFilters, setAccountFilters] = useState<AccountFilters>({
    search: "",
    kind,
    state: "all",
  });
  const [cash, setCash] = useState<CashMovement[]>([]);
  const [showCash, setShowCash] = useState(false);
  const [collectionError, setCollectionError] = useState<string | null>(null);
  const [collectionsReady, setCollectionsReady] = useState(false);
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [reverseTarget, setReverseTarget] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const op = useRef<string | null>(null);
  const submitting = useRef(false);
  const [result, setResult] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const paymentReview = detail
    ? reviewAccountPayment(detail.account, amount)
    : null;
  const reversalReview = detail && reverseTarget
    ? reviewPaymentReversal(detail.account, detail.payments, reverseTarget.id, reason)
    : null;
  function reviewReversal() {
    if (!detail || !reverseTarget || submitting.current || needsRefresh) return;
    const review = reviewPaymentReversal(detail.account, detail.payments, reverseTarget.id, reason);
    if (review.kind === "invalid") {
      setError(review.message);
      setConfirm(false);
      return;
    }
    setError(null);
    setConfirm(true);
  }
  function reviewPayment() {
    if (!detail || submitting.current || needsRefresh) return;
    const review = reviewAccountPayment(detail.account, amount);
    setReverseTarget(null);
    if (review.kind === "invalid") {
      setError(review.message);
      setConfirm(false);
      return;
    }
    setError(null);
    setConfirm(true);
  }
  async function load() {
    const requestId = ++collectionRequest.current;
    setLoading(true);
    setError(null);
    setCollectionError(null);
    try {
      const [page, movements] = await Promise.all([
        listAccounts(token),
        listCashMovements(token),
      ]);
      if (!mounted.current || requestId !== collectionRequest.current) return;
      setAccounts(page.items);
      setCash(movements.items);
      setCollectionsReady(true);
    } catch (e) {
      if (!mounted.current || requestId !== collectionRequest.current) return;
      setCollectionsReady(false);
      if (e instanceof ApiError && e.status === 401) await invalidateSession();
      else
        setCollectionError(
          e instanceof Error ? e.message : "No se pudieron cargar las cuentas.",
        );
    } finally {
      if (mounted.current && requestId === collectionRequest.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    const requestId = ++collectionRequest.current;
    Promise.all([listAccounts(token), listCashMovements(token)])
      .then(([p, m]) => {
        if (active && requestId === collectionRequest.current) {
          setAccounts(p.items);
          setCash(m.items);
          setCollectionsReady(true);
          setCollectionError(null);
        }
      })
      .catch((e) => {
        if (!active || requestId !== collectionRequest.current) return;
        if (e instanceof ApiError && e.status === 401) void invalidateSession();
        else setCollectionError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar las cuentas.",
          );
      })
      .finally(() => {
        if (active && requestId === collectionRequest.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token, invalidateSession]);
  async function open(account: Account) {
    setLoading(true);
    setError(null);
    try {
      const value = await getAccount(token, account.id);
      if (!mounted.current) return;
      setDetail(value);
      setResult(null);
      setNeedsRefresh(false);
    } catch (e) {
      if (!mounted.current) return;
      setError(e instanceof Error ? e.message : "No se pudo abrir la cuenta.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }
  async function refreshDetail(accountId: string) {
    const value = await getAccount(token, accountId);
    if (!mounted.current) return false;
    setDetail(value);
    setNeedsRefresh(false);
    return true;
  }
  async function retryDetail() {
    if (!detail) return;
    setBusy(true);
    setError(null);
    try {
      if (!await refreshDetail(detail.account.id)) return;
      await load();
    } catch (cause) {
      if (!mounted.current) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo actualizar la cuenta.",
      );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function sendMovement(
    input: { body: unknown; id: string; path: string; type: string },
    message: string,
  ) {
    if (!detail || submitting.current || needsRefresh) return;
    submitting.current = true;
    setBusy(true);
    setConfirm(false);
    setError(null);
    setResult(null);
    const accountId = detail.account.id;
    let saved = false;
    try {
      await enqueue({ ...input, method: "POST" });
      if (!mounted.current) return;
      saved = true;
      op.current = null;
      const outcome = await sendQueued(input.id);
      if (!mounted.current) return;
      if (outcome.status !== "confirmed") {
        router.push("/sync-queue" as Href);
        return;
      }
      saved = false;
      setResult(message);
      setNeedsRefresh(true);
      setAmount("");
      setReverseTarget(null);
      setReason("");
      if (!await refreshDetail(accountId)) return;
      await load();
    } catch (cause) {
      if (!mounted.current) return;
      if (saved) {
        router.push("/sync-queue" as Href);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo completar el movimiento.",
      );
    } finally {
      submitting.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function pay() {
    if (!detail || submitting.current || needsRefresh) return;
    const review = reviewAccountPayment(detail.account, amount);
    if (review.kind === "invalid") {
      setError(review.message);
      setConfirm(false);
      return;
    }
    op.current ??= createOperationId();
    const payload = {
      amountCents: review.amountCents,
      clientOperationId: op.current,
      expectedAccountVersion: detail.account.version,
    };
    await sendMovement(
      {
        body: payload,
        id: op.current,
        path: "/accounts/" + detail.account.id + "/payments",
        type: "account.payment",
      },
      copy.savedMessage,
    );
  }
  async function reverse() {
    if (!detail || !reverseTarget || submitting.current || needsRefresh) return;
    const review = reviewPaymentReversal(detail.account, detail.payments, reverseTarget.id, reason);
    if (review.kind === "invalid") {
      setError(review.message);
      setConfirm(false);
      return;
    }
    op.current ??= createOperationId();
    const payload = {
      clientOperationId: op.current,
      expectedAccountVersion: detail.account.version,
      reason: review.reason,
    };
    await sendMovement(
      {
        body: payload,
        id: op.current,
        path:
          "/accounts/" +
          detail.account.id +
          "/payments/" +
          reverseTarget.id +
          "/reversal",
        type: "account.payment-reversal",
      },
      "Reverso confirmado. Se registró el movimiento compensatorio.",
    );
  }
  if (!session) return null;
  if (loading)
    return (
      <AppScreen
        contentContainerStyle={{ justifyContent: "center" }}
        scrollable={false}
      >
        <LoadingState label="Cargando cuentas" />
      </AppScreen>
    );
  if (detail)
    return (
      <>
        <AppScreen contentContainerStyle={styles.screen}>
          <View style={styles.top}>
            <AppButton
              label={`Volver a ${copy.title.toLowerCase()}`}
              disabled={busy || confirm}
              onPress={() => { setDetail(null); setReverseTarget(null); setReason(""); setConfirm(false); }}
              tone="secondary"
            />
          </View>
          <ScreenHeader
            eyebrow={copy.eyebrow}
            title={copy.detailTitle}
            description={`${accountCounterpartyName(detail.account)} · Referencia ${detail.account.id} · Origen: ${commercialLabel(detail.account.sourceType)}`}
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
              title={result === copy.savedMessage ? copy.savedTitle : "Reverso guardado"}
              message={result}
              tone="success"
            />
          ) : null}
          {collectionError ? <FeedbackState title="Lista de cuentas y caja pendiente" message={collectionError} tone="warning" actionLabel="Reintentar cuentas y caja" onAction={() => void load()} /> : null}
          {needsRefresh ? (
            <FeedbackState
              title="Saldo pendiente de actualizar"
              message="El movimiento está confirmado. Actualiza la cuenta antes de registrar otro."
              actionLabel="Reintentar consulta de cuenta"
              onAction={() => void retryDetail()}
            />
          ) : null}
          <View style={styles.metrics}>
            <MetricTile
              label="Importe inicial"
              value={formatMoney(detail.account.initialAmountCents)}
            />
            <MetricTile
              label="Saldo"
              value={formatMoney(detail.account.balanceCents)}
            />
            <MetricTile
              label="Estado"
              value={accountStateLabel(detail.account.state)}
            />
          </View>
          {kind === "receivable" && detail.account.counterpartyType === "buyer" && detail.account.counterpartyId ? (
            <AppButton
              label="Estado de cuenta"
              accessibilityLabel={`Estado de cuenta de ${accountCounterpartyName(detail.account)}`}
              disabled={busy || confirm}
              tone="secondary"
              onPress={() => router.push({ pathname: "/buyer-statement", params: { buyerId: detail.account.counterpartyId! } } as Href)}
            />
          ) : null}
          <AppCard title="Registrar movimiento">
            <FormField
              editable={!busy && !confirm && !needsRefresh}
              keyboardType="decimal-pad"
              label={copy.amountLabel}
              onChangeText={setAmount}
              value={amount}
            />
            <AppButton
              disabled={busy || confirm || needsRefresh || detail.account.state !== "open"}
              label={busy ? "Registrando…" : "Confirmar importe"}
              onPress={reviewPayment}
            />
          </AppCard>
          <AppCard title="Vencimientos">
            {!detail.installments.length ? <EmptyState title="Sin vencimientos registrados" message="La cuenta consultada no contiene un calendario de vencimientos." /> : null}
            {detail.installments.map((x) => (
              <Text key={x.id} style={styles.text}>
                {x.dueOn} · {formatMoney(x.balanceCents)} ·{" "}
                {detail.account.state === "voided" ? "Cerrado por anulación" : x.state === "open" ? "Pendiente" : "Pagado"}
              </Text>
            ))}
          </AppCard>
          <AppCard title="Historial de movimientos">
            {!detail.payments.length ? <EmptyState title="Sin pagos ni cobros" message="Todavía no hay movimientos de pago, cobro o reverso registrados en esta cuenta." /> : null}
            {detail.payments.map((x) => (
              <View key={x.id} style={styles.row}>
                <Text style={styles.text}>
                  {x.isReversal ? "Reverso" : "Movimiento"} ·{" "}
                  {formatMoney(x.amountCents)}
                </Text>
                {!x.isReversal && paymentWasReversed(x.id, detail.payments) ? <Text style={styles.text}>Movimiento revertido</Text> : null}
                {!x.isReversal && !paymentWasReversed(x.id, detail.payments) ? (
                  <AppButton
                    disabled={busy || confirm || needsRefresh || detail.account.state === "voided"}
                    label="Revertir"
                    onPress={() => { setReverseTarget(x); setReason(""); setError(null); }}
                    tone="secondary"
                  />
                ) : null}
              </View>
            ))}
            {reverseTarget ? (
              <>
                <FormField
                  editable={!busy && !confirm && !needsRefresh}
                  label="Motivo del reverso"
                  onChangeText={setReason}
                  value={reason}
                />
                <AppButton
                  disabled={busy || confirm || needsRefresh}
                  label="Confirmar reverso"
                  onPress={reviewReversal}
                />
                <AppButton disabled={busy || confirm} label="Cancelar reverso" tone="secondary" onPress={() => { setReverseTarget(null); setReason(""); setError(null); }} />
              </>
            ) : null}
          </AppCard>
        </AppScreen>
        <ConfirmationDialog
          busy={busy}
          confirmLabel={reverseTarget ? "Revertir" : copy.confirmLabel}
          message={
            reverseTarget
              ? reversalReview?.kind === "ready"
                ? `${accountCounterpartyName(detail.account)} · Referencia ${detail.account.id}. Movimiento ${reverseTarget.id}: ${formatMoney(reversalReview.amountCents)}. Saldo anterior ${formatMoney(reversalReview.beforeCents)}; saldo resultante provisional ${formatMoney(reversalReview.afterCents)}. Motivo: ${reversalReview.reason}. El servidor comprobará la versión y restaurará los vencimientos mediante un movimiento compensatorio en caja.`
                : "Actualiza y revisa el movimiento y motivo antes de continuar."
              : paymentReview?.kind === "ready"
                ? `${accountCounterpartyName(detail.account)} · Referencia ${detail.account.id}. ${copy.movement} ${formatMoney(paymentReview.amountCents)}. Saldo anterior ${formatMoney(paymentReview.beforeCents)}; saldo resultante provisional ${formatMoney(paymentReview.afterCents)}. El servidor comprobará la versión y aplicará el importe al vencimiento abierto más antiguo.`
                : "Actualiza y revisa el importe antes de continuar."
          }
          onCancel={() => setConfirm(false)}
          onConfirm={() => (reverseTarget ? void reverse() : void pay())}
          title={
            reverseTarget ? "¿Confirmar reverso?" : copy.confirmTitle
          }
          visible={confirm}
        />
      </>
    );
  const incoming = cash
    .filter((x) => x.direction === "in")
    .reduce((sum, x) => sum + BigInt(x.amountCents), 0n);
  const outgoing = cash
    .filter((x) => x.direction === "out")
    .reduce((sum, x) => sum + BigInt(x.amountCents), 0n);
  const kindAccounts = accounts.filter((account) => account.kind === kind);
  const visibleAccounts = filterAccounts(kindAccounts, accountFilters);
  return (
    <AccountsOverview
      copy={copy}
      username={session.user?.username ?? "Mayorista"}
      accounts={visibleAccounts} total={kindAccounts.length} ready={collectionsReady}
      search={accountFilters.search}
      onSearch={(search) => setAccountFilters(current => ({ ...current, search }))}
      onOpen={(account) => void open(account)} onRefresh={() => void load()}
      onBack={() => backOrHome(router)} onHome={() => router.replace("/home" as Href)}
      onNewSource={() => router.push((copy.originSource === "purchase" ? "/purchase-flow" : "/sale-flow") as Href)}
      feedback={error || !collectionsReady ? <>
        {error ? <FeedbackState title="No se pudo completar" message={error} tone="error" /> : null}
        {!collectionsReady ? <FeedbackState title="Datos financieros no disponibles" message={collectionError ?? "No se pudo completar la consulta de cuentas y caja. No se muestran saldos ni resultados parciales."} tone="error" actionLabel="Reintentar cuentas y caja" onAction={() => void load()} /> : null}
      </> : null}
    >
      {collectionsReady ? <>
      <View style={styles.metrics}>
        <MetricTile label="Entradas" value={formatMoney(incoming.toString())} />
        <MetricTile label="Salidas" value={formatMoney(outgoing.toString())} />
        <MetricTile
          label="Neto"
          value={formatMoney((incoming - outgoing).toString())}
        />
      </View>
      <AppCard title="Movimientos de caja" description={`${cash.length} movimientos consultados. Los totales incluyen la colección completa.`}>
        {cash.length ? (
          <>
          <AppButton label={showCash ? "Ocultar movimientos de caja" : "Ver movimientos de caja"} tone="secondary" accessibilityState={{ expanded: showCash }} onPress={() => setShowCash(current => !current)} />
          {showCash ? cash.map((x) => (
            <View key={x.id} style={styles.row}>
              <View>
                <Text style={styles.text}>
                  {x.direction === "in" ? "Entrada" : "Salida"} ·{" "}
                  {commercialLabel(x.category)}
                </Text>
                <Text style={styles.text}>
                  {new Date(x.createdAt).toLocaleString("es-PE")} ·{" "}
                  {commercialLabel(x.sourceType)}
                </Text>
              </View>
              <Text style={styles.balance}>
                {x.direction === "in" ? "+" : "−"} {formatMoney(x.amountCents)}
              </Text>
            </View>
          )) : null}
          </>
        ) : (
          <EmptyState
            title="Sin movimientos"
            message="No existen entradas o salidas registradas."
          />
        )}
      </AppCard>
      <AppCard
        title="Filtrar por estado"
        description="Estos filtros no cambian los totales ni los movimientos de caja."
      >
        <View style={styles.metrics}>
          {(
            [
              ["all", "Todos los estados"],
              ["open", "Pendiente"],
              ["paid", "Pagada"],
              ["voided", "Anulada"],
            ] as const
          ).map(([state, label]) => (
            <AppButton
              key={state}
              label={label}
              accessibilityRole="radio"
              accessibilityState={{ checked: accountFilters.state === state }}
              tone={accountFilters.state === state ? "primary" : "secondary"}
              onPress={() =>
                setAccountFilters((current) => ({ ...current, state }))
              }
            />
          ))}
        </View>
        <AppButton
          label="Limpiar búsqueda de cuentas"
          tone="secondary"
          onPress={() =>
            setAccountFilters({ search: "", kind, state: "all" })
          }
        />
        <Text style={styles.text}>
          {visibleAccounts.length} de {kindAccounts.length} cuentas
        </Text>
      </AppCard>
      </> : null}
    </AccountsOverview>
  );
}
const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  row: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  balance: { color: color.textPrimary, ...typography.body, fontWeight: "700" },
  text: { color: color.textSecondary, ...typography.bodySmall },
});

function accountStateLabel(state: Account["state"]) {
  return { open: "Pendiente", paid: "Pagada", voided: "Anulada" }[state];
}
function commercialLabel(value: string) {
  const labels: Record<string, string> = {
    sale: "Venta",
    "purchase-settlement": "Liquidación de compra",
    "sale-return": "Devolución de venta",
    "account-payment": "Pago o cobro de cuenta",
    "account-payment-reversal": "Reverso de pago o cobro",
    "purchase-payment": "Pago de compra",
    "purchase-void": "Anulación de compra",
    "sale-collection": "Cobro de venta",
    "sale-void": "Anulación de venta",
    "sale-return-refund": "Reembolso por devolución",
    "freight-settlement": "Liquidación de flete",
    "stowage-settlement": "Liquidación de estiba",
  };
  return labels[value] ?? "Otra operación comercial";
}
