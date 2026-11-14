import { useState, type ReactNode } from 'react';
import { SymbolView } from '@/ui/components/symbol';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import type { Carrier, LogisticsVehicle } from '@/services/api/operations-api';
import { AppButton, AppScreen, EmptyState } from '@/ui/components';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, spacing } from '@/ui/tokens';
import { logisticsRecords, type LogisticsRecord } from '../logistics-records';

type Props = {
  carriers: Carrier[];
  vehicles: LogisticsVehicle[];
  search: string;
  onSearchChange: (value: string) => void;
  canEdit: boolean;
  blocked: boolean;
  loading: boolean;
  unavailable: boolean;
  feedback: ReactNode;
  editor: ReactNode;
  onNew: () => void;
  onEditCarrier: (carrier: Carrier) => void;
  onEditVehicle: (vehicle: LogisticsVehicle) => void;
};

type Filter = 'all' | 'vehicle' | 'carrier';

// MAÑAY Carros (spec 011, T1141, CL-ST35): carriers and vehicles with search and
// filter chips as in the Stitch mockup; each card has a driver box, a vehicle
// box and «Ver Registro», which opens the editor below. The commands stay in
// LogisticsScreen.
export function ReferenceLogisticsScreen(props: Props) {
  // On a phone the vehicle card drops the avatar and takes the whole width.
  const narrow = useWindowDimensions().width < 600;
  // As in Stitch, the list stands alone; the form opens with «+» or «Ver Registro».
  const [editorOpen, setEditorOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const all = logisticsRecords(props.carriers, props.vehicles, props.search);
  const withVehicle = all.filter((row) => row.vehicle).length;
  const counts: Record<Filter, number> = { all: all.length, carrier: all.length - withVehicle, vehicle: withVehicle };
  const visible = filter === 'all' ? all : all.filter((row) => (filter === 'vehicle') === Boolean(row.vehicle));
  const disabled = props.blocked || props.loading;
  const canCreate = !disabled && props.canEdit && !props.unavailable;
  function open(row: LogisticsRecord) { setEditorOpen(true); if (row.vehicle) props.onEditVehicle(row.vehicle); else if (row.carrier) props.onEditCarrier(row.carrier); }
  const chips: [Filter, string][] = [['all', 'Todos los Carros'], ['vehicle', 'Con vehículo'], ['carrier', 'Solo transportista']];

  return <View style={styles.root}>
    <AppScreen contentContainerStyle={styles.screen} testID="reference-logistics-screen">
      <AppHeader eyebrow="COMPRA" subtitle="MAÑAY • Registro de vehículos y choferes" title="Carros" />
      <View style={styles.column}>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <TextInput accessibilityLabel="Buscar transportista o vehículo" autoCorrect={false} onChangeText={props.onSearchChange} placeholder="Buscar por placa, chofer o teléfono…" placeholderTextColor="#64748B" style={styles.searchInput} value={props.search} />
            <SymbolView fallback={null} name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} size={22} tintColor="#475569" />
          </View>
          {props.canEdit ? <Pressable accessibilityLabel="Registrar carro" accessibilityRole="button" disabled={!canCreate} onPress={() => { setEditorOpen(true); props.onNew(); }} style={({ pressed }) => [styles.register, (!canCreate || pressed) && styles.dimmed]} testID="logistics-register">
            <Text style={styles.registerText}>+ Registrar Carro</Text>
          </Pressable> : null}
        </View>
        {!props.unavailable ? <View accessibilityRole="radiogroup" style={styles.filters}>
          <Text style={styles.filterLabel}>Filtrar:</Text>
          {chips.map(([id, label]) => {
            const checked = filter === id;
            return <Pressable accessibilityLabel={`${label} (${counts[id]})`} accessibilityRole="radio" accessibilityState={{ checked }} key={id} onPress={() => setFilter(id)} style={[styles.chip, checked && styles.chipOn]}>
              <View style={[styles.chipDot, { backgroundColor: checked ? '#34D399' : '#10B981' }]} />
              <Text style={[styles.chipText, checked && styles.chipTextOn]}>{`${label} (${counts[id]})`}</Text>
            </Pressable>;
          })}
        </View> : null}
        {props.feedback}
        {!props.unavailable && visible.length === 0 ? <EmptyState title={props.carriers.length || props.vehicles.length ? 'Sin coincidencias de logística' : 'Sin registros de logística'} message={props.carriers.length || props.vehicles.length ? 'Prueba otro nombre, teléfono o placa, o cambia el filtro.' : 'Registra un transportista o vehículo con el botón «+».'} /> : null}
        {!props.unavailable ? <View style={styles.list}>{visible.map((row) => {
          const primary = row.vehicle ? `vehículo ${row.vehicle.plate}` : `transportista ${row.name}`;
          const driver = <View style={styles.box}>
            <Text style={styles.boxLabel}>CHOFER ASIGNADO</Text>
            <Text numberOfLines={1} style={styles.boxName}>{row.name}</Text>
            <Text numberOfLines={1} style={styles.boxMeta}>{row.phone ? `Cel. ${row.phone}` : 'Sin celular'}</Text>
          </View>;
          return <View key={row.key} style={styles.row}>
            <View style={[styles.rowMain, narrow && styles.rowMainNarrow]}>
              {narrow ? null : <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
                <SymbolView fallback={null} name={{ android: 'person', ios: 'person', web: 'person' }} size={28} tintColor="#1F3A2F" />
              </View>}
              <View style={styles.boxes}>
                {props.canEdit && row.vehicle && row.carrier
                  ? <Pressable accessibilityRole="button" accessibilityLabel={`Editar transportista ${row.name} para ${row.vehicle.plate}`} accessibilityHint="Abre el formulario del transportista. La placa se edita por separado." disabled={disabled} onPress={() => { setEditorOpen(true); props.onEditCarrier(row.carrier!); }} style={({ pressed }) => [styles.boxCell, pressed && styles.dimmed]}>{driver}</Pressable>
                  : <View style={styles.boxCell}>{driver}</View>}
                <View style={[styles.boxCell, styles.box]}>
                  <View style={styles.boxHead}>
                    <Text style={styles.boxLabel}>VEHÍCULO</Text>
                    {row.vehicle ? <View style={styles.plate}><Text style={styles.plateText}>{row.vehicle.plate}</Text></View> : null}
                  </View>
                  <Text numberOfLines={1} style={styles.boxName}>{row.vehicle?.description || (row.vehicle ? 'Sin descripción' : 'Sin vehículo')}</Text>
                  <Text style={styles.boxKind}>{row.vehicle ? (row.carrier ? 'Con transportista' : 'Vehículo') : 'Transportista'}</Text>
                </View>
              </View>
            </View>
            {props.canEdit ? <Pressable accessibilityLabel={`Ver registro de ${primary}`} accessibilityRole="button" disabled={disabled} onPress={() => open(row)} style={({ pressed }) => [styles.viewButton, (disabled || pressed) && styles.dimmed]}>
              <SymbolView fallback={null} name={{ android: 'edit_square', ios: 'square.and.pencil', web: 'edit' }} size={16} tintColor="#475569" />
              <Text style={styles.viewText}>Ver Registro</Text>
            </Pressable> : null}
          </View>;
        })}</View> : null}
        {props.editor && editorOpen ? <View nativeID="logistics-editor" style={styles.editor}>
          {props.editor}
          <AppButton appearance="stitch-action" label="Cerrar formulario" accessibilityLabel="Cerrar el formulario de logística" tone="secondary" onPress={() => setEditorOpen(false)} />
        </View> : null}
      </View>
    </AppScreen>
    {/* Floating «+» of the Stitch mockup (CL-ST03 reopened by CL-ST18). */}
    <Pressable accessibilityLabel="Nuevo transportista o vehículo" accessibilityRole="button" disabled={!canCreate} onPress={() => { setEditorOpen(true); props.onNew(); }} style={({ pressed }) => [styles.fab, (!canCreate || pressed) && styles.dimmed]} testID="logistics-new">
      <Text style={styles.fabText}>+</Text>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  screen: { gap: spacing.md, maxWidth: 1280, paddingBottom: 96 },
  column: { alignSelf: 'center', gap: 16, maxWidth: 960, width: '100%' },
  searchRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, flex: 1, flexBasis: 240, flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 16 },
  searchInput: { color: '#0F172A', flex: 1, fontSize: 14, fontWeight: '500', minHeight: 48 },
  register: { alignItems: 'center', backgroundColor: '#1F3A2F', borderRadius: 12, boxShadow: '0px 4px 10px rgba(15,23,42,0.2)', justifyContent: 'center', minHeight: 48, paddingHorizontal: 20 },
  registerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  filters: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterLabel: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  chip: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 14 },
  chipOn: { backgroundColor: '#1F3A2F', borderColor: '#1F3A2F' },
  chipDot: { borderRadius: 999, height: 8, width: 8 },
  chipText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  chipTextOn: { color: '#FFFFFF' },
  list: { gap: 14 },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', padding: 14 },
  rowMain: { alignItems: 'center', flex: 1, flexBasis: 360, flexDirection: 'row', gap: 14, minWidth: 0 },
  rowMainNarrow: { flexBasis: '100%' },
  avatar: { alignItems: 'center', backgroundColor: '#F2F7F4', borderColor: '#C5DCD2', borderRadius: 16, borderWidth: 1, height: 56, justifyContent: 'center', width: 56 },
  boxes: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, minWidth: 0 },
  boxCell: { flexBasis: 180, flexGrow: 1, minWidth: 0 },
  box: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, gap: 2, paddingHorizontal: 14, paddingVertical: 8 },
  boxHead: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  boxLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  boxName: { color: '#0F172A', fontSize: 14, fontWeight: '700' },
  boxMeta: { color: '#64748B', fontFamily: 'monospace', fontSize: 11 },
  boxKind: { color: '#1A4E3B', fontSize: 11, fontWeight: '600' },
  plate: { backgroundColor: '#0F172A', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  plateText: { color: '#FFFFFF', fontFamily: 'monospace', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  viewButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#CBD5E1', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  viewText: { color: '#1E293B', fontSize: 12, fontWeight: '700' },
  editor: { gap: spacing.lg },
  fab: { alignItems: 'center', backgroundColor: color.brand, borderRadius: 999, bottom: 20, boxShadow: '0px 8px 20px rgba(15,23,42,0.3)', height: 60, justifyContent: 'center', position: 'absolute', right: 24, width: 60 },
  fabText: { color: color.textOnBrand, fontSize: 34, fontWeight: '400', lineHeight: 38 },
  dimmed: { opacity: 0.5 },
});
