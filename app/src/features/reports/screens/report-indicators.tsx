import { useReportFonts } from '@/ui/report-fonts';
import { StyleSheet, Text, View } from 'react-native';
import { MetricTile } from '@/ui/components';
import { reportVisual } from '@/ui/report-tokens';
import { formatMoney } from '@/domain/reception/reception';
import type { OperationOverview } from '@/services/api/operations-api';

export function ReportIndicators({ overview: o }: { overview: OperationOverview }) {
  const fontsLoaded = useReportFonts();
  const purchase = o.operation === 'purchase';
  const tile = { appearance: 'report' as const, reportFontsLoaded: fontsLoaded };
  return <View style={styles.container}>
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.title, fontsLoaded && { fontFamily: 'ReportRalewayBold' }]}>{purchase ? 'Resumen de compras' : 'Resumen de ventas'}</Text>
      <Text style={[styles.detail, fontsLoaded && { fontFamily: 'ReportInterRegular' }]}>{o.period.from} a {o.period.to}</Text>
    </View>
    <View style={styles.tiles}>
      <MetricTile {...tile} label={purchase ? 'Total de compras' : 'Total de ventas'} value={formatMoney(o.totalAmountCents)} description="Importe confirmado del período" />
      <MetricTile {...tile} label={purchase ? 'Compras registradas' : 'Ventas registradas'} value={o.operationCount} description="Operaciones confirmadas del período" />
      <MetricTile {...tile} label="Total de sacos" value={o.sacks} description={`${o.weightKg} kg de peso total`} />
      <MetricTile {...tile} label="Saldo pendiente del período" value={formatMoney(o.currentBalanceCents)} description={`${o.openAccountCount} cuentas abiertas de estas operaciones`} />
    </View>
    <Text style={styles.detail}>El saldo es actual, no histórico al cierre del período. Cantidades originales de las operaciones.</Text>
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 14 }, heading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  title: { color: reportVisual.title, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  detail: { color: reportVisual.secondary, fontSize: 12, lineHeight: 18, flexShrink: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' },
});
