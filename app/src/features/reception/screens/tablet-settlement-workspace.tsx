import { useMemo, useRef, useState } from 'react';
import { FlatList, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFonts } from 'expo-font';
import type { SettlementScreenProps } from './settlement-screen';
import type { ReceptionSack } from '@/domain/reception/reception';
import type { SackEntryView } from '../components/sack-entry-row';
import { calculatePurchasePreview, formatPreviewMoney } from '@/domain/reception/purchase-preview';
import { PaymentTermsFields } from '../components/payment-terms-fields';
import { PurchaseReferenceHeader, PurchaseReferenceNavigation, purchaseFonts } from '../components/purchase-reference-elements';
import { AppButton, AppScreen, FeedbackState, FormField, LoadingState } from '@/ui/components';
import { KeyboardFocusContext } from '@/ui/components/keyboard-focus-context';
import { useKeyboardScrollFocus } from '@/ui/components/use-keyboard-scroll-focus';

type Props = SettlementScreenProps & { sacks: ReceptionSack[]; sackEntries: SackEntryView[] };

export function TabletSettlementWorkspace(props: Props) {
  const [fontsLoaded, fontError] = useFonts(purchaseFonts);
  const [paymentVisible, setPaymentVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const adapter = useMemo(() => ({ getViewport: () => scrollRef.current?.getNativeScrollRef() ?? null, scrollTo: (offset: number) => scrollRef.current?.scrollTo({ y: offset, animated: true }) }), []);
  const keyboard = useKeyboardScrollFocus(adapter);
  const preview = useMemo(() => calculatePurchasePreview(props.sacks, props.values), [props.sacks, props.values]);
  const display = (field: 'grossCents' | 'freightCents' | 'liquidCents') => preview.kind === 'ready' ? formatPreviewMoney(preview[field]) : 'Pendiente';
  const update = (field: Parameters<Props['onChange']>[0]) => (value: string) => props.onChange(field, value);
  if (!fontsLoaded && !fontError) return <AppScreen><LoadingState label="Cargando liquidación de compra" /></AppScreen>;

  return <>
    <AppScreen scrollable={false} contentContainerStyle={styles.screen} testID="tablet-settlement-screen">
      <PurchaseReferenceHeader context={props.displayContext} stage="Liquidación" />
      {props.notice ? <FeedbackState title="Pendiente de confirmación central" message={props.notice} /> : null}
      {props.errorMessage ? <FeedbackState title="No se pudo liquidar la compra" message={props.errorMessage} tone="error" /> : null}
      {fontError ? <FeedbackState title="Tipografía no disponible" message="Puedes continuar la liquidación con la tipografía del dispositivo." /> : null}
      <View style={styles.columns}>
        <View style={styles.detailColumn}>
          <Text accessibilityRole="header" style={styles.panelTitle}>Pesaje cerrado</Text>
          <Text style={styles.help}>El detalle conservado se mantiene bloqueado durante la liquidación.</Text>
          <FlatList data={props.sackEntries} keyExtractor={(item) => item.id} contentContainerStyle={styles.sackList} renderItem={({ item }) => <View style={styles.sackRow}>
            <View style={styles.weightCell}><Text style={styles.body}>{item.weightDisplay}</Text></View>
            <View style={styles.sackCopy}><Text style={styles.body}>Saco {item.sequence} · {item.varietyName}</Text>{item.detailDisplay ? <Text style={styles.help}>{item.detailDisplay}</Text> : null}</View>
          </View>} />
          <AppButton disabled={props.isSubmitting} label={`Forma de pago: ${props.values.paymentMode === 'cash' ? 'Contado' : `Crédito · ${props.values.installments.length} ${props.values.installments.length === 1 ? 'cuota' : 'cuotas'}`}`} onPress={() => setPaymentVisible(true)} tone="secondary" />
        </View>
        <KeyboardFocusContext.Provider value={keyboard.keyboardFocus}><ScrollView ref={scrollRef} style={styles.panelViewport} contentContainerStyle={[styles.panels, { paddingBottom: keyboard.keyboardInset + 16 }]} onLayout={keyboard.measureKeyboardOcclusion} onContentSizeChange={keyboard.revealFocusedInput} onScroll={keyboard.onScroll} scrollEventThrottle={16} keyboardShouldPersistTaps="handled">
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Resultado</Text>
            <View style={styles.options}>{([['kilogram', 'Por kilogramo'], ['sack', 'Por saco']] as const).map(([value, label]) => <AppButton key={value} disabled={props.isSubmitting} label={label} accessibilityRole="radio" accessibilityState={{ checked: props.values.priceBasis === value }} tone={props.values.priceBasis === value ? 'primary' : 'secondary'} onPress={() => props.onChange('priceBasis', value)} />)}</View>
            <View style={styles.equation}>
              <View style={styles.quantity}><Text style={styles.body}>{preview.kind === 'ready' ? props.values.priceBasis === 'kilogram' ? `${preview.weightKg} kg` : `${preview.sackCount} sacos` : 'Cantidad conservada'}</Text></View>
              <Text style={styles.multiply}>x</Text>
              <View style={styles.rate}><FormField editable={!props.isSubmitting} label={props.values.priceBasis === 'kilogram' ? 'Precio por kilogramo (S/)' : 'Precio por saco (S/)'} keyboardType="decimal-pad" value={props.values.unitPrice} onChangeText={update('unitPrice')} placeholder="0.00" /></View>
            </View>
            <AmountLine label="Total pago bruto provisional" value={display('grossCents')} />
          </View>
          <View style={[styles.panel, styles.freight]}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Flete</Text>
            <View style={styles.options}>{([['none', 'Sin flete'], ['kilogram', 'Por kilogramo'], ['sack', 'Por saco']] as const).map(([value, label]) => <AppButton key={value} disabled={props.isSubmitting} label={label} accessibilityRole="radio" accessibilityState={{ checked: props.values.freightBasis === value }} tone={props.values.freightBasis === value ? 'primary' : 'secondary'} onPress={() => props.onChange('freightBasis', value)} />)}</View>
            {props.values.freightBasis !== 'none' ? <FormField editable={!props.isSubmitting} label="Tarifa de flete (S/)" keyboardType="decimal-pad" value={props.values.freightRate} onChangeText={update('freightRate')} placeholder="0.00" /> : null}
            <AmountLine label="Total flete provisional" value={display('freightCents')} />
          </View>
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.panelTitle}>Resumen</Text>
            <View style={styles.deductions}><View style={styles.deduction}><FormField editable={!props.isSubmitting} label="Adelantos (S/)" keyboardType="decimal-pad" value={props.values.advances} onChangeText={update('advances')} placeholder="0.00" /></View><View style={styles.deduction}><FormField editable={!props.isSubmitting} label="Otros descuentos (S/)" keyboardType="decimal-pad" value={props.values.discounts} onChangeText={update('discounts')} placeholder="0.00" /></View></View>
            <AmountLine label="Total líquido provisional" value={display('liquidCents')} />
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

function AmountLine({ label, value }: { label: string; value: string }) { return <View style={styles.amountRow}><Text style={styles.body}>{label}</Text><View style={styles.amount}><Text accessibilityLabel={`${label}: ${value}`} style={styles.body}>{value}</Text></View></View>; }

const styles = StyleSheet.create({
  screen: { flex: 1, maxWidth: 1440, paddingTop: 9, paddingBottom: 2, gap: 12 },
  columns: { flex: 1, flexDirection: 'row', gap: 65 }, detailColumn: { flex: 1, gap: 12 },
  panelViewport: { width: '43.4%', minWidth: 420, flexGrow: 0, flexShrink: 0 }, panels: { gap: 8 },
  panel: { backgroundColor: '#f4f4f4', borderWidth: 1, borderColor: '#000', borderRadius: 10, padding: 16, gap: 12 },
  freight: { width: '74%', alignSelf: 'flex-end' }, panelTitle: { fontFamily: 'MercadoBentham', color: '#000', fontSize: 24 },
  body: { fontFamily: 'MercadoBentham', color: '#000', fontSize: 16 }, help: { color: '#454545', fontSize: 16, lineHeight: 24 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, equation: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quantity: { backgroundColor: '#d9d9d9', borderRadius: 10, padding: 12, minWidth: 100 }, rate: { flex: 1 }, multiply: { fontFamily: 'MercadoBevan', fontSize: 24, color: '#000' },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', justifyContent: 'space-between' }, amount: { backgroundColor: '#d9d9d9', borderRadius: 10, minHeight: 45, padding: 12, justifyContent: 'center' },
  deductions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, deduction: { flex: 1, minWidth: 160 },
  sackList: { paddingBottom: 16 }, sackRow: { flexDirection: 'row', gap: 24, minHeight: 55, alignItems: 'center', paddingHorizontal: 30 }, sackCopy: { flex: 1 },
  weightCell: { width: 95, minHeight: 45, backgroundColor: '#d9d9d9', borderRadius: 10, padding: 4, alignItems: 'center', justifyContent: 'center' },
});
