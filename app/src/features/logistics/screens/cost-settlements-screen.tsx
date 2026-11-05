import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import {
  createOperationId,
  formatMoney,
  moneyInputToCents,
  type PurchaseSettlement,
} from "@/domain/reception/reception";
import { formatLocalDateInput, isValidCivilDate } from "@/domain/shared/date";
import { formatSaleDate } from '@/domain/sales/sales-history';
import { reviewCostSettlement } from "@/domain/logistics/settlement-review";
import type { Sale } from "@/domain/sales/sale";
import { useSession } from "@/features/auth/session/session-provider";
import { useSyncQueue } from "@/features/sync/sync-queue-provider";

import {
  deactivateWorkGroup,
  createWorkGroup,
  listFreightEntries,
  listStowageEntries,
  listWorkGroups,
  type FreightEntry,
  type StowageEntry,
  type WorkGroup,
} from "@/services/api/operations-api";
import {
  getPurchaseSettlement,
  listAllReceptions,
} from "@/services/api/reception-api";
import { listAllSales } from "@/services/api/sales-api";
import {
  AppButton,
  AppCard,
  AppScreen,
  ChoiceDialog,
  ConfirmationDialog,
  EmptyState,
  FeedbackState,
  FormField,
  LoadingState,
  ScreenHeader,
  SelectionField,
  type Choice,
} from "@/ui/components";
import { color, spacing, typography } from "@/ui/tokens";
import { backOrHome } from "@/navigation/back-or-home";

type OperationChoice = { id: string; label: string; type: "purchase" | "sale" };

export function CostSettlementsScreen() {
  const { session } = useSession();
  return session?.user.role === 'wholesaler' ? <CostSettlementsWorkspace key={session.accessToken} token={session.accessToken} /> : null;
}

