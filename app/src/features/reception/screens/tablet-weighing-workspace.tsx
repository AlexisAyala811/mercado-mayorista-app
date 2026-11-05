import { useMemo, useRef } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';

import type { WeighingScreenProps } from './weighing-screen';
import type { SackEntryView } from '../components/sack-entry-row';
import { PurchaseReferenceHeader, PurchaseReferenceNavigation, purchaseFonts } from '../components/purchase-reference-elements';
import { AppButton, AppScreen, FeedbackState, FormField, LoadingState, SelectionField } from '@/ui/components';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useKeyboardScrollFocus } from '@/ui/components/use-keyboard-scroll-focus';

// Reference: MERCADO / COMPRA 1:346. Keep the original asset's intrinsic dimensions.
const addSackImage = require('../../../../assets/figma/original/compra/imgGroup.svg');

export function TabletWeighingWorkspace(props: WeighingScreenProps) {
  const [fontsLoaded, fontError] = useFonts(purchaseFonts);
  const listRef = useRef<FlatList<SackEntryView>>(null);
  const adapter = useMemo(() => ({
    getViewport: () => {
      const viewport = listRef.current?.getNativeScrollRef();
      return viewport && 'measureInWindow' in viewport ? viewport : null;
    },
    scrollTo: (offset: number) => listRef.current?.scrollToOffset({ offset, animated: true }),
  }), []);
  const keyboard = useKeyboardScrollFocus(adapter);
  const canAdd = Boolean(props.onAddSack && props.selectedVariety && props.currentGrossWeight.trim() && !props.isSubmitting);
  if (!fontsLoaded && !fontError) return <AppScreen><LoadingState label="Cargando interfaz de compra" /></AppScreen>;

  return <AppScreen scrollable={false} contentContainerStyle={styles.screen} testID="tablet-weighing-screen">
    <PurchaseReferenceHeader context={props.displayContext} stage="Pesaje" />
    {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
    {props.errorMessage ? <FeedbackState title="No se pudo completar la operación" message={props.errorMessage} tone="error" /> : null}
    {fontError ? <FeedbackState title="Tipografía no disponible" message="Puedes continuar el pesaje; la apariencia de referencia no está disponible en este dispositivo." /> : null}
    <View style={styles.columns}>
      <View style={styles.capture}>
        {props.characteristics}
        <View style={styles.fields}>
          <View style={styles.variety}><SelectionField label="Variedad de papa" onPress={props.onSelectVariety} placeholder="Seleccionar variedad" value={props.selectedVariety} /></View>
          <View style={styles.weight}><FormField label="Peso bruto (kg)" keyboardType="decimal-pad" value={props.currentGrossWeight} onChangeText={props.onGrossWeightChange} onSubmitEditing={canAdd ? props.onAddSack : undefined} returnKeyType="done" /></View>
          <View style={styles.tare}><FormField label="Tara (kg)" keyboardType="decimal-pad" value={props.currentTare} onChangeText={props.onTareChange} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel={props.isSubmitting ? 'Guardando saco' : 'Agregar saco'} accessibilityState={{ disabled: !canAdd }} disabled={!canAdd} onPress={props.onAddSack} style={({ pressed }) => [styles.add, (!canAdd || pressed) && styles.dimmed]}>
            <Image source={addSackImage} style={styles.addImage} contentFit="contain" accessibilityElementsHidden />
          </Pressable>
        </View>
        <View style={styles.listHeading}><Text style={styles.label}>Peso neto</Text><Text style={styles.label}>Detalle registrado</Text></View>
        <KeyboardFocusContext.Provider value={keyboard.keyboardFocus}><FlatList
          ref={listRef} data={props.entries} keyExtractor={(item) => item.id}
          onLayout={keyboard.measureKeyboardOcclusion} onContentSizeChange={keyboard.revealFocusedInput} onScroll={keyboard.onScroll} scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: keyboard.keyboardInset + 16 }}
          ListEmptyComponent={<Text style={styles.empty}>Selecciona una variedad y registra el primer saco.</Text>}
          renderItem={({ item }) => <Pressable disabled={!props.onEditEntry || props.isSubmitting} accessibilityRole="button" accessibilityLabel={`Corregir saco ${item.sequence}: ${item.varietyName}, ${item.weightDisplay}`} onPress={() => props.onEditEntry?.(item)} style={({ pressed }) => [styles.row, pressed && styles.dimmed]}>
            <View style={styles.weightCell}><Text style={styles.label}>{item.weightDisplay}</Text></View>
            <View style={styles.rowCopy}><Text style={styles.label}>Saco {item.sequence} · {item.varietyName}</Text>{item.detailDisplay ? <Text style={styles.detail}>{item.detailDisplay}</Text> : null}</View>
            <Text style={styles.detail}>Corregir</Text>
          </Pressable>} />
        </KeyboardFocusContext.Provider>
      </View>
      <ScrollView style={styles.resultViewport} contentContainerStyle={styles.resultColumn} keyboardShouldPersistTaps="handled">
        <View style={styles.panel}>
          <Text accessibilityRole="header" style={styles.panelTitle}>Resultado</Text>
          <View style={styles.resultCells}>
            <ResultCell label="Sacos" value={props.summary.sackCountDisplay} />
            <ResultCell label="Peso total" value={props.summary.totalWeightDisplay} />
            <ResultCell label="Peso promedio" value={props.summary.averageWeightDisplay} />
          </View>
          {props.varietySummaries?.map(({ varietyId, varietyName, summary }) => <View key={varietyId} style={styles.varietyResult}>
            <Text style={styles.label}>{varietyName}</Text>
            <Text style={styles.label}>{summary.sackCountDisplay} sacos</Text>
            <Text style={styles.label}>{summary.totalWeightDisplay}</Text>
            <Text style={styles.detail}>Promedio {summary.averageWeightDisplay}</Text>
          </View>)}
          <Text style={styles.detail}>Totales del detalle conservado. Revisa los sacos antes del cierre.</Text>
        </View>
        <View style={[styles.panel, styles.freight]}><Text accessibilityRole="header" style={styles.panelTitle}>Flete</Text><Text style={styles.detail}>Se registra en la liquidación, después de confirmar el cierre del pesaje.</Text></View>
        <View style={styles.panel}><Text accessibilityRole="header" style={styles.panelTitle}>Resumen</Text><Text style={styles.detail}>El precio, los adelantos y el total por pagar se revisan en la liquidación. No se ha confirmado una compra todavía.</Text></View>
        <View style={styles.actions}>{props.onBack ? <AppButton label="Volver a datos" tone="secondary" onPress={props.onBack} /> : null}<AppButton label="Revisar y cerrar pesaje" disabled={!props.onContinue || props.entries.length === 0 || props.isSubmitting} onPress={props.onContinue} /></View>
      </ScrollView>
    </View>
    <PurchaseReferenceNavigation onBack={props.onGoHistory} onHome={props.onGoHome} onContinue={props.onContinue} busy={props.isSubmitting} canContinue={props.entries.length > 0} />
  </AppScreen>;
}

