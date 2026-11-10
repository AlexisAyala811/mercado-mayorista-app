import { useMemo, useRef,type ReactNode } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { PurchaseDisplayContext } from '../components/purchase-reference-elements';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useKeyboardScrollFocus } from '@/ui/components/use-keyboard-scroll-focus';

import { SackEntryRow, type SackEntryView } from '@/features/reception/components/sack-entry-row';
import {
  AppButton,
  AppCard,
  AppScreen,
  EmptyState,
  FeedbackState,
  FormField,
  MetricTile,
  ScreenHeader,
  SelectionField,
  StepProgress,
} from '@/ui/components';
import { spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { BottomNavSlots } from '@/ui/navigation/app-chrome';

type WeighingSummary = {
  averageWeightDisplay: string;
  sackCountDisplay: string;
  totalWeightDisplay: string;
};

export type WeighingScreenProps = {
  characteristics?:ReactNode;
  displayContext?: PurchaseDisplayContext;
  onGoHome?: () => void;
  onGoHistory?: () => void;
  varietySummaries?: { varietyId: string; varietyName: string; summary: WeighingSummary }[];
  notice?: string;
  currentGrossWeight: string;
  currentTare: string;
  entries: SackEntryView[];
  onAddSack?: () => void;
  onBack?: () => void;
  onContinue?: () => void;
  onEditEntry?: (entry: SackEntryView) => void;
  onSelectVariety?: () => void;
  onGrossWeightChange: (value: string) => void;
  onTareChange: (value: string) => void;
  errorMessage?: string;
  isSubmitting?: boolean;
  selectedVariety?: string;
  summary: WeighingSummary;
};

const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function WeighingScreen({
  notice,
  currentGrossWeight,
  currentTare,
  entries,
  onAddSack,
  onBack,
  onContinue,
  onEditEntry,
  onSelectVariety,
  onGrossWeightChange,
  onTareChange,
  errorMessage,
  isSubmitting,
  selectedVariety,
  summary,
  displayContext,
  onGoHome,
  onGoHistory,
  varietySummaries,
  characteristics,
}: WeighingScreenProps) {
  const styles = useVisualStyles(createStyles);
  const canAdd = Boolean(onAddSack && selectedVariety && currentGrossWeight.trim() && !isSubmitting);
  const listRef = useRef<FlatList<SackEntryView>>(null);
  const scrollAdapter = useMemo(() => ({
    getViewport: () => {
      const viewport = listRef.current?.getNativeScrollRef();
      return viewport && 'measureInWindow' in viewport ? viewport : null;
    },
    scrollTo: (offset: number) => listRef.current?.scrollToOffset({ offset, animated: true }),
  }), []);
  const keyboard = useKeyboardScrollFocus(scrollAdapter);


  return (
    <AppScreen contentContainerStyle={styles.screen} scrollable={false} testID="weighing-screen">
      <KeyboardFocusContext.Provider value={keyboard.keyboardFocus}><FlatList
        ref={listRef}
        onLayout={keyboard.measureKeyboardOcclusion}
        onContentSizeChange={keyboard.revealFocusedInput}
        onScroll={keyboard.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.listContent, { paddingBottom: spacing.xl + keyboard.keyboardInset }]}
        data={entries}
        ItemSeparatorComponent={ListSeparator}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(entry) => entry.id}
        ListEmptyComponent={
          <EmptyState
            message="Selecciona una variedad e ingresa el peso para registrar el primer saco."
            title="Aún no hay sacos registrados"
          />
        }
        ListFooterComponent={
          <View style={styles.actions}>
            <BottomNavSlots back={onBack ? { label: "Atrás", accessibilityLabel: "Volver a datos", onPress: onBack } : null} home={onGoHome ? { label: "Menú principal", onPress: onGoHome } : null} />
            <AppButton disabled={!onContinue || entries.length === 0} label="Revisar y cerrar pesaje" onPress={onContinue} />
          </View>
        }
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <ScreenHeader
              description="Registra cada saco en el orden de descarga. Los totales mostrados provienen del detalle conservado."
              eyebrow="RECEPCIÓN Y COMPRA"
              title="Pesaje de sacos"
            />
            <StepProgress activeIndex={1} steps={steps} />
            {notice ? <FeedbackState title="Pendiente de confirmación central" message={notice} /> : null}
            {errorMessage ? <FeedbackState message={errorMessage} title="No se pudo completar la operación" tone="error" /> : null}
            <View style={styles.metrics}>
              <MetricTile label="Sacos registrados" value={summary.sackCountDisplay} />
              <MetricTile label="Peso total" value={summary.totalWeightDisplay} />
              <MetricTile label="Peso promedio" value={summary.averageWeightDisplay} />
            </View>
            {varietySummaries?.map(({ varietyId, varietyName, summary: totals }) => <AppCard key={varietyId} title={varietyName}>
              <View style={styles.metrics}>
                <MetricTile label="Sacos de esta variedad" value={totals.sackCountDisplay} />
                <MetricTile label="Peso de esta variedad" value={totals.totalWeightDisplay} />
                <MetricTile label="Promedio de esta variedad" value={totals.averageWeightDisplay} />
              </View>
            </AppCard>)}
            <AppCard
              description="Confirma la variedad y el peso antes de agregar cada saco."
              title={`Saco ${entries.length + 1}`}>
              {characteristics}
              <View style={styles.captureFields}>
                <View style={styles.captureField}>
                  <SelectionField
                    label="Variedad"
                    onPress={onSelectVariety}
                    placeholder="Selecciona una variedad"
                    value={selectedVariety}
                  />
                </View>
                <View style={styles.captureField}>
                  <FormField
                    keyboardType="number-pad"
                    label="Peso bruto (kg)"
                    onChangeText={onGrossWeightChange}
                    onSubmitEditing={canAdd ? onAddSack : undefined}
                    placeholder="Ingresa el peso"
                    returnKeyType="done"
                    value={currentGrossWeight}
                  />
                </View>
                <View style={styles.captureField}>
                  <FormField
                    keyboardType="number-pad"
                    label="Tara (kg)"
                    onChangeText={onTareChange}
                    placeholder="0"
                    supportingText="Kilos enteros; se descuenta del bruto."
                    value={currentTare}
                  />
                </View>
                <AppButton disabled={!canAdd} label={isSubmitting ? 'Guardando…' : 'Agregar saco'} onPress={onAddSack} />
              </View>
            </AppCard>
            <View style={styles.listHeading}>
              <Text accessibilityRole="header" style={styles.listTitle}>
                Detalle registrado
              </Text>
              <Text style={styles.listHelp}>Las correcciones requieren autorización y quedan sujetas a auditoría.</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => <SackEntryRow entry={item} onEdit={onEditEntry} />}
      /></KeyboardFocusContext.Provider>
    </AppScreen>
  );
}

function ListSeparator() {
  const styles = useVisualStyles(createStyles);
  return <View style={styles.separator} />;
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  screen: { flex: 1 },
  listContent: { flexGrow: 1, paddingBottom: spacing.xl },
  headerContent: { gap: spacing.xl, paddingBottom: spacing.lg },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  captureFields: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  captureField: { flexBasis: 260, flexGrow: 1 },
  listHeading: { gap: spacing.xs },
  listTitle: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  listHelp: { color: color.textSecondary, ...typography.bodySmall },
  separator: { height: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end', paddingTop: spacing.lg },
});
