import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { saleClientRows, saleRowCounts, type SaleRow, type SaleRowFilter } from '@/domain/shared/sales-report';
import { FormField } from '@/ui/components';
import { CountChips } from '@/ui/components/count-chips';
import { SymbolView } from '@/ui/components/symbol';

type Item = ReturnType<typeof saleClientRows>['items'][number];

// «Ventas por cliente mayorista» of the Stitch sales report (spec 011,
// CL-ST33): one line per sale of the period with its total, advance, balance
// and state, searchable by client and filtered by Todos / Cobrados / Crédito;
// «Ver» opens the figures of the sale.
export function SalesByClient({ rows }: { rows: readonly SaleRow[] }) {
  const [filter, setFilter] = useState<SaleRowFilter>('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<Item | null>(null);
  const counts = saleRowCounts(rows);
  const shown = saleClientRows(rows, filter, search);
  return (
    <View style={styles.panel} testID="sales-by-client">
      <View style={styles.head}>
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={styles.title}>Ventas por cliente mayorista</Text>
          <Text style={styles.subtitle}>{`Período consultado · ${shown.items.length} ${shown.items.length === 1 ? 'operación' : 'operaciones'}`}</Text>
        </View>
        <View style={styles.controls}>
          <View style={styles.search}>
            <FormField accessibilityLabel="Buscar cliente" appearance="search" autoComplete="off" autoCorrect={false} hideLabel importantForAutofill="no" label="Buscar cliente" leadingIcon="search" onChangeText={setSearch} placeholder="Buscar cliente…" value={search} />
          </View>
          <CountChips
            chips={[
              { count: counts.all, id: 'all', label: 'Todos', tone: 'neutral' },
              { count: counts.collected, id: 'collected', label: 'Cobrados', tone: 'success' },
              { count: counts.credit, id: 'credit', label: 'Crédito', tone: 'danger' },
            ]}
            onSelect={setFilter}
            selected={filter}
          />
        </View>
      </View>

      <View style={styles.tableHead}>
        <Text style={[styles.th, styles.cClient]}>CLIENTE</Text>
        <Text style={[styles.th, styles.cNum]}>SACOS / KG</Text>
        <Text style={[styles.th, styles.cNum]}>TOTAL VENTA</Text>
        <Text style={[styles.th, styles.cNum]}>COBRADO</Text>
        <Text style={[styles.th, styles.cNum]}>SALDO</Text>
        <Text style={[styles.th, styles.cState]}>ESTADO</Text>
        <Text style={[styles.th, styles.cAction]}>ACCIÓN</Text>
      </View>
      {shown.items.length ? shown.items.map((item) => (
        <View key={item.id} style={styles.row} testID={`sale-row-${item.id}`}>
          <View style={styles.cClient}><Text numberOfLines={2} style={styles.client}>{item.client}</Text><Text style={styles.date}>{item.date}</Text></View>
          <View style={styles.cNum}><Text style={styles.strong}>{item.sacks}</Text><Text style={styles.date}>{item.weight}</Text></View>
          <Text style={[styles.strong, styles.cNum]}>{item.total}</Text>
          <Text style={[styles.td, styles.cNum, item.state === 'collected' && styles.collected]}>{item.collected}</Text>
          <Text style={[item.state === 'credit' ? styles.strong : styles.td, styles.cNum]}>{item.balance}</Text>
          <View style={styles.cState}><View style={[styles.pill, item.state === 'credit' && styles.pillCredit]}><View style={[styles.dot, item.state === 'credit' && styles.dotCredit]} /><Text style={[styles.pillText, item.state === 'credit' && styles.pillTextCredit]}>{item.stateLabel}</Text></View></View>
          <View style={styles.cAction}>
            <Pressable accessibilityLabel={`Ver venta de ${item.client}, ${item.date}`} accessibilityRole="button" onPress={() => setOpen(item)} style={({ pressed }) => [styles.see, pressed && styles.pressed]}><Text style={styles.seeText}>Ver</Text></Pressable>
          </View>
        </View>
      )) : <Text style={styles.empty}>{rows.length ? 'Ninguna venta coincide con la búsqueda y el filtro.' : 'Sin ventas en el período.'}</Text>}

      <View style={styles.footer}>
        <Text style={styles.footerLabel}>TOTAL SACOS: <Text style={styles.footerValue}>{shown.totalSacks}</Text></Text>
        <Text style={styles.footerLabel}>NETO FACTURADO: <Text style={styles.footerValue}>{shown.totalAmount}</Text></Text>
      </View>

      {open ? (
        <Modal animationType="fade" onRequestClose={() => setOpen(null)} transparent visible>
          <View style={styles.backdrop}>
            <View accessibilityViewIsModal style={styles.dialog}>
              <View style={styles.dialogHead}>
                <View style={styles.dialogTitles}><Text accessibilityRole="header" style={styles.dialogTitle}>{open.client}</Text><Text style={styles.dialogSub}>{`Venta del ${open.date}`}</Text></View>
                <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" hitSlop={8} onPress={() => setOpen(null)} style={styles.close}><SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={20} tintColor="#FFFFFF" /></Pressable>
              </View>
              <View style={styles.dialogBody}>
                <View style={styles.pair}><Box label="CARGA NETA" value={`${open.sacks} / ${open.weight}`} /><Box label="ESTADO" value={open.stateLabel.toUpperCase()} /></View>
                <View style={styles.money}>
                  <Line label="Importe total facturado:" value={open.total} />
                  <Line label="Monto cobrado a la fecha:" value={open.collected} />
                  <View style={styles.rule} />
                  <Line label="Saldo pendiente:" strong value={open.balance} />
                </View>
                <Pressable accessibilityRole="button" onPress={() => setOpen(null)} style={({ pressed }) => [styles.ok, pressed && styles.pressed]}><Text style={styles.okText}>Cerrar</Text></Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return <View style={styles.box}><Text style={styles.boxLabel}>{label}</Text><Text style={styles.boxValue}>{value}</Text></View>;
}
function Line({ label, strong = false, value }: { label: string; strong?: boolean; value: string }) {
  return <View style={styles.line}><Text style={styles.lineLabel}>{label}</Text><Text style={[styles.lineValue, strong && styles.lineStrong]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, gap: 12, padding: 20 },
  head: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  titles: { flexShrink: 1 },
  title: { color: '#08241A', fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#64748B', fontSize: 12 },
  controls: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  search: { minWidth: 200 },
  tableHead: { backgroundColor: '#EFF4FF', borderRadius: 8, flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  th: { color: '#424844', fontSize: 10, fontWeight: '700', letterSpacing: 0.6 },
  row: { alignItems: 'center', borderBottomColor: '#E5EEFF', borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 60, paddingHorizontal: 12 },
  cClient: { flex: 2 },
  cNum: { flex: 1.2, textAlign: 'right', alignItems: 'flex-end' },
  cState: { alignItems: 'center', flex: 1.1, paddingLeft: 8 },
  cAction: { alignItems: 'center', flex: 0.8 },
  client: { color: '#08241A', fontSize: 15, fontWeight: '700' },
  date: { color: '#64748B', fontSize: 12 },
  td: { color: '#0B1C30', fontSize: 14, fontWeight: '600' },
  strong: { color: '#08241A', fontSize: 15, fontWeight: '800' },
  collected: { color: '#006C49' },
  pill: { alignItems: 'center', backgroundColor: 'rgba(108,248,187,0.4)', borderRadius: 999, flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  pillCredit: { backgroundColor: '#E5EEFF' },
  dot: { backgroundColor: '#006C49', borderRadius: 3, height: 6, width: 6 },
  dotCredit: { backgroundColor: '#727974' },
  pillText: { color: '#00714D', fontSize: 12, fontWeight: '700' },
  pillTextCredit: { color: '#0B1C30' },
  see: { alignItems: 'center', backgroundColor: '#E5EEFF', borderRadius: 8, justifyContent: 'center', minHeight: 40, paddingHorizontal: 14 },
  seeText: { color: '#08241A', fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.6 },
  empty: { color: '#64748B', fontSize: 14, paddingVertical: 14 },
  footer: { backgroundColor: '#EFF4FF', borderRadius: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'flex-end', padding: 14 },
  footerLabel: { color: '#424844', fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  footerValue: { color: '#08241A', fontSize: 16, fontWeight: '800' },
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(8,36,26,0.6)', flex: 1, justifyContent: 'center', padding: 16 },
  dialog: { backgroundColor: '#FFFFFF', borderRadius: 16, maxWidth: 560, overflow: 'hidden', width: '100%' },
  dialogHead: { alignItems: 'center', backgroundColor: '#08241A', flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  dialogTitles: { flexShrink: 1 },
  dialogTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  dialogSub: { color: '#6FFBBE', fontSize: 12 },
  close: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  dialogBody: { gap: 14, padding: 20 },
  pair: { flexDirection: 'row', gap: 12 },
  box: { backgroundColor: '#EFF4FF', borderRadius: 12, flex: 1, padding: 12 },
  boxLabel: { color: '#424844', fontSize: 11, fontWeight: '700' },
  boxValue: { color: '#08241A', fontSize: 15, fontWeight: '800' },
  money: { backgroundColor: 'rgba(239,244,255,0.5)', borderColor: '#E5EEFF', borderRadius: 12, borderWidth: 1, gap: 8, padding: 12 },
  line: { flexDirection: 'row', justifyContent: 'space-between' },
  lineLabel: { color: '#424844', fontSize: 14 },
  lineValue: { color: '#08241A', fontSize: 14, fontWeight: '700' },
  lineStrong: { fontSize: 17, fontWeight: '800' },
  rule: { backgroundColor: '#C2C8C3', height: 1, opacity: 0.5 },
  ok: { alignItems: 'center', alignSelf: 'flex-end', backgroundColor: '#08241A', borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: 24 },
  okText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
