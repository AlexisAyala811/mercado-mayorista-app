import { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiError } from '@/services/api/api-client';
import { listReportRows, type ReportRowsPage } from '@/services/api/report-rows-api';
import type { ReportSelection } from '@/services/reports/report-sharing';
import { formatMoney } from '@/domain/reception/reception';
import { AppButton, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';

type Props = { token: string; selection: ReportSelection; report: 'detail' | 'variety'; onClose: () => void; onSessionExpired?: () => void | Promise<void> };
export function ReportRowsDialog({ token, selection, report, onClose, onSessionExpired }: Props) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState<ReportRowsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { operation, from, to } = selection;
  useEffect(() => {
    let active = true;
    void listReportRows(token, { operation, from, to }, report, offset).then(result => {
      if (active) setPage(result);
    }).catch(reason => {
      if (!active) return;
      if (reason instanceof ApiError && reason.status === 401) {
        setError('La sesión venció. Inicia sesión nuevamente.'); void onSessionExpired?.();
      } else setError(reason instanceof Error ? reason.message : 'No se pudo consultar el reporte.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, operation, from, to, report, offset, attempt, onSessionExpired]);
  function changePage(next: number) { setPage(null); setError(null); setLoading(true); setOffset(next); }
  function retry() { setPage(null); setError(null); setLoading(true); setAttempt(value => value + 1); }
  const title = `${report === 'detail' ? 'Detalle' : 'Por variedad'} de ${operation === 'purchase' ? 'compras' : 'ventas'}`;
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <AppButton label="Cerrar consulta" onPress={onClose} tone="secondary" />
      </View>
      <Text style={styles.help}>{from} a {to} · Operaciones confirmadas. Cada página consulta datos actuales. La descarga incluye todo el período.</Text>
      {loading ? <LoadingState label="Consultando reporte" /> : error ? <FeedbackState title="Reporte no disponible" message={error} tone="error" actionLabel="Reintentar consulta" onAction={retry} /> : page ? <>
        <Text accessibilityLiveRegion="polite" style={styles.help}>{page.total} registros · Página {Math.floor(offset / 20) + 1} · Actualizado {new Date(page.generatedAt).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.content} key={offset}>
          {!page.items.length ? <EmptyState title="Sin registros en esta página" message="Cambia de página o consulta otro período." /> : null}
          {page.report === 'detail' ? page.items.map(row => <View key={row.id} style={styles.row}>
            <Text style={styles.rowTitle}>{row.counterparty}</Text>
            <Text style={styles.help}>Fecha Lima: {row.date} · Referencia: {row.id}</Text>
            <Text style={styles.help}>Contraparte: {row.counterpartyId}</Text>
            <Text style={styles.value}>Total confirmado: {formatMoney(row.amount)} · Saldo actual: {formatMoney(row.balance)}</Text>
            <Text style={styles.help}>{row.sacks} sacos · {row.weight} kg</Text>
            <Text style={styles.help}>Bruto: {formatMoney(row.gross)} · Flete: {formatMoney(row.freight)} · Descuentos: {formatMoney(row.discounts)}</Text>
            {operation === 'purchase' ? <Text style={styles.help}>Adelantos: {formatMoney(row.advances)}</Text> : null}
          </View>) : page.items.map(row => <View key={row.id} style={styles.row}>
            <Text style={styles.rowTitle}>{row.name}</Text>
            <Text style={styles.help}>Variedad: {row.id} · {row.operations} operaciones</Text>
            <Text style={styles.value}>{row.sacks} sacos · {row.weight} kg</Text>
            <Text style={styles.help}>Subtotal bruto asignado: {row.subtotal === null ? 'No distribuido' : formatMoney(row.subtotal)}</Text>
          </View>)}
          <Text style={styles.help}>{report === 'variety' ? 'Una operación puede incluir varias variedades. No se distribuyen descuentos ni fletes comunes. En compras no existe importe asignado por saco.' : 'El saldo es actual, no histórico al cierre. El flete de venta informado no implica que se incluya en el total.'} Cantidades originales de las operaciones.</Text>
        </ScrollView>
      </> : null}
      <View style={styles.navigation}>
        <AppButton label="Página anterior" disabled={loading || offset === 0} onPress={() => changePage(Math.max(0, offset - 20))} tone="secondary" />
        <AppButton label="Página siguiente" disabled={loading || !page || BigInt(offset + page.items.length) >= BigInt(page.total)} onPress={() => changePage(offset + 20)} tone="secondary" />
      </View>
    </SafeAreaView>
  </Modal>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.md, gap: spacing.md, backgroundColor: color.surface },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  title: { ...typography.body, fontWeight: '700', flexGrow: 1, flexShrink: 1, color: color.textPrimary },
  help: { ...typography.bodySmall, color: color.textSecondary }, value: { ...typography.body, color: color.textPrimary },
  rowTitle: { ...typography.body, fontWeight: '700', color: color.textPrimary },
  list: { flex: 1 }, content: { gap: spacing.md, paddingBottom: spacing.md },
  row: { padding: spacing.md, gap: spacing.sm, backgroundColor: color.surfaceRaised, borderRadius: 20 },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