function ResultCell({ label, value }: { label: string; value: string }) {
  return <View style={styles.resultCell}><Text style={styles.label}>{label}</Text><Text style={styles.resultValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 1440, paddingTop: 9, paddingBottom: 2, gap: 12 },
  columns: { flex: 1, flexDirection: 'row', gap: 65 },
  capture: { flex: 1, minWidth: 0 },
  fields: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, paddingBottom: 16 },
  variety: { flex: 1.6 }, weight: { flex: 1 }, tare: { flex: 0.75 },
  add: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  addImage: { width: 41.6667, height: 41.6667 }, dimmed: { opacity: 0.5 },
  listHeading: { flexDirection: 'row', gap: 40, paddingHorizontal: 30, paddingVertical: 8 },
  label: { color: '#000', fontSize: 16, fontFamily: 'MercadoBentham' },
  empty: { color: '#454545', fontSize: 16, padding: 30 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24, minHeight: 55, paddingHorizontal: 30 },
  weightCell: { backgroundColor: '#d9d9d9', borderRadius: 10, minHeight: 45, width: 95, justifyContent: 'center', alignItems: 'center', padding: 4 },
  rowCopy: { flex: 1, gap: 4 }, detail: { color: '#454545', fontSize: 16, lineHeight: 24 },
  resultViewport: { width: '43.4%', minWidth: 420, flexGrow: 0, flexShrink: 0 },
  resultColumn: { gap: 8, paddingBottom: 16 },
  panel: { backgroundColor: '#f4f4f4', borderWidth: 1, borderColor: '#000', borderRadius: 10, padding: 20, gap: 20, minHeight: 165 },
  freight: { width: '74%', alignSelf: 'flex-end' },
  panelTitle: { color: '#000', fontFamily: 'MercadoBentham', fontSize: 24 },
  resultCells: { flexDirection: 'row', gap: 12 }, resultCell: { flex: 1, backgroundColor: '#d9d9d9', borderRadius: 10, padding: 10, gap: 12 },
  resultValue: { fontFamily: 'MercadoBentham', fontSize: 22, color: '#000' },
  varietyResult: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, backgroundColor: '#d9d9d9', borderRadius: 10, padding: 10 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 12, paddingTop: 12 },
});
