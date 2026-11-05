import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { calculatePurchasePreview, formatPreviewMoney } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';
import type { SackEntryView } from '../components/sack-entry-row';
import type { PurchaseDisplayContext } from '../components/purchase-reference-elements';
import { PaymentTermsFields } from '../components/payment-terms-fields';
import { TabletSettlementWorkspace } from './tablet-settlement-workspace';

import { AppButton, AppCard, AppScreen, FeedbackState, FormField, ScreenHeader, StepProgress } from '@/ui/components';
import { spacing } from '@/ui/tokens';
import { useVisualStyles } from '@/ui/visual-theme';

export type InstallmentDraft = { id: string; dueOn: string; amount: string };
export type SettlementDraft = {
  advances: string;
  discounts: string;
  freightBasis: 'none' | 'kilogram' | 'sack';
  freightRate: string;
  installments: InstallmentDraft[];
  paymentMode: 'cash' | 'credit';
  priceBasis: 'kilogram' | 'sack';
  unitPrice: string;
};

export type SettlementScreenProps = {
  displayContext?: PurchaseDisplayContext;
  sacks?: ReceptionSack[];
  sackEntries?: SackEntryView[];
  onGoHome?: () => void;
  onGoHistory?: () => void;
  notice?: string;
  errorMessage?: string;
  isSubmitting?: boolean;
  onAddInstallment: () => void;
  onBack?: () => void;
  onChange: (field: Exclude<keyof SettlementDraft, 'installments'>, value: string) => void;
  onChangeInstallment: (id: string, field: 'amount' | 'dueOn', value: string) => void;
  onRemoveInstallment: (id: string) => void;
  onSubmit: () => void;
  values: SettlementDraft;
};

