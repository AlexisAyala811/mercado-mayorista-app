import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { SettlementScreenProps } from './settlement-screen';
import type { ReceptionSack } from '@/domain/reception/reception';
import type { SackEntryView } from '../components/sack-entry-row';
import { formatPreviewMoney } from '@/domain/reception/purchase-preview';
import { PaymentTermsFields } from '../components/payment-terms-fields';
import { PurchaseReferenceHeader, PurchaseReferenceNavigation } from '../components/purchase-reference-elements';
import { AmountLine, SettlementFreight, SettlementLots } from '../components/settlement-lots';
import { sackRowHeight } from '../sack-list';
import { AppButton, AppScreen, FeedbackState, FormField } from '@/ui/components';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useKeyboardScrollFocus } from '@/ui/components/use-keyboard-scroll-focus';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = SettlementScreenProps & { sacks: ReceptionSack[]; sackEntries: SackEntryView[] };

// MAÑAY settlement (spec 011, T1123): lots A, B… with their own basis and
// price, optional freight with who assumes it, and the provisional summary.
export function TabletSettlementWorkspace(props: Props) {
  const [paymentVisible, setPaymentVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const adapter = useMemo(() => ({ getViewport: () => scrollRef.current?.getNativeScrollRef() ?? null, scrollTo: (offset: number) => scrollRef.current?.scrollTo({ y: offset, animated: true }) }), []);
  const keyboard = useKeyboardScrollFocus(adapter);
  const { preview } = props;
  const display = (field: 'grossCents' | 'liquidCents') => preview.kind === 'ready' ? formatPreviewMoney(preview[field]) : 'Pendiente';
  const update = (field: 'advances' | 'discounts') => (value: string) => props.onChange(field, value);

  return <>
    <AppScreen scrollable={false} contentContainerStyle={styles.screen} testID="tablet-settlement-screen">
      <PurchaseReferenceHeader context={props.displayContext} stage="Liquidación" />
      {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
      {props.errorMessage ? <FeedbackState title="No se pudo liquidar la compra" message={props.errorMessage} tone="error" /> : null}
      <View style={styles.columns}>
        <View style={styles.detailColumn}>
          <Text accessibilityRole="header" style={styles.panelTitle}>Pesaje cerrado</Text>
          <Text style={styles.help}>El detalle conservado se mantiene bloqueado durante la liquidación.</Text>
          <FlatList data={props.sackEntries} keyExtractor={(item) => item.id} contentContainerStyle={styles.sackList}
            getItemLayout={(_, index) => ({ length: sackRowHeight, offset: sackRowHeight * index, index })} initialNumToRender={20} windowSize={7} removeClippedSubviews
            renderItem={({ item }) => <View style={styles.sackRow}>
              <Text style={styles.sequence}>{item.sequence}</Text>
              <Text style={styles.net}>{item.weightDisplay}</Text>
              <View style={styles.sackCopy}><Text numberOfLines={1} style={styles.body}>{item.varietyName}</Text>{item.detailDisplay ? <Text numberOfLines={1} style={styles.help}>{item.detailDisplay}</Text> : null}</View>
            </View>} />
          <AppButton disabled={props.isSubmitting} label={`Forma de pago: ${props.values.paymentMode === 'cash' ? 'Contado' : `Crédito · ${props.values.installments.length} ${props.values.installments.length === 1 ? 'cuota' : 'cuotas'}`}`} onPress={() => setPaymentVisible(true)} tone="secondary" />
        </View>
        <KeyboardFocusContext.Provider value={keyboard.keyboardFocus}><ScrollView ref={scrollRef} style={styles.panelViewport} contentContainerStyle={[styles.panels, { paddingBottom: keyboard.keyboardInset + spacing.md }]} onLayout={keyboard.measureKeyboardOcclusion} onContentSizeChange={keyboard.revealFocusedInput} onScroll={keyboard.onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Lotes</Text>
            <SettlementLots lots={props.lots} drafts={props.values.lots} preview={preview} disabled={props.isSubmitting} onChangeLot={props.onChangeLot} />
            <AmountLine label="Total pago bruto provisional" value={display('grossCents')} />
          </View>
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Flete</Text>
            <SettlementFreight values={props.values} preview={preview} disabled={props.isSubmitting} onChange={props.onChange} />
          </View>
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Resumen</Text>
            <View style={styles.deductions}><View style={styles.deduction}><FormField editable={!props.isSubmitting} label="Adelantos (S/)" keyboardType="decimal-pad" value={props.values.advances} onChangeText={update('advances')} placeholder="0.00" /></View><View style={styles.deduction}><FormField editable={!props.isSubmitting} label="Otros descuentos (S/)" keyboardType="decimal-pad" value={props.values.discounts} onChangeText={update('discounts')} placeholder="0.00" /></View></View>
            <AmountLine label="Total líquido provisional" value={display('liquidCents')} strong />
            <Text style={styles.help}>El servidor verificará los importes y confirmará los efectos comerciales.</Text>
            {preview.kind !== 'ready' ? <FeedbackState title={preview.kind === 'invalid' ? 'Revisa la liquidación' : 'Importes pendientes'} message={preview.message} tone={preview.kind === 'invalid' ? 'error' : undefined} /> : null}
            <AppButton disabled={props.isSubmitting || preview.kind !== 'ready'} label={props.isSubmitting ? 'Confirmando…' : 'Confirmar liquidación'} onPress={props.onSubmit} />
          </View>
        </ScrollView></KeyboardFocusContext.Provider>
      </View>
      <PurchaseReferenceNavigation onBack={props.onGoHistory} onHome={props.onGoHome} onContinue={props.onSubmit} canContinue={preview.kind === 'ready'} busy={props.isSubmitting} continueLabel="Confirmar liquidación" />
    </AppScreen>
    <Modal visible={paymentVisible} animationType="slide" onRequestClose={() => { if (!props.isSubmitting) setPaymentVisible(false); }}>
      <AppScreen><PaymentTermsFields {...props} /><AppButton disabled={props.isSubmitting} label="Volver al resumen" onPress={() => setPaymentVisible(false)} /></AppScreen>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 1440, gap: spacing.sm, paddingBottom: 0 },
  columns: { flex: 1, flexDirection: 'row', gap: spacing.lg }, detailColumn: { flex: 1, gap: spacing.sm },
  panelViewport: { width: '46%', minWidth: 440, flexGrow: 0, flexShrink: 0 }, panels: { gap: spacing.sm },
  panel: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  panelTitle: { color: color.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  body: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' }, help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  deductions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, deduction: { flex: 1, minWidth: 160 },
  sackList: { paddingBottom: spacing.md },
  sackRow: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderBottomColor: color.border, borderBottomWidth: 1, flexDirection: 'row', gap: spacing.md, height: sackRowHeight, paddingHorizontal: spacing.md },
  sequence: { color: color.brand, fontSize: 16, fontWeight: '800', minWidth: 36 },
  net: { color: color.textPrimary, fontSize: 18, fontWeight: '800', width: 130 },
  sackCopy: { flex: 1, minWidth: 0 },
});
