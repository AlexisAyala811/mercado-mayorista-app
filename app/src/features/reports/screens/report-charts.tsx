import { SymbolView } from '@/ui/components/symbol';
import type { AndroidSymbol } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { topParties, varietyShares, varietyTableRow } from '@/domain/shared/report-board';
import { dailyBars } from '@/domain/shared/report-figures';
import { dayBadge, highestPriceVariety, purchaseVarietyView } from '@/domain/shared/purchase-report';
import { listAllReportRows, type DailyReportRow, type OperationReportRow, type VarietyReportRow } from '@/services/api/report-rows-api';
import type { ReportSelection } from '@/services/reports/report-sharing';
import { FeedbackState } from '@/ui/components/feedback-state';
import { LoadingState } from '@/ui/components/loading-state';
import { SalesByClient } from './sales-by-client';
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
  // CL-ST34 (purchases): variety isolated in the table and the distribution,
  // day badge of the touched bar, and the figures window of a variety or provider.
  const [variety, setVariety] = useState('all');
  const [dayInfo, setDayInfo] = useState<string | null>(null);
  const [openVariety, setOpenVariety] = useState<string | null>(null);
  const [openParty, setOpenParty] = useState<string | null>(null);
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
  const view = purchaseVarietyView(rows.varieties, variety);
  const best = highestPriceVariety(rows.varieties);
  const chosen = variety === 'all' ? null : rows.varieties.find((item) => item.id === variety) ?? null;
  const chosenShare = chosen ? shares.items.find((item) => item.id === chosen.id) ?? null : null;
  const detailRow = openVariety ? rows.varieties.find((item) => item.id === openVariety) ?? null : null;
  const detailParty = openParty ? parties.find((item) => item.id === openParty) ?? null : null;
  return (
    <View style={styles.board}>
      {purchase && rows.varieties.length ? (
        <View accessibilityRole="radiogroup" style={styles.filter} testID="variety-filter">
          <View style={styles.filterTitle}><SymbolView fallback={null} name={{ android: 'filter_alt', ios: 'line.3.horizontal.decrease', web: 'filter_alt' }} size={20} tintColor={color.brand} /><Text style={styles.filterLabel}>FILTRAR VARIEDAD DE PAPA:</Text></View>
          <View style={styles.filterChips}>
            {[{ id: 'all', name: `Todas (${rows.varieties.length})` }, ...rows.varieties].map((item, index) => {
              const checked = variety === item.id;
              return (
                <Pressable accessibilityLabel={item.id === 'all' ? item.name : `Variedad ${item.name}`} accessibilityRole="radio" accessibilityState={{ checked }} key={item.id} onPress={() => setVariety(item.id)} style={[styles.chip, checked && styles.chipOn]}>
                  {item.id === 'all' ? null : <View style={[styles.dot, { backgroundColor: shades[(index - 1) % shades.length] }]} />}
                  <Text style={[styles.chipText, checked && styles.chipTextOn]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <View style={styles.columns}>
        <Panel icon="monitoring" subtitle={purchase ? 'Toca una barra para ver el detalle del día' : 'Importe confirmado por día, en hora de Lima'} title={purchase ? 'Evolución de compras' : 'Evolución de ventas'} wide>
          {purchase ? <View accessibilityLiveRegion="polite" style={styles.badge} testID="day-badge"><SymbolView fallback={null} name={{ android: 'touch_app', ios: 'hand.tap', web: 'touch_app' }} size={14} tintColor={color.brand} /><Text style={styles.badgeText}>{dayInfo ?? 'Selecciona una barra'}</Text></View> : null}
          {days.length ? (
            <View accessibilityLabel={days.map((day) => `${day.label}: ${day.display}`).join('. ')} accessible style={styles.chart} testID="daily-columns">
              {days.map((day, index) => (
                <Pressable accessibilityLabel={`Día ${day.label}: ${day.display}`} accessibilityRole="button" disabled={!purchase} key={day.key} onPress={() => { const found = rows.daily.find((item) => item.date === day.key); if (found) setDayInfo(dayBadge(found)); }} style={styles.dayColumn}>
                  <Text numberOfLines={1} style={styles.dayValue}>{day.display.replace('S/ ', '')}</Text>
                  <View style={styles.dayTrack}>
                    <View style={[styles.dayBar, { backgroundColor: shades[index % 2], height: `${max > 0 ? Math.max(4, Math.round((day.value / max) * 100)) : 0}%` }]} />
                  </View>
                  <Text style={styles.dayLabel}>{day.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : <Text style={styles.empty}>Sin operaciones en el período.</Text>}
        </Panel>
        <Panel icon="donut_large" subtitle={purchase ? 'Toca una variedad para aislarla' : 'Kilos de cada variedad en el período'} title="Distribución por variedad">
          {purchase && variety !== 'all' ? <Pressable accessibilityLabel="Ver todas las variedades" accessibilityRole="button" onPress={() => setVariety('all')} style={styles.seeAll}><Text style={styles.seeAllText}>Ver todo</Text></Pressable> : null}
          {shares.items.length ? (
            <View style={styles.distribution}>
              <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stack}>
                {shares.items.map((item, index) => <View key={item.id} style={{ backgroundColor: shades[index % shades.length], flex: Math.max(item.fraction, 0.01), opacity: purchase && variety !== 'all' && variety !== item.id ? 0.25 : 1 }} />)}
              </View>
              <View style={styles.totalBox}><Text style={styles.totalLabel}>{chosenShare ? chosenShare.name.toUpperCase() : 'TOTAL'}</Text><Text style={styles.totalValue}>{chosenShare ? chosenShare.weight : shares.total}</Text>{chosenShare ? <Text style={styles.legendShare}>{`(${chosenShare.share} del total)`}</Text> : null}</View>
              {shares.items.map((item, index) => (
                <Pressable accessibilityLabel={`${item.name}: ${item.weight}, ${item.share}`} accessibilityRole={purchase ? 'button' : undefined} accessibilityState={purchase ? { selected: variety === item.id } : undefined} accessible disabled={!purchase} key={item.id} onPress={() => setVariety(variety === item.id ? 'all' : item.id)} style={[styles.legend, purchase && variety === item.id && styles.legendOn]}>
                  <View style={[styles.dot, { backgroundColor: shades[index % shades.length] }]} />
                  <Text numberOfLines={1} style={styles.legendName}>{item.name}</Text>
                  <Text style={styles.legendValue}>{item.weight}</Text>
                  <Text style={styles.legendShare}>({item.share})</Text>
                </Pressable>
              ))}
              {purchase && best ? <View style={styles.best}><Text style={styles.bestLabel}>Variedad pagada a mayor precio:</Text><Text style={styles.bestValue}>{`${best.name} (${best.average}/kg)`}</Text></View> : null}
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
            {purchase ? <Text style={[styles.th, styles.cAction]}>ACCIÓN</Text> : null}
          </View>
          {rows.varieties.length ? (purchase ? view.visible : rows.varieties).map((item) => {
            const index = rows.varieties.indexOf(item);
            const row = varietyTableRow(item);
            return (
              <View key={row.id} style={styles.tableRow} testID={`variety-row-${row.id}`}>
                <View style={[styles.cName, styles.nameCell]}><View style={[styles.dot, { backgroundColor: shades[index % shades.length] }]} /><Text numberOfLines={2} style={styles.td}>{row.name}</Text></View>
                <Text style={[styles.td, styles.cNum]}>{row.sacks}</Text>
                <Text style={[styles.td, styles.cNum]}>{row.weight}</Text>
                <Text style={[styles.td, styles.cNum]}>{row.average}</Text>
                <Text style={[styles.tdStrong, styles.cTotal]}>{row.total}</Text>
                {purchase ? <View style={styles.cAction}><Pressable accessibilityLabel={`Detalle de ${row.name}`} accessibilityRole="button" onPress={() => setOpenVariety(item.id)} style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}><Text style={styles.detailText}>Detalle</Text></Pressable></View> : null}
              </View>
            );
          }) : <Text style={styles.empty}>Sin variedades en el período.</Text>}
          {purchase && rows.varieties.length ? (
            <View style={styles.tableFooter} testID="variety-footer">
              <Text style={[styles.footerText, styles.cName]}>{view.footer.title}</Text>
              <Text style={[styles.footerText, styles.cNum]}>{view.footer.sacks}</Text>
              <Text style={[styles.footerText, styles.cNum]}>{view.footer.weight}</Text>
              <Text style={[styles.footerText, styles.cNum]}>{view.footer.average}</Text>
              <Text style={[styles.footerTotal, styles.cTotal]}>{view.footer.total}</Text>
              <View style={styles.cAction} />
            </View>
          ) : null}
        </Panel>
        {purchase ? <Panel icon="groups" subtitle="Proveedores del período por kilos" title="Principales proveedores">
          {parties.length ? parties.map((party) => (
            <Pressable accessibilityLabel={`Ver detalle de ${party.name}`} accessibilityRole="button" key={party.id} onPress={() => setOpenParty(party.id)} style={styles.party} testID={`top-party-${party.position}`}>
              <View style={[styles.position, party.position > 3 && styles.positionLight]}><Text style={[styles.positionText, party.position > 3 && styles.positionTextLight]}>{party.position}</Text></View>
              <View style={styles.partyCopy}>
                <Text numberOfLines={1} style={styles.partyName}>{party.name}</Text>
                <Text style={styles.partyDetail}>{party.detail}</Text>
              </View>
              <View style={styles.partyEnd}>
                <Text style={styles.partyWeight}>{party.weight}</Text>
                <View style={[styles.state, party.pending && styles.statePending]}><Text style={[styles.stateText, party.pending && styles.stateTextPending]}>{party.state}</Text></View>
              </View>
            </Pressable>
          )) : <Text style={styles.empty}>Sin operaciones en el período.</Text>}
        </Panel> : null}
      </View>
      {/* CL-ST33: the sales report ends with the table of sales by client. */}
      {purchase ? null : <SalesByClient rows={rows.detail} />}
      {detailRow ? (
        <FiguresWindow onClose={() => setOpenVariety(null)} subtitle={`${detailRow.operations} ${detailRow.operations === '1' ? 'operación' : 'operaciones'} en el período`} title={varietyTableRow(detailRow).name}
          lines={[['Total de sacos', varietyTableRow(detailRow).sacks], ['Peso neto', varietyTableRow(detailRow).weight], ['Precio promedio por kilo', varietyTableRow(detailRow).average]]}
          total={['Total liquidado:', varietyTableRow(detailRow).total]} />
      ) : null}
      {detailParty ? (
        <FiguresWindow onClose={() => setOpenParty(null)} subtitle={detailParty.detail} title={detailParty.name}
          lines={[['Volumen del período', detailParty.weight], ['Estado de sus cuentas', detailParty.state]]} />
      ) : null}
    </View>
  );
}

// Small window with the figures of a variety or a provider (CL-ST34).
function FiguresWindow({ lines, onClose, subtitle, title, total }: { lines: [string, string][]; onClose: () => void; subtitle: string; title: string; total?: [string, string] }) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.window}>
          <View style={styles.windowHead}>
            <View style={styles.windowTitles}><Text accessibilityRole="header" style={styles.windowTitle}>{title}</Text><Text style={styles.windowSub}>{subtitle}</Text></View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8} onPress={onClose} style={styles.windowClose}><SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={20} tintColor="#0F172A" /></Pressable>
          </View>
          <View style={styles.windowBody}>
            {lines.map(([label, value]) => <View key={label} style={styles.windowLine}><Text style={styles.windowLabel}>{label}</Text><Text style={styles.windowValue}>{value}</Text></View>)}
            {total ? <View style={styles.windowTotal}><Text style={styles.windowTotalLabel}>{total[0]}</Text><Text style={styles.windowTotalValue}>{total[1]}</Text></View> : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.windowOk, pressed && styles.pressed]}><Text style={styles.windowOkText}>Cerrar</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
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
  filter: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', padding: 14 },
  filterTitle: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  filterLabel: { color: '#08241A', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 10, flexDirection: 'row', gap: 8, minHeight: 40, paddingHorizontal: 14 },
  chipOn: { backgroundColor: '#08241A' },
  chipText: { color: '#0B1C30', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#FFFFFF', fontWeight: '700' },
  badge: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#E5EEFF', borderRadius: 8, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: '#08241A', flexShrink: 1, fontSize: 12, fontWeight: '700' },
  seeAll: { alignSelf: 'flex-start', backgroundColor: '#E5EEFF', borderRadius: 8, minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
  seeAllText: { color: '#006C49', fontSize: 12, fontWeight: '700' },
  legendOn: { backgroundColor: '#E5EEFF', borderRadius: 8, paddingHorizontal: 6 },
  best: { backgroundColor: '#EFF4FF', borderRadius: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between', padding: 10 },
  bestLabel: { color: '#08241A', fontSize: 12, fontWeight: '700' },
  bestValue: { color: '#006C49', fontSize: 12, fontWeight: '700' },
  cAction: { alignItems: 'center', flex: 1 },
  detailButton: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 8, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  detailText: { color: '#08241A', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  tableFooter: { alignItems: 'center', backgroundColor: '#E5EEFF', borderRadius: 10, flexDirection: 'row', gap: 8, minHeight: 52, paddingHorizontal: 12 },
  footerText: { color: '#08241A', fontSize: 13, fontWeight: '800' },
  footerTotal: { color: '#08241A', fontSize: 16, fontWeight: '800', textAlign: 'right' },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(8,36,26,0.4)', flex: 1, justifyContent: 'center', padding: 16 },
  window: { backgroundColor: '#FFFFFF', borderRadius: 16, maxWidth: 520, overflow: 'hidden', width: '100%' },
  windowHead: { alignItems: 'center', backgroundColor: '#EFF4FF', flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  windowTitles: { flexShrink: 1 },
  windowTitle: { color: '#08241A', fontSize: 18, fontWeight: '700' },
  windowSub: { color: '#006C49', fontSize: 12, fontWeight: '700' },
  windowClose: { alignItems: 'center', backgroundColor: '#E5EEFF', borderRadius: 999, height: 40, justifyContent: 'center', width: 40 },
  windowBody: { gap: 10, padding: 20 },
  windowLine: { borderBottomColor: '#E5EEFF', borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  windowLabel: { color: '#0B1C30', fontSize: 14 },
  windowValue: { color: '#08241A', fontSize: 14, fontWeight: '700' },
  windowTotal: { alignItems: 'center', backgroundColor: 'rgba(203,234,217,0.5)', borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', padding: 12 },
  windowTotalLabel: { color: '#042016', fontSize: 15, fontWeight: '700' },
  windowTotalValue: { color: '#08241A', fontSize: 18, fontWeight: '800' },
  windowOk: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#08241A', borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: 24 },
  windowOkText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  panel: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexBasis: 300, minWidth: 0, flexGrow: 1, gap: 14, padding: 20 },
  panelWide: { flexBasis: 340, flexGrow: 1.4 },
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
