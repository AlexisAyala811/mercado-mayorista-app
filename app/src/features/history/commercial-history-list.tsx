import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import {
  historyChips,
  historyStateLabel,
  historyVarieties,
  historyVolume,
  type HistoryCard,
  type HistoryChip,
  type HistoryKind,
} from '@/domain/shared/history-cards';
import { validateHistoryFilters } from '@/domain/shared/history-filters';
import { AppButton, EmptyState, FeedbackState, FormField, LoadingState, MetricTile } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type HistoryQuery = { from?: string; to?: string; search?: string };
export type HistoryListState = { draft: { from: string; search: string; to: string }; query: HistoryQuery; chip: HistoryChip; offset: number };
export type HistorySummaryView = { counts: Partial<Record<HistoryChip, number>>; totalCents: string; paidCents: string; balanceCents: string };

type Props = {
  kind: HistoryKind;
  loadPage: (query: HistoryQuery, chip: HistoryChip, offset: number) => Promise<{ items: HistoryCard[]; total: number }>;
  loadSummary: (query: HistoryQuery) => Promise<HistorySummaryView>;
  onOpen: (card: HistoryCard) => void;
  onSettle: (card: HistoryCard) => void;
  disabled?: boolean;
  // Search, chip and page to restore when the list is shown again.
  initial?: HistoryListState;
  onStateChange?: (state: HistoryListState) => void;
};

const pageSize = 20;
const emptyDraft = { from: '', search: '', to: '' };

const tone = {
  debt: { box: { backgroundColor: color.dangerMuted, borderColor: color.dangerAccent }, text: { color: color.danger } },
  paid: { box: { backgroundColor: color.successMuted, borderColor: color.successAccent }, text: { color: color.success } },
  unsettled: { box: { backgroundColor: color.warningMuted, borderColor: color.border }, text: { color: color.warning } },
  voided: { box: { backgroundColor: color.surface, borderColor: color.border }, text: { color: color.textSecondary } },
} as const;

