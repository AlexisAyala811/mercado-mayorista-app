import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { formatPreviewMoney, type FreightChargedTo, type LotDraft, type PurchaseLot, type PurchasePreview } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';
import type { SackEntryView } from '../components/sack-entry-row';
import type { PurchaseDisplayContext } from '../components/purchase-reference-elements';
import { PaymentTermsFields } from '../components/payment-terms-fields';
import { AmountLine, SettlementFreight, SettlementLots, type LotField } from '../components/settlement-lots';
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
  freightChargedTo: FreightChargedTo;
  installments: InstallmentDraft[];
  paymentMode: 'cash' | 'credit';
  lots: Record<string, LotDraft>;
};
export type SettlementField = Exclude<keyof SettlementDraft, 'installments' | 'lots'>;

export type SettlementScreenProps = {
  displayContext?: PurchaseDisplayContext;
  sacks?: ReceptionSack[];
  sackEntries?: SackEntryView[];
  lots: readonly PurchaseLot[];
  preview: PurchasePreview;
  onGoHome?: () => void;
  onGoHistory?: () => void;
  notice?: string;
  errorMessage?: string;
  isSubmitting?: boolean;
  onAddInstallment: () => void;
  onBack?: () => void;
  onChange: (field: SettlementField, value: string) => void;
  onChangeLot: (key: string, field: LotField, value: string) => void;
  onChangeInstallment: (id: string, field: 'amount' | 'dueOn', value: string) => void;
  onRemoveInstallment: (id: string) => void;
  onSubmit: () => void;
  values: SettlementDraft;
};

const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function SettlementScreen(props: SettlementScreenProps) {
  const { notice, errorMessage, isSubmitting, onBack, onChange, onSubmit, values, preview } = props;
  const { width, fontScale } = useWindowDimensions();
  const styles = useVisualStyles(createStyles);
  const [detailVisible, setDetailVisible] = useState(false);
  if (width >= 1100 && fontScale <= 1.2 && props.sacks && props.sackEntries) return <TabletSettlementWorkspace {...props} sacks={props.sacks} sackEntries={props.sackEntries} />;
  return (
    <>
    <AppScreen contentContainerStyle={styles.screen} testID="settlement-screen">
      <ScreenHeader eyebrow="RECEPCIÓN Y COMPRA" title="Liquidar compra" description="Registra el precio de cada lote. Los importes definitivos serán calculados y confirmados por el servidor." />
      <StepProgress activeIndex={2} steps={steps} />
      {notice ? <FeedbackState title="Pendiente de confirmación central" message={notice} /> : null}
      {errorMessage ? <FeedbackState message={errorMessage} title="No se pudo liquidar la compra" tone="error" /> : null}
      {props.sackEntries ? <AppButton disabled={isSubmitting} label={`Ver pesaje cerrado (${props.sackEntries.length} ${props.sackEntries.length === 1 ? 'saco' : 'sacos'})`} onPress={() => setDetailVisible(true)} tone="secondary" /> : null}

      <AppCard title="Lotes de la compra" description="Un lote por variedad y calidad. Cada lote tiene su base y su precio.">
        <SettlementLots lots={props.lots} drafts={values.lots} preview={preview} disabled={isSubmitting} onChangeLot={props.onChangeLot} />
      </AppCard>

      <AppCard title="Flete y deducciones" description="Deja el flete en «Sin flete» cuando no corresponda.">
        <SettlementFreight values={values} preview={preview} disabled={isSubmitting} onChange={onChange} />
        <View style={styles.columns}>
          <View style={styles.column}><FormField keyboardType="decimal-pad" label="Adelantos (S/)" onChangeText={(v) => onChange('advances', v)} placeholder="0.00" value={values.advances} /></View>
          <View style={styles.column}><FormField keyboardType="decimal-pad" label="Otros descuentos (S/)" onChangeText={(v) => onChange('discounts', v)} placeholder="0.00" value={values.discounts} /></View>
        </View>
      </AppCard>

      <PaymentTermsFields {...props} />

      <AppCard title="Resumen provisional" description="El servidor verificará los importes y confirmará los efectos comerciales.">
        {preview.kind === 'ready' ? <>
          <Text>{preview.sackCount} sacos · {props.lots.length} {props.lots.length === 1 ? 'lote' : 'lotes'}</Text>
          <AmountLine label="Total pago bruto provisional" value={formatPreviewMoney(preview.grossCents)} />
          <AmountLine label={preview.freightDeducted ? 'Total flete provisional' : 'Flete no descontado'} value={formatPreviewMoney(preview.freightDeducted ? preview.freightCents : '0')} />
          <AmountLine label="Total líquido provisional" value={formatPreviewMoney(preview.liquidCents)} strong />
        </> : <FeedbackState title={preview.kind === 'invalid' ? 'Revisa la liquidación' : 'Importes pendientes'} message={preview.message} tone={preview.kind === 'invalid' ? 'error' : undefined} />}
      </AppCard>

      <View style={styles.actions}>
        {onBack ? <AppButton label="Volver" onPress={onBack} tone="secondary" /> : null}
        <AppButton disabled={isSubmitting || preview.kind !== 'ready'} label={isSubmitting ? 'Confirmando…' : 'Confirmar liquidación'} onPress={onSubmit} />
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
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  column: { flexBasis: 260, flexGrow: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
});
