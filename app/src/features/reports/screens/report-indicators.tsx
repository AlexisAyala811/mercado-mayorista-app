import { StyleSheet, Text, View } from 'react-native';

import { formatMoney } from '@/domain/reception/reception';
import { averagePricePerKilogram } from '@/domain/shared/report-figures';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import type { OperationOverview } from '@/services/api/operations-api';
import { MetricTile } from '@/ui/components';

// Spec 011 (RQ-ST07, CL-ST18): the four indicators of the Stitch reports and
// the open balance of the period, from the operation overview.
export function ReportIndicators({ overview: o }: { overview: OperationOverview }) {
  const purchase = o.operation === 'purchase';
  return <View style={styles.container}>
    <View style={styles.tiles}>
      <MetricTile appearance="stitch" label={purchase ? 'Total de compras' : 'Total de ventas'} value={formatMoney(o.totalAmountCents)} description={`${o.operationCount} ${purchase ? 'compras' : 'ventas'} confirmadas`} />
      <MetricTile appearance="stitch" label="Volumen total" tone="success" value={formatKilograms(o.weightKg)} description={`${o.sacks} sacos en el período`} />
      <MetricTile appearance="stitch" label="Precio promedio" value={averagePricePerKilogram(o.totalAmountCents, o.weightKg) ?? 'Sin peso'} description="Importe entre kilos del período" />
      {o.counterpartyCount !== undefined ? <MetricTile appearance="stitch" label={purchase ? 'Proveedores atendidos' : 'Compradores atendidos'} value={o.counterpartyCount} description={`${o.varietyCount ?? '—'} variedades`} /> : null}
      <MetricTile appearance="stitch" label="Saldo pendiente del período" tone="danger" value={formatMoney(o.currentBalanceCents)} description={`${o.openAccountCount} cuentas abiertas`} />
    </View>
    <Text style={styles.detail}>{`${o.period.from} a ${o.period.to}. El saldo es actual, no histórico al cierre del período.`}</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  detail: { color: '#64748B', fontSize: 12 },
});