function CostSettlementsWorkspace({ token }: { token: string }) {
  const router = useRouter();
  const { enqueue, sendQueued } = useSyncQueue();
  const active = useRef(true);
  const querySequence = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; querySequence.current += 1; }; }, []);
  const [freight, setFreight] = useState<FreightEntry[]>([]);
  const [stowage, setStowage] = useState<StowageEntry[]>([]);
  const [groups, setGroups] = useState<WorkGroup[]>([]);
  const [operations, setOperations] = useState<OperationChoice[]>([]);
  const [selectedFreight, setSelectedFreight] = useState<string[]>([]);
  const [selectedStowage, setSelectedStowage] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [activity, setActivity] = useState<"load" | "unload">("unload");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(formatLocalDateInput);
  const [dialog, setDialog] = useState<"group" | "operation" | null>(null);
  const [confirm, setConfirm] = useState<"freight" | "stowage" | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<WorkGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sending = useRef(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const locked = busy || Boolean(confirm) || Boolean(deleteGroup) || needsRefresh;
  const settlementReview = confirm ? reviewCostSettlement(confirm === "freight" ? freight : stowage, confirm === "freight" ? selectedFreight : selectedStowage, date) : null;
  function reviewSettlement(kind: "freight" | "stowage") {
    if (locked || sending.current) return;
    const review = reviewCostSettlement(kind === "freight" ? freight : stowage, kind === "freight" ? selectedFreight : selectedStowage, date);
    if (review.kind === "invalid") { setError(review.message); return; }
    setError(null);
    setConfirm(kind);
  }
  const fetchData = useCallback(async () => {
    const [f, s, g, receptionPage, salePage] = await Promise.all([
      listFreightEntries(token),
      listStowageEntries(token),
      listWorkGroups(token),
      listAllReceptions(token),
      listAllSales(token),
    ]);
    const settlements = (
      await Promise.all(
        receptionPage.items
          .filter((item) => item.state === "settled")
          .map(async (item) => ({
            reception: item,
            settlement: await getPurchaseSettlement(token, item.id),
          })),
      )
    ).filter(
      (
        item,
      ): item is {
        reception: (typeof receptionPage.items)[number];
        settlement: PurchaseSettlement;
      } => Boolean(item),
    );
    return {
      freight: f.items,
      stowage: s.items,
      groups: g.items,
      operations: [
        ...settlements.map(({ reception, settlement }) => ({
          id: settlement.id,
          label: `Compra ${reception.receivedOn} · ${formatMoney(settlement.liquidAmountCents)}`,
          type: "purchase" as const,
        })),
        ...salePage.items
          .filter((item) => item.state === "confirmed")
          .map((item: Sale) => ({
            id: item.id,
            label: `Venta ${formatSaleDate(item.createdAt)} · ${formatMoney(item.totalAmountCents)}`,
            type: "sale" as const,
          })),
      ],
    };
  }, [token]);
  const apply = useCallback((data: Awaited<ReturnType<typeof fetchData>>) => {
    setFreight(data.freight);
    setStowage(data.stowage);
    setGroups(data.groups);
    setOperations(data.operations);
  }, []);
  async function load() {
    if (!active.current) return;
    const request = ++querySequence.current;
    setError(null);
    try {
      const data = await fetchData();
      if (!active.current || request !== querySequence.current) return;
      apply(data);
      setNeedsRefresh(false);
    } catch (e) {
      if (!active.current || request !== querySequence.current) return;
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los costos.",
      );
    } finally {
      if (active.current && request === querySequence.current) setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    const request = ++querySequence.current;
    fetchData()
      .then((data) => {
        if (active && request === querySequence.current) apply(data);
      })
      .catch((e) => {
        if (active && request === querySequence.current)
          setError(
            e instanceof Error
              ? e.message
              : "No se pudieron cargar los costos.",
          );
      })
      .finally(() => {
        if (active && request === querySequence.current) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [apply, fetchData]);

  function toggle(
    id: string,
    current: string[],
    set: (value: string[]) => void,
  ) {
    set(
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }
  async function sendCost(
    input: { id: string; body: unknown; path: string; type: string },
    success: string,
    clear: () => void,
  ) {
    if (!active.current || sending.current || needsRefresh) return;
    sending.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    let saved = false;
    try {
      await enqueue({ ...input, method: "POST" });
      saved = true;
      if (!active.current) return;
      const outcome = await sendQueued(input.id);
      if (!active.current) return;
      if (outcome.status !== "confirmed") {
        router.push("/sync-queue" as Href);
        return;
      }
      saved = false;
      clear();
      setMessage(success);
      setNeedsRefresh(true);
      await load();
    } catch (cause) {
      if (!active.current) return;
      if (saved) {
        router.push("/sync-queue" as Href);
        return;
      }
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo conservar la operación.",
      );
    } finally {
      sending.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function performSettlement() {
    if (!confirm || sending.current || needsRefresh) return;
    const kind = confirm;
    const ids = kind === "freight" ? selectedFreight : selectedStowage;
    setConfirm(null);
    const review = reviewCostSettlement(kind === "freight" ? freight : stowage, ids, date);
    if (review.kind === "invalid") {
      setError(review.message);
      return;
    }
    const id = createOperationId();
    const payload = { clientOperationId: id, entryIds: review.entryIds, settledOn: review.settledOn };
    await sendCost(
      {
        id,
        body: payload,
        path:
          kind === "freight" ? "/freight/settlements" : "/stowage/settlements",
        type: kind === "freight" ? "freight.settle" : "stowage.settle",
      },
      "Liquidación confirmada.",
      () => {
        setSelectedFreight([]);
        setSelectedStowage([]);
      },
    );
  }
  async function addEntry() {
    if (sending.current || needsRefresh) return;
    if (!isValidCivilDate(date)) {
      setError('Ingresa una fecha válida en formato AAAA-MM-DD.');
      return;
    }
    const cents = moneyInputToCents(amount);
    const operation = operations.find((item) => item.id === operationId);
    if (!groupId || !operation || !cents) {
      setError("Completa grupo, operación e importe.");
      return;
    }
    const id = createOperationId();
    const payload = {
      activity,
      amountCents: cents,
      clientOperationId: id,
      occurredOn: date,
      operationId: operation.id,
      operationType: operation.type,
      workGroupId: groupId,
    };
    await sendCost(
      { id, body: payload, path: "/stowage/entries", type: "stowage.entry" },
      "Estiba registrada.",
      () => {
        setAmount("");
        setOperationId("");
      },
    );
  }
  async function addGroup() {
    if (!active.current || sending.current || locked) return;
    if (!groupName.trim()) {
      setError("Escribe el nombre del grupo.");
      return;
    }
    sending.current = true;
    setBusy(true);
    try {
      await createWorkGroup(token, groupName.trim());
      if (!active.current) return;
      setGroupName("");
      await load();
    } catch (e) {
      if (!active.current) return;
      setError(e instanceof Error ? e.message : "No se pudo crear el grupo.");
    } finally {
      sending.current = false;
      if (active.current) setBusy(false);
    }
  }
  async function removeGroup() {
    if (!active.current || !deleteGroup || sending.current) return;
    const current = deleteGroup;
    setDeleteGroup(null);
    sending.current = true;
    setBusy(true);
    try {
      await deactivateWorkGroup(token, current.id);
      if (!active.current) return;
      if (groupId === current.id) setGroupId("");
      await load();
    } catch (e) {
      if (!active.current) return;
      setError(
        e instanceof Error ? e.message : "No se pudo desactivar el grupo.",
      );
    } finally {
      sending.current = false;
      if (active.current) setBusy(false);
    }
  }

  if (loading)
    return (
      <AppScreen contentContainerStyle={styles.center} scrollable={false}>
        <LoadingState label="Cargando flete y estiba" />
      </AppScreen>
    );
  const group = groups.find((item) => item.id === groupId);
  const operation = operations.find((item) => item.id === operationId);
  const pendingFreight = freight.filter((item) => item.state === "pending");
  const pendingStowage = stowage.filter((item) => item.state === "pending");

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen}>
        <View style={styles.top}>
          <AppButton
            label="Volver"
            onPress={() => backOrHome(router)}
            tone="secondary"
          />
          <AppButton
            disabled={busy || Boolean(confirm) || Boolean(deleteGroup)}
            label="Actualizar"
            onPress={() => void load()}
            tone="secondary"
          />
        </View>
        <ScreenHeader
          eyebrow="LOGÍSTICA"
          title="Flete y estiba"
          description="Registra costos operativos y liquida únicamente entradas pendientes."
        />
        {error ? (
          <FeedbackState
            title="Revisa la operación"
            message={error}
            tone="error"
          />
        ) : null}
        {message ? (
          <FeedbackState
            title="Operación completada"
            message={message}
            tone="success"
          />
        ) : null}
        {needsRefresh ? (
          <FeedbackState
            title="Costos pendientes de actualizar"
            message="La operación está confirmada. Actualiza los costos antes de registrar otra."
            actionLabel="Reintentar consulta de costos"
            onAction={() => void load()}
          />
        ) : null}
        <FormField
          editable={!locked}
          label="Fecha de operación"
          onChangeText={setDate}
          value={date}
        />
        <AppCard title="Fletes pendientes">
          {pendingFreight.length ? (
            pendingFreight.map((item) => (
              <AppButton
                key={item.id}
                disabled={locked}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: selectedFreight.includes(item.id),
                }}
                label={`${selectedFreight.includes(item.id) ? "✓ " : ""}${item.operationType === "purchase" ? "Compra" : "Venta"} · ${formatMoney(item.amountCents)}`}
                onPress={() =>
                  toggle(item.id, selectedFreight, setSelectedFreight)
                }
                tone="secondary"
              />
            ))
          ) : (
            <EmptyState
              title="Sin fletes pendientes"
              message="No existen importes por liquidar."
            />
          )}
          <AppButton
            disabled={!selectedFreight.length || locked}
            label="Revisar liquidación de fletes"
            onPress={() => reviewSettlement("freight")}
          />
        </AppCard>
        <AppCard title="Grupos de estiba">
          <View style={styles.row}>
            <View style={styles.grow}>
              <FormField
                editable={!locked}
                label="Nuevo grupo"
                onChangeText={setGroupName}
                value={groupName}
              />
            </View>
            <AppButton
              disabled={locked}
              label="Crear grupo"
              onPress={() => void addGroup()}
            />
          </View>
          {groups.map((item) => (
            <View key={item.id} style={styles.listRow}>
              <Text style={styles.text}>{item.name}</Text>
              <AppButton
                disabled={locked}
                label="Desactivar"
                accessibilityLabel={`Desactivar grupo ${item.name}`}
                onPress={() => setDeleteGroup(item)}
                tone="secondary"
              />
            </View>
          ))}
        </AppCard>
        <AppCard title="Registrar estiba">
          <SelectionField
            disabled={locked}
            label="Grupo"
            onPress={() => setDialog("group")}
            placeholder="Selecciona"
            value={group?.name}
          />
          <SelectionField
            disabled={locked}
            label="Compra o venta"
            onPress={() => setDialog("operation")}
            placeholder="Selecciona una operación confirmada"
            value={operation?.label}
          />
          <View style={styles.row}>
            <AppButton
              disabled={locked}
              label="Descarga"
              onPress={() => setActivity("unload")}
              accessibilityRole="radio"
              accessibilityState={{ checked: activity === "unload" }}
              tone={activity === "unload" ? "primary" : "secondary"}
            />
            <AppButton
              disabled={locked}
              label="Carga"
              onPress={() => setActivity("load")}
              accessibilityRole="radio"
              accessibilityState={{ checked: activity === "load" }}
              tone={activity === "load" ? "primary" : "secondary"}
            />
          </View>
          <FormField
            editable={!locked}
            keyboardType="decimal-pad"
            label="Importe (S/)"
            onChangeText={setAmount}
            value={amount}
          />
          <AppButton
            disabled={locked}
            label="Registrar estiba"
            onPress={() => void addEntry()}
          />
        </AppCard>
        <AppCard title="Estibas pendientes">
          {pendingStowage.length ? (
            pendingStowage.map((item) => (
              <AppButton
                key={item.id}
                disabled={locked}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: selectedStowage.includes(item.id),
                }}
                label={`${selectedStowage.includes(item.id) ? "✓ " : ""}${item.activity === "load" ? "Carga" : "Descarga"} · ${formatMoney(item.amountCents)}`}
                onPress={() =>
                  toggle(item.id, selectedStowage, setSelectedStowage)
                }
                tone="secondary"
              />
            ))
          ) : (
            <EmptyState
              title="Sin estibas pendientes"
              message="No existen jornadas por liquidar."
            />
          )}
          <AppButton
            disabled={!selectedStowage.length || locked}
            label="Revisar liquidación de estibas"
            onPress={() => reviewSettlement("stowage")}
          />
        </AppCard>
      </AppScreen>
      <ChoiceDialog
        choices={
          dialog === "group"
            ? groups.map((item) => ({ id: item.id, label: item.name }))
            : operations.map((item) => ({ id: item.id, label: item.label }))
        }
        onClose={() => setDialog(null)}
        onSelect={(choice: Choice) => {
          if (dialog === "group") setGroupId(choice.id);
          else setOperationId(choice.id);
          setDialog(null);
        }}
        selectedIds={dialog === "group" ? [groupId] : [operationId]}
        title={
          dialog === "group" ? "Seleccionar grupo" : "Seleccionar operación"
        }
        visible={dialog !== null}
      />
      <ConfirmationDialog
        busy={busy}
        confirmLabel="Liquidar"
        message={settlementReview?.kind === "ready" ? `${confirm === "freight" ? "Flete" : "Estiba"} · Fecha ${settlementReview.settledOn}. ${settlementReview.entryCount} ${settlementReview.entryCount === 1 ? "registro seleccionado" : "registros seleccionados"}. Total provisional de salida de caja: ${formatMoney(settlementReview.totalAmountCents)}. El servidor comprobará que todos sigan pendientes antes de confirmar la liquidación.` : "Revisa la fecha y los registros pendientes antes de continuar."}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void performSettlement()}
        title="¿Confirmar liquidación?"
        visible={Boolean(confirm)}
      />
      <ConfirmationDialog
        busy={busy}
        confirmLabel="Desactivar"
        message="El grupo dejará de estar disponible para nuevos registros y se conservará su historial."
        onCancel={() => setDeleteGroup(null)}
        onConfirm={() => void removeGroup()}
        title="¿Desactivar grupo?"
        visible={Boolean(deleteGroup)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  center: { justifyContent: "center" },
  top: { flexDirection: "row", justifyContent: "space-between" },
  row: {
    alignItems: "flex-end",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  grow: { flexBasis: 260, flexGrow: 1, minWidth: 0, maxWidth: '100%' },
  listRow: {
    alignItems: "center",
    borderBottomColor: color.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  text: { color: color.textPrimary, ...typography.bodySmall },
});