// Spec 011 (RQ-ST05, Stitch «Ver compras» / «Ver ventas»): the list opens at
// once with search and dates on top, chips with their server counts, three
// totals for the filter and one card per operation.
export function CommercialHistoryList({ kind, loadPage, loadSummary, onOpen, onSettle, disabled = false, initial, onStateChange }: Props) {
  const [draft, setDraft] = useState(initial?.draft ?? emptyDraft);
  const [query, setQuery] = useState<HistoryQuery>(initial?.query ?? {});
  const [chip, setChip] = useState<HistoryChip>(initial?.chip ?? 'all');
  const [offset, setOffset] = useState(initial?.offset ?? 0);
  const restored = useRef(initial);
  const report = useRef(onStateChange);
  useEffect(() => {
    report.current = onStateChange;
  });
  useEffect(() => {
    report.current?.({ chip, draft, offset, query });
  }, [chip, draft, offset, query]);
  const [page, setPage] = useState<{ items: HistoryCard[]; total: number } | null>(null);
  const [summary, setSummary] = useState<HistorySummaryView | 'unavailable' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);
  const purchase = kind === 'purchase';

  const run = useCallback((nextQuery: HistoryQuery, nextChip: HistoryChip, nextOffset: number, withSummary: boolean) => {
    const current = ++request.current;
    setLoading(true);
    setError(null);
    if (withSummary) {
      setSummary(null);
      loadSummary(nextQuery).then(
        (value) => { if (current === request.current) setSummary(value); },
        () => { if (current === request.current) setSummary('unavailable'); },
      );
    }
    loadPage(nextQuery, nextChip, nextOffset).then(
      (value) => {
        if (current !== request.current) return;
        setPage(value);
        setLoading(false);
      },
      (cause: unknown) => {
        if (current !== request.current) return;
        setPage(null);
        setLoading(false);
        setError(cause instanceof Error ? cause.message : 'No se pudo consultar el historial.');
      },
    );
  }, [loadPage, loadSummary]);

  useEffect(() => {
    const start = restored.current;
    run(start?.query ?? {}, start?.chip ?? 'all', start?.offset ?? 0, true);
    return () => {
      request.current += 1;
    };
  }, [run]);

  function search(next = draft) {
    const message = validateHistoryFilters(next);
    if (message) {
      setError(message);
      return;
    }
    const applied = { from: next.from.trim() || undefined, search: next.search.trim() || undefined, to: next.to.trim() || undefined };
    setQuery(applied);
    setChip('all');
    setOffset(0);
    run(applied, 'all', 0, true);
  }

  function choose(next: HistoryChip) {
    if (next === chip) return;
    setChip(next);
    setOffset(0);
    run(query, next, 0, false);
  }

  function move(nextOffset: number) {
    setOffset(nextOffset);
    run(query, chip, nextOffset, false);
  }

  const counts = summary && summary !== 'unavailable' ? summary.counts : null;
  const items = page?.items ?? [];
  const total = page?.total ?? 0;
  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <FormField label={purchase ? 'Proveedor' : 'Comprador'} placeholder={purchase ? 'Buscar proveedor' : 'Buscar comprador'} value={draft.search} onChangeText={(value) => setDraft((current) => ({ ...current, search: value }))} onSubmitEditing={() => search()} returnKeyType="search" />
        </View>
        <View style={styles.date}><FormField label="Desde" placeholder="aaaa-mm-dd" value={draft.from} onChangeText={(value) => setDraft((current) => ({ ...current, from: value }))} /></View>
        <View style={styles.date}><FormField label="Hasta" placeholder="aaaa-mm-dd" value={draft.to} onChangeText={(value) => setDraft((current) => ({ ...current, to: value }))} /></View>
        <AppButton disabled={disabled || loading} label="Buscar" onPress={() => search()} />
        <AppButton disabled={disabled || loading} label="Limpiar" tone="secondary" onPress={() => { setDraft(emptyDraft); search(emptyDraft); }} />
      </View>

      <View accessibilityRole="radiogroup" style={styles.chips}>
        {historyChips(kind, counts).map((item) => (
          <AppButton
            key={item.id}
            accessibilityLabel={item.count === null ? item.label : `${item.label}: ${item.count}`}
            accessibilityRole="radio"
            accessibilityState={{ checked: chip === item.id }}
            disabled={disabled || loading}
            label={item.count === null ? item.label : `${item.label} ${item.count}`}
            onPress={() => choose(item.id)}
            tone={chip === item.id ? 'primary' : 'secondary'}
          />
        ))}
      </View>

      {summary === 'unavailable' ? <Text style={styles.note}>Totales no disponibles sin conexión.</Text> : null}
      {summary && summary !== 'unavailable' ? (
        <View style={styles.metrics}>
          <View style={styles.metric}><MetricTile label={purchase ? 'Total compras' : 'Total ventas'} value={formatMoney(summary.totalCents)} /></View>
          <View style={styles.metric}><MetricTile label={purchase ? 'Total pagado' : 'Total cobrado'} value={formatMoney(summary.paidCents)} /></View>
          <View style={styles.metric}><MetricTile label={purchase ? 'Saldo pendiente' : 'Saldo por cobrar'} value={formatMoney(summary.balanceCents)} /></View>
        </View>
      ) : null}

      {error ? <FeedbackState title="No se pudo consultar" message={error} tone="error" actionLabel="Reintentar" onAction={() => run(query, chip, offset, true)} /> : null}
      {loading ? <LoadingState label={purchase ? 'Consultando compras' : 'Consultando ventas'} /> : null}
      {!loading && page ? (
        <Text accessibilityLiveRegion="polite" style={styles.count}>
          {total ? `${offset + 1}–${offset + items.length} de ${total} ${purchase ? 'compras' : 'ventas'}` : `0 ${purchase ? 'compras' : 'ventas'}`}
        </Text>
      ) : null}
      {!loading && page && !items.length ? (
        <EmptyState title="Sin resultados" message={purchase ? 'No hay compras que coincidan con la búsqueda y el filtro.' : 'No hay ventas que coincidan con la búsqueda y el filtro.'} />
      ) : null}
      {!loading ? items.map((card) => <HistoryRow key={card.id} card={card} disabled={disabled} kind={kind} onOpen={onOpen} onSettle={onSettle} />) : null}

      {!loading && page && total > pageSize ? (
        <View style={styles.pager}>
          <AppButton disabled={disabled || offset === 0} label="Página anterior" tone="secondary" onPress={() => move(Math.max(0, offset - pageSize))} />
          <AppButton disabled={disabled || offset + items.length >= total} label="Página siguiente" tone="secondary" onPress={() => move(offset + pageSize)} />
        </View>
      ) : null}
    </View>
  );
}

