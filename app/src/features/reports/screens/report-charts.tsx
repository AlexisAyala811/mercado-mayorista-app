import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { topParties, varietyShares, varietyTableRow } from '@/domain/shared/report-board';
import { dailyBars } from '@/domain/shared/report-figures';
import { listAllReportRows, type DailyReportRow, type OperationReportRow, type VarietyReportRow } from '@/services/api/report-rows-api';
import type { ReportSelection } from '@/services/reports/report-sharing';
import { FeedbackState } from '@/ui/components/feedback-state';
import { LoadingState } from '@/ui/components/loading-state';
import { accent, color } from '@/ui/tokens';

type Rows = { daily: DailyReportRow[]; varieties: VarietyReportRow[]; detail: OperationReportRow[] };

// Shades of the Stitch charts, dark and light green alternating.
const shades = ['#0B2A1F', '#34D399', '#1F3A2F', '#6EE7B7', '#047857', '#A7F3D0'];

// Spec 011 (RQ-ST07, CL-ST10, CL-ST18): the board of the Stitch reports: the
// period by day in columns, the distribution by variety, the consolidated table
// and the main providers or buyers, from /reports/rows. Mounted once per query.
export function ReportCharts({ selection, token }: { selection: ReportSelection; token: string }) {
  const [rows, setRows] = useState<Rows | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { from, operation, to } = selection;
  useEffect(() => {
    let active = true;
    const period = { from, operation, to };
    Promise.all([listAllReportRows(token, period, 'daily'), listAllReportRows(token, period, 'variety'), listAllReportRows(token, period, 'detail')]).then(
      ([daily, varieties, detail]) => { if (active) setRows({ daily, detail, varieties }); },
      (cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudieron cargar los gráficos.'); },
    );
    return () => {
      active = false;
    };
  }, [from, operation, to, token]);
  if (error) return <FeedbackState title="Gráficos no disponibles" message={error} tone="error" />;
  if (!rows) return <LoadingState label="Cargando gráficos del período" />;
  const purchase = operation === 'purchase';
  const days = dailyBars(rows.daily);
  const max = Math.max(0, ...days.map((day) => day.value));
  const shares = varietyShares(rows.varieties);
  const parties = topParties(rows.detail);
  return (
    <View style={styles.board}>
      <View style={styles.columns}>
        <Panel icon="monitoring" subtitle="Importe confirmado por día, en hora de Lima" title={purchase ? 'Evolución de compras' : 'Evolución de ventas'} wide>
          {days.length ? (
            <View accessibilityLabel={days.map((day) => `${day.label}: ${day.display}`).join('. ')} accessible style={styles.chart} testID="daily-columns">
              {days.map((day, index) => (
                <View key={day.key} style={styles.dayColumn}>
                  <Text numberOfLines={1} style={styles.dayValue}>{day.display.replace('S/ ', '')}</Text>
                  <View style={styles.dayTrack}>
                    <View style={[styles.dayBar, { backgroundColor: shades[index % 2], height: `${max > 0 ? Math.max(4, Math.round((day.value / max) * 100)) : 0}%` }]} />
                  </View>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                </View>
              ))}
            </View>
          ) : <Text style={styles.empty}>Sin operaciones en el período.</Text>}
        </Panel>
        <Panel icon="donut_large" subtitle="Kilos de cada variedad en el período" title="Distribución por variedad">
          {shares.items.length ? (
            <View style={styles.distribution}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stack}>
                {shares.items.map((item, index) => <View key={item.id} style={{ backgroundColor: shades[index % shades.length], flex: Math.max(item.fraction, 0.01) }} />)}
              </View>
              <View style={styles.totalBox}><Text style={styles.totalLabel}>TOTAL</Text><Text style={styles.totalValue}>{shares.total}</Text></View>
              {shares.items.map((item, index) => (
                <View accessibilityLabel={`${item.name}: ${item.weight}, ${item.share}`} accessible key={item.id} style={styles.legend}>
                  <View style={[styles.dot, { backgroundColor: shades[index % shades.length] }]} />
                  <Text numberOfLines={1} style={styles.legendName}>{item.name}</Text>
                  <Text style={styles.legendValue}>{item.weight}</Text>
                  <Text style={styles.legendShare}>({item.share})</Text>
                </View>
              ))}
            </View>
          ) : <Text style={styles.empty}>Sin variedades en el período.</Text>}
        </Panel>
      </View>

      <View style={styles.columns}>
        <Panel icon="table_view" subtitle="Sacos, kilos, precio promedio y total por variedad" title="Consolidado por variedad de papa" wide>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.cName]}>VARIEDAD</Text>
            <Text style={[styles.th, styles.cNum]}>SACOS</Text>
            <Text style={[styles.th, styles.cNum]}>KILOS NETOS</Text>
            <Text style={[styles.th, styles.cNum]}>P. PROM. / KG</Text>
            <Text style={[styles.th, styles.cTotal]}>{purchase ? 'TOTAL LIQUIDADO' : 'TOTAL VENDIDO'}</Text>
          </View>
          {rows.varieties.length ? rows.varieties.map((variety, index) => {
            const row = varietyTableRow(variety);
            return (
              <View key={row.id} style={styles.tableRow} testID={`variety-row-${row.id}`}>
                <View style={[styles.cName, styles.nameCell]}><View style={[styles.dot, { backgroundColor: shades[index % shades.length] }]} /><Text numberOfLines={2} style={styles.td}>{row.name}</Text></View>
                <Text style={[styles.td, styles.cNum]}>{row.sacks}</Text>
                <Text style={[styles.td, styles.cNum]}>{row.weight}</Text>
                <Text style={[styles.td, styles.cNum]}>{row.average}</Text>
                <Text style={[styles.tdStrong, styles.cTotal]}>{row.total}</Text>
              </View>
            );
          }) : <Text style={styles.empty}>Sin variedades en el período.</Text>}
        </Panel>
        <Panel icon="groups" subtitle={purchase ? 'Proveedores del período por kilos' : 'Compradores del período por kilos'} title={purchase ? 'Principales proveedores' : 'Principales compradores'}>
          {parties.length ? parties.map((party) => (
            <View key={party.id} style={styles.party} testID={`top-party-${party.position}`}>
              <View style={[styles.position, party.position > 3 && styles.positionLight]}><Text style={[styles.positionText, party.position > 3 && styles.positionTextLight]}>{party.position}</Text></View>
              <View style={styles.partyCopy}>
                <Text numberOfLines={1} style={styles.partyName}>{party.name}</Text>
                <Text style={styles.partyDetail}>{party.detail}</Text>
              </View>
              <View style={styles.partyEnd}>
                <Text style={styles.partyWeight}>{party.weight}</Text>
                <View style={[styles.state, party.pending && styles.statePending]}><Text style={[styles.stateText, party.pending && styles.stateTextPending]}>{party.state}</Text></View>
              </View>
            </View>
          )) : <Text style={styles.empty}>Sin operaciones en el período.</Text>}
        </Panel>
      </View>
    </View>
  );
}

