import { useCallback, useEffect, useRef, useState } from 'react';
import { SymbolView } from '@/ui/components/symbol';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

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
import { color, spacing, typography } from '@/ui/tokens';

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
  // «+ Nueva compra» / «+ Nueva venta» of the Stitch toolbar.
  onNew?: () => void;
};

const pageSize = 20;
const emptyDraft = { from: '', search: '', to: '' };

// Spec 011 (RQ-ST05, Stitch «Ver compras» / «Ver ventas»): the list opens at
// once with search and dates on top, chips with their server counts, three
// totals for the filter and one card per operation.
export function CommercialHistoryList({ kind, loadPage, loadSummary, onOpen, onSettle, disabled = false, initial, onStateChange, onNew }: Props) {
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
          <FormField appearance="stitch" label={purchase ? 'Proveedor' : 'Comprador'} placeholder={purchase ? 'Buscar productor o proveedor…' : 'Buscar comprador…'} value={draft.search} onChangeText={(value) => setDraft((current) => ({ ...current, search: value }))} onSubmitEditing={() => search()} returnKeyType="search" />
        </View>
        <View style={styles.date}><FormField appearance="stitch" label="Desde" placeholder="aaaa-mm-dd" value={draft.from} onChangeText={(value) => setDraft((current) => ({ ...current, from: value }))} /></View>
        <View style={styles.date}><FormField appearance="stitch" label="Hasta" placeholder="aaaa-mm-dd" value={draft.to} onChangeText={(value) => setDraft((current) => ({ ...current, to: value }))} /></View>
        <View style={styles.toolbarActions}>
          <AppButton appearance="stitch-action" disabled={disabled || loading} label="Buscar" onPress={() => search()} stitchTone="brand" />
          <AppButton appearance="stitch-action" disabled={disabled || loading} label="Limpiar" tone="secondary" onPress={() => { setDraft(emptyDraft); search(emptyDraft); }} />
        </View>
        {/* Chips with their count in a bubble and «+ Nueva compra», inside the
            same toolbar as in Stitch. */}
        <View style={styles.chipRow}>
          <View accessibilityRole="radiogroup" style={styles.chips}>
            {historyChips(kind, counts).map((item) => {
              const checked = chip === item.id;
              const look = chipLook[item.id === 'paid' || item.id === 'debt' ? item.id : 'neutral'];
              return (
                <Pressable
                  key={item.id}
                  accessibilityLabel={item.count === null ? item.label : `${item.label}: ${item.count}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked, disabled: disabled || loading }}
                  disabled={disabled || loading}
                  onPress={() => choose(item.id)}
                  style={({ pressed }) => [styles.chip, { backgroundColor: checked ? '#0F2A1F' : look.bg }, pressed && styles.chipPressed]}>
                  {look.dot ? <View style={[styles.chipDot, { backgroundColor: look.dot }]} /> : null}
                  <Text numberOfLines={1} style={[styles.chipText, { color: checked ? '#FFFFFF' : look.ink }]}>{item.label}</Text>
                  {item.count === null ? null : (
                    <View style={[styles.bubble, { backgroundColor: checked ? 'rgba(255,255,255,0.22)' : look.bubble }]}>
                      <Text style={[styles.bubbleText, { color: checked ? '#FFFFFF' : look.bubbleInk }]}>{item.count}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          {onNew ? <AppButton appearance="stitch-action" disabled={disabled} displayLabel={purchase ? '+ NUEVA COMPRA' : '+ NUEVA VENTA'} label={purchase ? 'Nueva compra' : 'Nueva venta'} onPress={onNew} stitchTone="success" /> : null}
        </View>
      </View>

      {summary === 'unavailable' ? <Text style={styles.note}>Totales no disponibles sin conexión.</Text> : null}
      {summary && summary !== 'unavailable' ? (
        <View style={styles.metrics}>
          <MetricTile appearance="stitch" label={purchase ? 'Total compras' : 'Total ventas'} value={formatMoney(summary.totalCents)} />
          <MetricTile appearance="stitch" label={purchase ? 'Total pagado' : 'Total cobrado'} tone="success" value={formatMoney(summary.paidCents)} />
          <MetricTile appearance="stitch" label={purchase ? 'Saldo pendiente' : 'Saldo por cobrar'} tone="danger" value={formatMoney(summary.balanceCents)} />
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
          <AppButton appearance="stitch-action" disabled={disabled || offset === 0} label="Página anterior" tone="secondary" onPress={() => move(Math.max(0, offset - pageSize))} />
          <AppButton appearance="stitch-action" disabled={disabled || offset + items.length >= total} label="Página siguiente" tone="secondary" onPress={() => move(offset + pageSize)} />
        </View>
      ) : null}
    </View>
  );
}

// Chip colours of the mockup: neutral grey, green «Pagadas» and red «Con deuda»,
// each with its count in a darker bubble; the chosen one is dark green.
const chipLook = {
  neutral: { bg: '#F1F5F9', ink: '#334155', bubble: '#E2E8F0', bubbleInk: '#334155', dot: null },
  paid: { bg: '#ECFDF5', ink: '#065F46', bubble: '#047857', bubbleInk: '#FFFFFF', dot: '#10B981' },
  debt: { bg: '#FEF2F2', ink: '#991B1B', bubble: '#DC2626', bubbleInk: '#FFFFFF', dot: '#DC2626' },
} as const;

const stateTone = {
  debt: { tile: '#FEF2F2', tileBorder: '#FECACA', ink: '#B91C1C', pill: '#FEE2E2', pillInk: '#991B1B' },
  paid: { tile: '#ECFDF5', tileBorder: '#A7F3D0', ink: '#047857', pill: '#D1FAE5', pillInk: '#065F46' },
  unsettled: { tile: '#FFFBEB', tileBorder: '#FDE68A', ink: '#B45309', pill: '#FEF3C7', pillInk: '#92400E' },
  voided: { tile: '#F8FAFC', tileBorder: '#E2E8F0', ink: '#475569', pill: '#E2E8F0', pillInk: '#334155' },
} as const;

function HistoryRow({ card, disabled, kind, onOpen, onSettle }: { card: HistoryCard; disabled: boolean; kind: HistoryKind; onOpen: (card: HistoryCard) => void; onSettle: (card: HistoryCard) => void }) {
  const state = historyStateLabel(kind, card.state);
  const purchase = kind === 'purchase';
  const debt = card.state === 'debt';
  const palette = stateTone[card.state];
  // With large text the blocks need more room and wrap to their own lines (T1190).
  const grow = Math.min(Math.max(useWindowDimensions().fontScale, 1), 2);
  return (
    <View style={styles.row} testID={`history-${card.id}`}>
      <View style={[styles.party, { flexBasis: 240 * grow }]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.avatar, { backgroundColor: palette.tile, borderColor: palette.tileBorder }]}>
          <SymbolView fallback={null} name={{ android: 'person', ios: 'person.fill', web: 'person' }} size={24} tintColor={palette.ink} />
        </View>
        <View style={styles.partyCopy}>
          <View style={styles.nameLine}>
            <Text numberOfLines={2} style={styles.name}>{card.party}</Text>
            <View accessibilityLabel={`Estado: ${state}`} style={[styles.badge, { backgroundColor: palette.pill }]}><Text numberOfLines={1} style={[styles.badgeText, { color: palette.pillInk }]}>{state}</Text></View>
          </View>
          <Text style={styles.meta}>{`#${card.id.slice(0, 8).toUpperCase()} • ${card.date}`}</Text>
        </View>
      </View>
      <View style={[styles.facts, { flexBasis: 320 * grow }]}>
        <Fact label="Variedad" value={historyVarieties(card)} />
        <Fact label="Volumen / peso" value={historyVolume(card)} />
        <Fact label={purchase ? 'Total / abonado' : 'Total / cobrado'} value={card.totalCents === null ? 'Sin liquidar' : `${formatMoney(card.totalCents)}${debt ? ` (Ab. ${formatMoney(card.paidCents)})` : ''}`} />
      </View>
      {/* Voided or not settled: no payment to show (spec 011, RQ-ST05). */}
      {debt || card.state === 'paid' ? (
        <View style={[styles.amountBox, { backgroundColor: debt ? '#FEF2F2' : '#FFFFFF', borderColor: debt ? '#FECACA' : '#E2E8F0' }]}>
          <Text style={[styles.amountLabel, { color: debt ? '#B91C1C' : '#64748B' }]}>{debt ? (purchase ? 'SALDO PENDIENTE' : 'SALDO POR COBRAR') : purchase ? 'TOTAL PAGADO' : 'TOTAL COBRADO'}</Text>
          <Text accessibilityLabel={`${debt ? 'Saldo' : 'Pagado'}: ${formatMoney(debt ? card.balanceCents : card.paidCents)}`} style={[styles.amount, { color: debt ? '#B91C1C' : '#047857' }]}>{formatMoney(debt ? card.balanceCents : card.paidCents)}</Text>
        </View>
      ) : (
        <View style={[styles.amountBox, { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }]}>
          <Text style={[styles.amountLabel, { color: '#64748B' }]}>{card.state === 'voided' ? 'SIN EFECTO' : 'SIN LIQUIDAR'}</Text>
          <Text style={[styles.amount, styles.noneText]}>—</Text>
        </View>
      )}
      <View style={styles.actions}>
        {debt && card.sourceId ? (
          <AppButton accessibilityLabel={`${purchase ? 'Abonar' : 'Cobrar'} a ${card.party}, ${card.date}`} appearance="stitch-action" disabled={disabled} displayLabel={purchase ? 'ABONAR / LIQUIDAR' : 'REGISTRAR COBRO'} label={purchase ? 'Abonar' : 'Cobrar'} onPress={() => onSettle(card)} stitchTone="danger" />
        ) : null}
        <AppButton accessibilityLabel={`Ver detalle de ${card.party}, ${card.date}, operación ${card.id}`} appearance="stitch-action" disabled={disabled} displayLabel="VER DETALLE" label="Ver detalle" onPress={() => onOpen(card)} stitchTone={debt ? 'neutral' : 'success'} tone="secondary" />
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factLabel}>{label.toUpperCase()}</Text>
      <Text numberOfLines={2} style={styles.factValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  toolbar: { alignItems: 'flex-end', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16 },
  search: { flexBasis: 260, flexGrow: 2, flexShrink: 1 },
  date: { flexBasis: 140, flexGrow: 1, flexShrink: 1 },
  toolbarActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipRow: { alignItems: 'center', flexBasis: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  chips: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 4 },
  chip: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 14 },
  chipPressed: { opacity: 0.85 },
  chipDot: { borderRadius: 4, height: 8, width: 8 },
  chipText: { fontSize: 14, fontWeight: '700' },
  bubble: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minWidth: 24, paddingHorizontal: 7, paddingVertical: 2 },
  bubbleText: { fontSize: 12, fontWeight: '800' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  note: { color: color.textSecondary, ...typography.bodySmall },
  count: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexDirection: 'row', flexWrap: 'wrap', gap: 16, padding: 16 },
  party: { alignItems: 'center', flexBasis: 240, flexDirection: 'row', flexGrow: 1, flexShrink: 1, gap: 12, minWidth: 0 },
  avatar: { alignItems: 'center', borderRadius: 12, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  partyCopy: { flexShrink: 1, gap: 4, minWidth: 0 },
  nameLine: { alignItems: 'center', flexDirection: 'row', gap: 8, minWidth: 0 },
  name: { color: '#0F172A', flexShrink: 1, fontSize: 16, fontWeight: '700', lineHeight: 22, minWidth: 0 },
  badge: { borderRadius: 999, flexShrink: 0, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
  meta: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  facts: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexBasis: 320, flexDirection: 'row', flexGrow: 2, flexShrink: 1, flexWrap: 'wrap', gap: 12, padding: 12 },
  fact: { flexBasis: 90, flexGrow: 1, flexShrink: 1, gap: 2, minWidth: 0 },
  factLabel: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  factValue: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  amountBox: { borderRadius: 12, borderWidth: 1, flexBasis: 140, flexGrow: 0, gap: 2, padding: 10 },
  amountLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  amount: { fontSize: 18, fontWeight: '800' },
  noneText: { color: '#64748B' },
  actions: { flexDirection: 'row', flexShrink: 0, flexWrap: 'wrap', gap: 8 },
  pager: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
});