function HistoryRow({ card, disabled, kind, onOpen, onSettle }: { card: HistoryCard; disabled: boolean; kind: HistoryKind; onOpen: (card: HistoryCard) => void; onSettle: (card: HistoryCard) => void }) {
  const state = historyStateLabel(kind, card.state);
  const purchase = kind === 'purchase';
  const debt = card.state === 'debt';
  return (
    <View style={[styles.row, debt && styles.rowDebt]} testID={`history-${card.id}`}>
      <View style={styles.party}>
        <Text numberOfLines={2} style={styles.name}>{card.party}</Text>
        <View accessibilityLabel={`Estado: ${state}`} style={[styles.badge, tone[card.state].box]}><Text numberOfLines={1} style={[styles.badgeText, tone[card.state].text]}>{state}</Text></View>
        <Text style={styles.meta}>{card.date}</Text>
      </View>
      <View style={styles.facts}>
        <Fact label="Variedad" value={historyVarieties(card)} />
        <Fact label="Volumen" value={historyVolume(card)} />
        <Fact label={purchase ? 'Total liquidado' : 'Total'} value={card.totalCents === null ? 'Sin liquidar' : formatMoney(card.totalCents)} />
      </View>
      {/* Voided or not settled: no payment to show (spec 011, RQ-ST05). */}
      {debt || card.state === 'paid' ? (
        <View style={[styles.amountBox, debt ? styles.amountDebt : styles.amountPaid]}>
          <Text style={[styles.amountLabel, debt ? styles.debtText : styles.paidText]}>{debt ? (purchase ? 'Saldo pendiente' : 'Saldo por cobrar') : purchase ? 'Total pagado' : 'Total cobrado'}</Text>
          <Text accessibilityLabel={`${debt ? 'Saldo' : 'Pagado'}: ${formatMoney(debt ? card.balanceCents : card.paidCents)}`} style={[styles.amount, debt ? styles.debtText : styles.paidText]}>{formatMoney(debt ? card.balanceCents : card.paidCents)}</Text>
        </View>
      ) : (
        <View style={[styles.amountBox, styles.amountNone]}>
          <Text style={styles.amountLabel}>{card.state === 'voided' ? 'Sin efecto' : 'Sin liquidar'}</Text>
          <Text style={[styles.amount, styles.noneText]}>—</Text>
        </View>
      )}
      <View style={styles.actions}>
        {debt && card.sourceId ? (
          <AppButton accessibilityLabel={`${purchase ? 'Abonar' : 'Cobrar'} a ${card.party}, ${card.date}`} disabled={disabled} label={purchase ? 'Abonar' : 'Cobrar'} onPress={() => onSettle(card)} />
        ) : null}
        <AppButton accessibilityLabel={`Ver detalle de ${card.party}, ${card.date}, operación ${card.id}`} disabled={disabled} label="Ver detalle" tone="secondary" onPress={() => onOpen(card)} />
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  toolbar: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { flexBasis: 280, flexGrow: 2, flexShrink: 1 },
  date: { flexBasis: 150, flexGrow: 1, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  metric: { flexBasis: 220, flexGrow: 1 },
  note: { color: color.textSecondary, ...typography.bodySmall },
  count: { color: color.textSecondary, ...typography.bodySmall },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  rowDebt: { borderColor: color.dangerAccent },
  party: { flexBasis: 200, flexGrow: 1, flexShrink: 1, gap: spacing.xs, minWidth: 0 },
  name: { color: color.textPrimary, fontSize: 18, fontWeight: '700', lineHeight: 24 },
  badge: { alignSelf: 'flex-start', borderLeftWidth: 4, flexShrink: 0, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { ...typography.bodySmall, flexShrink: 0, fontWeight: '700' },
  meta: { color: color.textSecondary, ...typography.bodySmall },
  facts: { backgroundColor: color.surface, borderRadius: radius.md, flexBasis: 300, flexDirection: 'row', flexGrow: 2, flexShrink: 1, flexWrap: 'wrap', gap: spacing.md, padding: spacing.sm },
  fact: { flexBasis: 90, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  factLabel: { color: color.textSecondary, fontSize: 12, fontWeight: '700', letterSpacing: 0.4, lineHeight: 16 },
  factValue: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  amountBox: { borderRadius: radius.md, borderWidth: 1, flexBasis: 150, flexGrow: 0, padding: spacing.sm },
  amountDebt: { backgroundColor: color.dangerMuted, borderColor: color.dangerAccent },
  amountPaid: { backgroundColor: color.successMuted, borderColor: color.successAccent },
  amountLabel: { fontSize: 12, fontWeight: '700', lineHeight: 16 },
  amount: { fontSize: 20, fontWeight: '800', lineHeight: 26 },
  amountNone: { backgroundColor: color.surface, borderColor: color.border },
  noneText: { color: color.textSecondary },
  debtText: { color: color.danger },
  paidText: { color: color.success },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pager: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
});
