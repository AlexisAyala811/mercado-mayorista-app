import { StyleSheet, View } from 'react-native';

import type { PurchaseSettlement } from '@/domain/reception/reception';
import { formatMoney } from '@/domain/reception/reception';
import { AppButton, AppCard, AppScreen, FeedbackState, MetricTile, ScreenHeader, StepProgress } from '@/ui/components';
import { spacing } from '@/ui/tokens';

type Props = { onFinish: () => void; settlement: PurchaseSettlement };
const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function PurchaseConfirmationScreen({ onFinish, settlement }: Props) {
  return (
    <AppScreen contentContainerStyle={styles.screen} testID="purchase-confirmation-screen">
      <ScreenHeader eyebrow="RECEPCIÓN Y COMPRA" title="Compra confirmada" description="La recepción, el pesaje y los efectos comerciales quedaron registrados." />
      <StepProgress activeIndex={3} steps={steps} />
      <FeedbackState title="Operación confirmada" message="El servidor confirmó la liquidación y sus importes." tone="success" />
      <AppCard title="Resumen de liquidación">
        <View style={styles.metrics}>
          <MetricTile label="Importe bruto" value={formatMoney(settlement.grossAmountCents)} />
          <MetricTile label="Flete" value={formatMoney(settlement.freightAmountCents)} />
          <MetricTile label="Adelantos" value={formatMoney(settlement.advancesCents)} />
          <MetricTile label="Descuentos" value={formatMoney(settlement.discountsCents)} />
          <MetricTile label="Monto líquido" value={formatMoney(settlement.liquidAmountCents)} />
          <MetricTile label="Forma de pago" value={settlement.paymentMode === 'cash' ? 'Contado' : 'Crédito'} />
        </View>
      </AppCard>
      <View style={styles.actions}><AppButton label="Volver al menú" onPress={onFinish} /></View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actions: { alignItems: 'flex-end' },
});

