import { useCallback, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { WeighingScreenProps } from './weighing-screen';
import type { SackEntryView } from '../components/sack-entry-row';
import { PurchaseReferenceHeader, PurchaseReferenceNavigation } from '../components/purchase-reference-elements';
import { findSackIndex, sackRowHeight } from '../sack-list';
import { AppButton, AppScreen, FeedbackState, FormField, SelectionField } from '@/ui/components';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useKeyboardScrollFocus } from '@/ui/components/use-keyboard-scroll-focus';
import { color, radius, spacing, typography } from '@/ui/tokens';

// MAÑAY weighing (spec 011, T1120–T1122): whole kilograms, totals fixed outside
// the list and a virtualised list with fixed rows so 200+ sacks stay fluid.
export function TabletWeighingWorkspace(props: WeighingScreenProps) {
  const listRef = useRef<FlatList<SackEntryView>>(null);
  const [target, setTarget] = useState('');
  const [targetMessage, setTargetMessage] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const adapter = useMemo(() => ({
    getViewport: () => {
      const viewport = listRef.current?.getNativeScrollRef();
      return viewport && 'measureInWindow' in viewport ? viewport : null;
    },
    scrollTo: (offset: number) => listRef.current?.scrollToOffset({ offset, animated: true }),
  }), []);
  const keyboard = useKeyboardScrollFocus(adapter);
  const canAdd = Boolean(props.onAddSack && props.selectedVariety && props.currentGrossWeight.trim() && !props.isSubmitting);
  const getItemLayout = useCallback((_: ArrayLike<SackEntryView> | null | undefined, index: number) => ({ length: sackRowHeight, offset: sackRowHeight * index, index }), []);

  function goToSack() {
    const index = findSackIndex(props.entries, target);
    if (index === null) { setTargetMessage('Escribe el número del saco.'); return; }
    if (index < 0) { setTargetMessage(`No hay un saco ${target.trim()} vigente.`); return; }
    setTargetMessage(null);
    setHighlightedId(props.entries[index]!.id);
    listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.3 });
  }

  return <AppScreen scrollable={false} contentContainerStyle={styles.screen} testID="tablet-weighing-screen">
    <PurchaseReferenceHeader context={props.displayContext} stage="Pesaje" />
    {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
    {props.errorMessage ? <FeedbackState title="No se pudo completar la operación" message={props.errorMessage} tone="error" /> : null}
    <View style={styles.columns}>
      <ScrollView style={styles.captureViewport} contentContainerStyle={styles.captureColumn} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Saco {nextSequence(props.entries)}</Text>
          <SelectionField label="Variedad de papa" onPress={props.onSelectVariety} placeholder="Seleccionar variedad" value={props.selectedVariety} />
          <View style={styles.fields}>
            <View style={styles.weight}><FormField label="Peso bruto (kg)" keyboardType="number-pad" value={props.currentGrossWeight} onChangeText={props.onGrossWeightChange} onSubmitEditing={canAdd ? props.onAddSack : undefined} returnKeyType="done" placeholder="52" /></View>
            <View style={styles.weight}><FormField label="Tara (kg)" keyboardType="number-pad" value={props.currentTare} onChangeText={props.onTareChange} placeholder="0" /></View>
            <AppButton label={props.isSubmitting ? 'Guardando…' : 'Agregar saco'} accessibilityLabel={props.isSubmitting ? 'Guardando saco' : 'Agregar saco'} disabled={!canAdd} onPress={props.onAddSack} />
          </View>
          <Text style={styles.detail}>Kilos enteros. El neto se calcula como bruto menos tara.</Text>
          {props.characteristics}
        </View>
        <ResultPanel {...props} />
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.cardTitle}>Siguiente paso</Text>
          <Text style={styles.detail}>El precio por lote, el flete, los adelantos y el total por pagar se revisan en la liquidación. Todavía no se ha confirmado una compra.</Text>
        </View>
        <View style={styles.actions}><AppButton label="Revisar y cerrar pesaje" disabled={!props.onContinue || props.entries.length === 0 || props.isSubmitting} onPress={props.onContinue} /></View>
      </ScrollView>
      <View style={styles.listColumn}>
        <View style={styles.listHeading}>
          <Text accessibilityRole="header" style={styles.listTitle}>Detalle registrado</Text>
          <View style={styles.goTo}>
            <View style={styles.goToField}><FormField label="Ir al saco" accessibilityLabel="Número del saco" keyboardType="number-pad" value={target} onChangeText={(value) => { setTarget(value); setTargetMessage(null); }} onSubmitEditing={goToSack} returnKeyType="go" placeholder="N.°" error={targetMessage ?? undefined} /></View>
            <AppButton label="Ir" accessibilityLabel="Ir al saco" tone="secondary" disabled={!props.entries.length} onPress={goToSack} />
          </View>
        </View>
        <KeyboardFocusContext.Provider value={keyboard.keyboardFocus}><FlatList
          ref={listRef} data={props.entries} keyExtractor={(item) => item.id} testID="sack-list"
          getItemLayout={getItemLayout} initialNumToRender={20} maxToRenderPerBatch={20} windowSize={7} removeClippedSubviews
          onLayout={keyboard.measureKeyboardOcclusion} onContentSizeChange={keyboard.revealFocusedInput} onScroll={keyboard.onScroll} scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: keyboard.keyboardInset + spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>Selecciona una variedad y registra el primer saco.</Text>}
          renderItem={({ item }) => <SackRow item={item} highlighted={item.id === highlightedId} disabled={!props.onEditEntry || Boolean(props.isSubmitting)} onPress={() => props.onEditEntry?.(item)} />} />
        </KeyboardFocusContext.Provider>
      </View>
    </View>
    <PurchaseReferenceNavigation onStepBack={props.onBack} onHome={props.onGoHome} onContinue={props.onContinue} busy={props.isSubmitting} canContinue={props.entries.length > 0} />
  </AppScreen>;
}

