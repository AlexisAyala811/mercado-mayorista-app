import { StyleSheet, Text, View } from 'react-native';

import type { PurchaseSettlement, SettlementLotView } from '@/domain/reception/reception';
import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { AppButton, AppCard, AppScreen, FeedbackState, MetricTile, ScreenHeader, StepProgress } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = { onFinish: () => void; settlement: PurchaseSettlement };
const steps = ['Datos', 'Pesaje', 'Liquidación', 'Confirmación'] as const;

export function PurchaseConfirmationScreen({ onFinish, settlement }: Props) {
  const wholesalerFreight = settlement.freightChargedTo === 'wholesaler';
  return (
    <AppScreen contentContainerStyle={styles.screen} testID="purchase-confirmation-screen">
      <ScreenHeader eyebrow="RECEPCIÓN Y COMPRA" title="Compra confirmada" description="La recepción, el pesaje y los efectos comerciales quedaron registrados." />
      <StepProgress activeIndex={3} steps={steps} />
      <FeedbackState title="Operación confirmada" message="El servidor confirmó la liquidación y sus importes." tone="success" />
      {settlement.lots?.length ? <AppCard title="Lotes">
        <View style={styles.lots}>{settlement.lots.map((lot) => <LotRow key={lot.letter} lot={lot} />)}</View>
      </AppCard> : null}
      <AppCard title="Resumen de liquidación">
        <View style={styles.metrics}>
          <MetricTile label="Importe bruto" value={formatMoney(settlement.grossAmountCents)} />
          <MetricTile label={wholesalerFreight ? 'Flete a cargo del Mayorista' : 'Flete descontado'} value={formatMoney(settlement.freightAmountCents)} />
          <MetricTile label="Adelantos" value={formatMoney(settlement.advancesCents)} />
          <MetricTile label="Descuentos" value={formatMoney(settlement.discountsCents)} />
          <MetricTile label="Monto líquido" value={formatMoney(settlement.liquidAmountCents)} />
          <MetricTile label="Forma de pago" value={settlement.paymentMode === 'cash' ? 'Contado' : 'Crédito'} />
        </View>
        {wholesalerFreight ? <Text style={styles.help}>El flete no se descontó al proveedor; queda pendiente con el transportista.</Text> : null}
      </AppCard>
      <View style={styles.actions}><AppButton label="Volver al menú" onPress={onFinish} /></View>
    </AppScreen>
  );
}

function LotRow({ lot }: { lot: SettlementLotView }) {
  const title = [`Lote ${lot.letter}`, lot.name, lot.varietyName, lot.qualityName ?? (lot.varietyName ? 'Calidad no informada' : null)].filter(Boolean).join(' · ');
  const rate = `${formatMoney(lot.unitPriceCents)} por ${lot.priceBasis === 'sack' ? 'saco' : 'kg'}`;
  return <View style={styles.lot}>
    <View style={styles.lotCopy}>
      <Text style={styles.lotTitle}>{title}</Text>
      <Text style={styles.help}>{lot.sacks} {lot.sacks === 1 ? 'saco' : 'sacos'} · {formatKilograms(lot.netWeightKg)} · {rate}</Text>
    </View>
    <Text accessibilityLabel={`Importe del lote ${lot.letter}: ${formatMoney(lot.amountCents)}`} style={styles.amount}>{formatMoney(lot.amountCents)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl },
  lots: { gap: spacing.sm },
  lot: { alignItems: 'center', borderColor: color.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  lotCopy: { flex: 1, gap: spacing.xs },
  lotTitle: { color: color.brand, ...typography.bodySmall, fontWeight: '800' },
  amount: { color: color.textPrimary, fontSize: 18, fontWeight: '800' },
  help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  actions: { alignItems: 'flex-end' },
});