const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function SettlementScreen(props: SettlementScreenProps) {
  const { notice, errorMessage, isSubmitting, onBack, onChange, onSubmit, values } = props;
  const { width, fontScale } = useWindowDimensions();
  const styles = useVisualStyles(createStyles);
  const [detailVisible, setDetailVisible] = useState(false);
  const preview = useMemo(() => props.sacks ? calculatePurchasePreview(props.sacks, values) : null, [props.sacks, values]);
  if (width >= 1100 && fontScale <= 1.2 && props.sacks && props.sackEntries) return <TabletSettlementWorkspace {...props} sacks={props.sacks} sackEntries={props.sackEntries} />;
  return (
    <>
    <AppScreen contentContainerStyle={styles.screen} testID="settlement-screen">
      <ScreenHeader eyebrow="RECEPCIÓN Y COMPRA" title="Liquidar compra" description="Registra el acuerdo comercial. Los importes definitivos serán calculados y confirmados por el servidor." />
      <StepProgress activeIndex={2} steps={steps} />
      {notice ? <FeedbackState title="Pendiente de confirmación central" message={notice} /> : null}
      {errorMessage ? <FeedbackState message={errorMessage} title="No se pudo liquidar la compra" tone="error" /> : null}
      {props.sackEntries ? <AppButton disabled={isSubmitting} label={`Ver pesaje cerrado (${props.sackEntries.length} ${props.sackEntries.length === 1 ? 'saco' : 'sacos'})`} onPress={() => setDetailVisible(true)} tone="secondary" /> : null}

      <AppCard title="Precio de compra" description="Indica si el precio acordado se aplica por kilogramo o por saco.">
        <View style={styles.toggleRow}>
          <AppButton label="Por kilogramo" onPress={() => onChange('priceBasis', 'kilogram')} accessibilityRole="radio" accessibilityState={{ checked: values.priceBasis === 'kilogram' }} tone={values.priceBasis === 'kilogram' ? 'primary' : 'secondary'} />
          <AppButton label="Por saco" onPress={() => onChange('priceBasis', 'sack')} accessibilityRole="radio" accessibilityState={{ checked: values.priceBasis === 'sack' }} tone={values.priceBasis === 'sack' ? 'primary' : 'secondary'} />
        </View>
        <FormField keyboardType="decimal-pad" label={values.priceBasis === 'kilogram' ? 'Precio por kilogramo (S/)' : 'Precio por saco (S/)'} onChangeText={(v) => onChange('unitPrice', v)} placeholder="0.00" value={values.unitPrice} />
      </AppCard>

      <AppCard title="Flete y deducciones" description="Deja el flete en “Sin flete” cuando no corresponda.">
        <View style={styles.toggleRow}>
          {([['none', 'Sin flete'], ['kilogram', 'Por kilogramo'], ['sack', 'Por saco']] as const).map(([value, label]) => (
            <AppButton key={value} label={label} onPress={() => onChange('freightBasis', value)} accessibilityRole="radio" accessibilityState={{ checked: values.freightBasis === value }} tone={values.freightBasis === value ? 'primary' : 'secondary'} />
          ))}
        </View>
        {values.freightBasis !== 'none' ? <FormField keyboardType="decimal-pad" label="Tarifa de flete (S/)" onChangeText={(v) => onChange('freightRate', v)} placeholder="0.00" value={values.freightRate} /> : null}
        <View style={styles.columns}>
          <View style={styles.column}><FormField keyboardType="decimal-pad" label="Adelantos (S/)" onChangeText={(v) => onChange('advances', v)} placeholder="0.00" value={values.advances} /></View>
          <View style={styles.column}><FormField keyboardType="decimal-pad" label="Otros descuentos (S/)" onChangeText={(v) => onChange('discounts', v)} placeholder="0.00" value={values.discounts} /></View>
        </View>
      </AppCard>

      <PaymentTermsFields {...props} />

      {preview ? <AppCard title="Resumen provisional" description="El servidor verificará los importes y confirmará los efectos comerciales.">
        {preview.kind === 'ready' ? <>
          <Text>{preview.sackCount} sacos · {preview.weightKg} kg netos</Text>
          <Text accessibilityLabel={`Total pago bruto provisional: ${formatPreviewMoney(preview.grossCents)}`}>Total pago bruto provisional: {formatPreviewMoney(preview.grossCents)}</Text>
          <Text accessibilityLabel={`Total flete provisional: ${formatPreviewMoney(preview.freightCents)}`}>Total flete provisional: {formatPreviewMoney(preview.freightCents)}</Text>
          <Text accessibilityLabel={`Total líquido provisional: ${formatPreviewMoney(preview.liquidCents)}`}>Total líquido provisional: {formatPreviewMoney(preview.liquidCents)}</Text>
        </> : <FeedbackState title={preview.kind === 'invalid' ? 'Revisa la liquidación' : 'Importes pendientes'} message={preview.message} tone={preview.kind === 'invalid' ? 'error' : undefined} />}
      </AppCard> : null}

      <View style={styles.actions}>
        {onBack ? <AppButton label="Volver" onPress={onBack} tone="secondary" /> : null}
        <AppButton disabled={isSubmitting || Boolean(preview && preview.kind !== 'ready')} label={isSubmitting ? 'Confirmando…' : 'Confirmar liquidación'} onPress={onSubmit} />
      </View>
    </AppScreen>
    <Modal visible={detailVisible} animationType="slide" onRequestClose={() => { if (!isSubmitting) setDetailVisible(false); }}>
      <AppScreen scrollable={false} contentContainerStyle={styles.closedDetail}>
        <ScreenHeader title="Pesaje cerrado" description="Detalle conservado de la recepción. Solo consulta durante la liquidación." />
        <AppButton disabled={isSubmitting} label="Volver a liquidación" onPress={() => setDetailVisible(false)} />
        <FlatList data={props.sackEntries ?? []} keyExtractor={item => item.id} contentContainerStyle={styles.closedList} renderItem={({ item }) => <AppCard title={`Saco ${item.sequence} · ${item.varietyName}`} description={item.weightDisplay}>{item.detailDisplay ? <Text>{item.detailDisplay}</Text> : null}</AppCard>} />
      </AppScreen>
    </Modal>
    </>
  );
}

const createStyles = () => StyleSheet.create({
  closedDetail: { flex: 1, gap: spacing.md },
  closedList: { gap: spacing.md, paddingBottom: spacing.xl },
  screen: { gap: spacing.xl },
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flexBasis: 260, flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
});
