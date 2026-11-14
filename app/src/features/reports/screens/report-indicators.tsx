import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import { averagePricePerKilogram } from '@/domain/shared/report-figures';
import { collectionFigures, kilosPerSack } from '@/domain/shared/sales-report';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import type { OperationOverview } from '@/services/api/operations-api';
import { MetricTile } from '@/ui/components';

// Spec 011 (RQ-ST07, CL-ST18, CL-ST33): the indicators of the Stitch reports
// and the open balance of the period, from the operation overview. Sales show
// the four indicators of «Reportes de ventas» and the collection effectiveness.
export function ReportIndicators({ overview: o }: { overview: OperationOverview }) {
  const purchase = o.operation === 'purchase';
  const collection = collectionFigures(o.totalAmountCents, o.currentBalanceCents);
  const perSack = kilosPerSack(o.weightKg, o.sacks);
  return <View style={styles.container}>
    {purchase ? (
      <View style={styles.tiles}>
        <MetricTile appearance="stitch" icon="payments" label="Total inversión en compras" value={formatMoney(o.totalAmountCents)} description={`${o.operationCount} ${o.operationCount === '1' ? 'compra confirmada' : 'compras confirmadas'}`} />
        <MetricTile appearance="stitch" icon="inventory_2" label="Volumen total acopiado" tone="success" value={formatKilograms(o.weightKg)} description={`${o.sacks} sacos${perSack ? ` · prom. ${perSack} kg/saco` : ''}`} />
        <MetricTile appearance="stitch" icon="price_change" label="Precio prom. ponderado" value={averagePricePerKilogram(o.totalAmountCents, o.weightKg) ?? 'Sin peso'} description="Importe entre kilos del período" />
        {o.counterpartyCount !== undefined ? <MetricTile appearance="stitch" icon="groups" label="Productores atendidos" value={o.counterpartyCount} description={`${o.varietyCount ?? '—'} variedades`} /> : null}
        <MetricTile appearance="stitch" icon="pending_actions" label="Saldo pendiente del período" tone="danger" value={formatMoney(o.currentBalanceCents)} description={`${o.openAccountCount} cuentas abiertas`} />
      </View>
    ) : (
      <>
        <View style={styles.tiles} testID="sales-indicators">
          <MetricTile appearance="stitch" icon="receipt_long" label="Facturación total" value={formatMoney(o.totalAmountCents)} description={`${o.operationCount} ${o.operationCount === '1' ? 'venta confirmada' : 'ventas confirmadas'}`} />
          <MetricTile appearance="stitch" icon="payments" label="Cobrado / en caja" tone="success" value={formatMoney(collection.collected)} description={`${collection.effective}% de cobranza efectiva`} />
          <MetricTile appearance="stitch" icon="pending_actions" label="Saldo por cobrar" tone="danger" value={formatMoney(o.currentBalanceCents)} description={`${collection.credit}% a crédito · ${o.openAccountCount} ${o.openAccountCount === '1' ? 'cuenta abierta' : 'cuentas abiertas'}`} />
          <MetricTile appearance="stitch" icon="local_shipping" label="Volumen despachado" value={formatKilograms(o.weightKg)} description={`${o.sacks} sacos${perSack ? ` · prom. ${perSack} kg/saco` : ''}`} />
        </View>
        <View accessible accessibilityLabel={`Efectividad de cobranza: ${collection.effective}%`} style={styles.effectiveness} testID="collection-effectiveness">
          <View style={styles.effectivenessHead}>
            <View>
              <Text style={styles.effectivenessTitle}>Efectividad de cobranza</Text>
              <Text style={styles.detail}>Cobrado entre lo vendido en el período</Text>
            </View>
            <Text style={styles.effectivenessValue}>{collection.effective}%</Text>
          </View>
          <View style={styles.track}><View style={[styles.bar, { width: `${Math.round(collection.fraction * 100)}%` }]} /></View>
          <View style={styles.scale}><Text style={styles.detail}>0%</Text><Text style={styles.detail}>TASA EFECTIVA</Text><Text style={styles.detail}>100%</Text></View>
        </View>
      </>
    )}
    <Text style={styles.detail}>{`${o.period.from} a ${o.period.to}. El saldo es actual, no histórico al cierre del período.`}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detail: { color: '#64748B', fontSize: 12 },
  effectiveness: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, gap: 10, padding: 16 },
  effectivenessHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  effectivenessTitle: { color: '#08241A', fontSize: 16, fontWeight: '700' },
  effectivenessValue: { color: '#08241A', fontSize: 34, fontWeight: '800' },
  track: { backgroundColor: '#DCE9FF', borderRadius: 999, height: 14, overflow: 'hidden' },
  bar: { backgroundColor: '#006C49', borderRadius: 999, height: '100%' },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
});
