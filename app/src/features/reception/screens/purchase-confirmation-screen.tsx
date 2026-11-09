import { StyleSheet, Text, View } from 'react-native';

import type { PurchaseSettlement } from '@/domain/reception/reception';
import { formatMoney } from '@/domain/reception/reception';
import { freightLabel, SettlementLotList } from '../components/settlement-lot-list';
import { AppCard, AppScreen, FeedbackState, MetricTile, ScreenHeader, StepProgress } from '@/ui/components';
import { color, spacing } from '@/ui/tokens';
import { purchaseConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { ConfirmationCard } from '@/features/receipts/components/confirmation-card';

type Props = { onNew: () => void; providerName: string; settlement: PurchaseSettlement };
const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function PurchaseConfirmationScreen({ onNew, providerName, settlement }: Props) {
  const wholesalerFreight = settlement.freightChargedTo === 'wholesaler';
  return (
    <AppScreen contentContainerStyle={styles.screen} testID="purchase-confirmation-screen">
      <ScreenHeader eyebrow="RECEPCIÓN Y COMPRA" title="Compra confirmada" description="La recepción, el pesaje y los efectos comerciales quedaron registrados." />
      <StepProgress activeIndex={3} steps={steps} />
      <ConfirmationCard title="Compra guardada" party={providerName} summary={purchaseConfirmationSummary(settlement)} receipt={{ kind: 'purchases', id: settlement.id }} newLabel="Nueva compra" onNew={onNew} />
      <FeedbackState title="Operación confirmada" message="El servidor confirmó la liquidación y sus importes." tone="success" />
      {settlement.lots?.length ? <AppCard title="Lotes"><SettlementLotList settlement={settlement} /></AppCard> : null}
      <AppCard title="Resumen de liquidación">
        <View style={styles.metrics}>
          <MetricTile label="Importe bruto" value={formatMoney(settlement.grossAmountCents)} />
          <MetricTile label={freightLabel(settlement)} value={formatMoney(settlement.freightAmountCents)} />
          <MetricTile label="Adelantos" value={formatMoney(settlement.advancesCents)} />
          <MetricTile label="Descuentos" value={formatMoney(settlement.discountsCents)} />
          <MetricTile label="Monto líquido" value={formatMoney(settlement.liquidAmountCents)} />
          <MetricTile label="Forma de pago" value={settlement.paymentMode === 'cash' ? 'Contado' : 'Crédito'} />
        </View>
        {wholesalerFreight ? <Text style={styles.help}>El flete no se descontó al proveedor; queda pendiente con el transportista.</Text> : null}
      </AppCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
});