function ResultPanel(props: WeighingScreenProps) {
  return <>
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>Resultado</Text>
      <View style={styles.resultCells}>
        <ResultCell label="Sacos" value={props.summary.sackCountDisplay} />
        <ResultCell label="Peso neto total" value={props.summary.totalWeightDisplay} />
        <ResultCell label="Promedio" value={props.summary.averageWeightDisplay} />
      </View>
      {props.varietySummaries?.map(({ varietyId, varietyName, summary }) => <View key={varietyId} style={styles.varietyResult}>
        <Text style={styles.varietyName}>{varietyName}</Text>
        <Text style={styles.detail}>{summary.sackCountDisplay} sacos · {summary.totalWeightDisplay} · promedio {summary.averageWeightDisplay}</Text>
      </View>)}
      <Text style={styles.detail}>Totales del detalle conservado. Revisa los sacos antes del cierre.</Text>
    </View>
  </>;
}

function nextSequence(entries: readonly SackEntryView[]) {
  return entries.reduce((max, entry) => Math.max(max, entry.sequence), 0) + 1;
}

function SackRow({ item, highlighted, disabled, onPress }: { item: SackEntryView; highlighted: boolean; disabled: boolean; onPress: () => void }) {
  return <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Corregir saco ${item.sequence}: ${item.varietyName}, ${item.weightDisplay}`} onPress={onPress}
    style={({ pressed }) => [styles.row, highlighted && styles.rowHighlighted, pressed && styles.dimmed]}>
    <View style={styles.sequence}><Text style={styles.sequenceText}>{item.sequence}</Text></View>
    <Text style={styles.net}>{item.weightDisplay}</Text>
    <View style={styles.rowCopy}>
      <Text numberOfLines={1} style={styles.varietyName}>{item.varietyName}</Text>
      {item.detailDisplay ? <Text numberOfLines={1} style={styles.detail}>{item.detailDisplay}</Text> : null}
    </View>
    <Text style={styles.edit}>Corregir</Text>
  </Pressable>;
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return <View style={styles.resultCell}><Text style={styles.resultLabel}>{label}</Text><Text style={styles.resultValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 1440, gap: spacing.sm, paddingBottom: 0 },
  columns: { flex: 1, flexDirection: 'row', gap: spacing.lg },
  captureViewport: { width: '44%', minWidth: 460, flexGrow: 0, flexShrink: 0 },
  captureColumn: { gap: spacing.sm, paddingBottom: spacing.md },
  listColumn: { flex: 1, minWidth: 0, gap: spacing.sm },
  card: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  cardTitle: { color: color.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  fields: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  weight: { flex: 1 },
  listHeading: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  listTitle: { color: color.textPrimary, ...typography.body, fontWeight: '700', paddingBottom: spacing.sm },
  goTo: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  goToField: { width: 160 },
  empty: { color: color.textSecondary, ...typography.bodySmall, padding: spacing.lg },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderBottomColor: color.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, height: 64, paddingHorizontal: spacing.md },
  rowHighlighted: { backgroundColor: color.brandMuted },
  sequence: { alignItems: 'center', backgroundColor: color.brandMuted, borderRadius: 22, height: 44, justifyContent: 'center', minWidth: 44, paddingHorizontal: spacing.xs },
  sequenceText: { color: color.brand, fontSize: 16, fontWeight: '800' },
  net: { color: color.textPrimary, fontSize: 18, fontWeight: '800', width: 130 },
  rowCopy: { flex: 1, minWidth: 0 },
  varietyName: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  detail: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  edit: { color: color.brand, ...typography.bodySmall, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
  resultCells: { flexDirection: 'row', gap: spacing.sm },
  resultCell: { flex: 1, backgroundColor: color.brandMuted, borderRadius: radius.sm, gap: spacing.xs, padding: spacing.sm },
  resultLabel: { color: color.brand, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  resultValue: { color: color.textPrimary, fontSize: 22, fontWeight: '800', lineHeight: 28 },
  varietyResult: { borderTopColor: color.border, borderTopWidth: 1, gap: spacing.xs, paddingTop: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: spacing.sm, paddingTop: spacing.sm },
});