function Panel({ children, icon, subtitle, title, wide = false }: { children: ReactNode; icon: AndroidSymbol; subtitle: string; title: string; wide?: boolean }) {
  return (
    <View style={[styles.panel, wide && styles.panelWide]}>
      <View style={styles.panelHead}>
        <View style={styles.panelIcon}><SymbolView fallback={null} name={{ android: icon, ios: 'chart.bar', web: icon }} size={20} tintColor={color.brand} /></View>
        <View style={styles.panelTitles}>
          <Text accessibilityRole="header" style={styles.panelTitle}>{title}</Text>
          <Text style={styles.panelSubtitle}>{subtitle}</Text>
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { gap: 16 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  panel: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexBasis: 320, flexGrow: 1, gap: 14, padding: 20 },
  panelWide: { flexBasis: 520, flexGrow: 1.4 },
  panelHead: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  panelIcon: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  panelTitles: { flexShrink: 1 },
  panelTitle: { color: '#0F172A', fontSize: 16, fontWeight: '700' },
  panelSubtitle: { color: '#64748B', fontSize: 12 },
  empty: { color: '#64748B', fontSize: 14, paddingVertical: 12 },
  chart: { alignItems: 'flex-end', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', gap: 10, height: 180, paddingBottom: 4 },
  dayColumn: { alignItems: 'center', flex: 1, gap: 4, height: '100%', maxWidth: 56 },
  dayValue: { color: '#475569', fontSize: 10, fontWeight: '600' },
  dayTrack: { flex: 1, justifyContent: 'flex-end', width: '70%' },
  dayBar: { borderTopLeftRadius: 4, borderTopRightRadius: 4, width: '100%' },
  dayLabel: { color: '#475569', fontSize: 11, fontWeight: '600' },
  distribution: { gap: 10 },
  stack: { borderRadius: 999, flexDirection: 'row', height: 18, overflow: 'hidden' },
  totalBox: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 8 },
  totalLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  totalValue: { color: '#0F172A', fontSize: 18, fontWeight: '800' },
  legend: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  dot: { borderRadius: 999, height: 10, width: 10 },
  legendName: { color: '#0F172A', flex: 1, fontSize: 14, fontWeight: '600' },
  legendValue: { color: '#0F172A', fontSize: 13, fontWeight: '700' },
  legendShare: { color: '#64748B', fontSize: 12, width: 56 },
  tableHead: { backgroundColor: '#F8FAFC', borderRadius: 8, flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  th: { color: '#475569', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  tableRow: { alignItems: 'center', borderBottomColor: '#F1F5F9', borderBottomWidth: 1, flexDirection: 'row', gap: 8, minHeight: 52, paddingHorizontal: 12 },
  cName: { flex: 1.6 },
  nameCell: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  cNum: { flex: 1, textAlign: 'right' },
  cTotal: { flex: 1.3, textAlign: 'right' },
  td: { color: '#0F172A', flexShrink: 1, fontSize: 14 },
  tdStrong: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  party: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 12, flexDirection: 'row', gap: 12, padding: 12 },
  position: { alignItems: 'center', backgroundColor: '#0B2A1F', borderRadius: 999, height: 28, justifyContent: 'center', width: 28 },
  positionLight: { backgroundColor: '#E2E8F0' },
  positionText: { color: color.textOnBrand, fontSize: 12, fontWeight: '800' },
  positionTextLight: { color: '#334155' },
  partyCopy: { flex: 1, minWidth: 0 },
  partyName: { color: '#0F172A', fontSize: 15, fontWeight: '700' },
  partyDetail: { color: '#64748B', fontSize: 12 },
  partyEnd: { alignItems: 'flex-end', gap: 4 },
  partyWeight: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  state: { backgroundColor: accent.emerald.pill, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  statePending: { backgroundColor: '#FEE2E2' },
  stateText: { color: accent.emerald.pillInk, fontSize: 11, fontWeight: '700' },
  stateTextPending: { color: '#991B1B' },
});
