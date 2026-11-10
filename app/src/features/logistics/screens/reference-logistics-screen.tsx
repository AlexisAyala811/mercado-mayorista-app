import { useState, type ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  onRefresh: () => void;
  onEditCarrier: (carrier: Carrier) => void;
  onEditVehicle: (vehicle: LogisticsVehicle) => void;
  onDeactivateCarrier: (carrier: Carrier) => void;
  onDeactivateVehicle: (vehicle: LogisticsVehicle) => void;
};

const pageSize = 4;

// MAÑAY Carros (spec 011, T1141): carriers and vehicles with search, pages of
// four records and the editor below; the commands stay in LogisticsScreen.
export function ReferenceLogisticsScreen(props: Props) {
  const [page, setPage] = useState(0);
  // As in Stitch, the list stands alone; the form opens with «+» or «Editar».
  const [editorOpen, setEditorOpen] = useState(false);
  const rows = logisticsRecords(props.carriers, props.vehicles, props.search);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  const disabled = props.blocked || props.loading;
  const canCreate = !disabled && props.canEdit && !props.unavailable;
  function search(value: string) { setPage(0); props.onSearchChange(value); }
  function edit(row: LogisticsRecord) { setEditorOpen(true); if (row.vehicle) props.onEditVehicle(row.vehicle); else if (row.carrier) props.onEditCarrier(row.carrier); }
  function deactivate(row: LogisticsRecord) { if (row.vehicle) props.onDeactivateVehicle(row.vehicle); else if (row.carrier) props.onDeactivateCarrier(row.carrier); }

  return <View style={styles.root}>
    <AppScreen contentContainerStyle={styles.screen} testID="reference-logistics-screen">
      <AppHeader eyebrow="COMPRA" subtitle="MAÑAY • Transportistas y vehículos" title="Carros" />
      <View style={styles.column}>
        <View style={styles.searchBox}>
          <TextInput accessibilityLabel="Buscar transportista o vehículo" autoCorrect={false} onChangeText={search} placeholder="Buscar por placa, chofer o teléfono…" placeholderTextColor="#64748B" style={styles.searchInput} value={props.search} />
          <SymbolView fallback={null} name={{ android: 'search', ios: 'magnifyingglass', web: 'search' }} size={22} tintColor="#475569" />
        </View>
        <View style={styles.tools}>
          {!props.unavailable ? <Text accessibilityLiveRegion="polite" style={styles.count}>Página {current + 1} de {lastPage + 1} · {rows.length} registros</Text> : <View />}
          <View style={styles.toolButtons}>
            <AppButton appearance="stitch-action" label="Limpiar búsqueda" accessibilityLabel="Limpiar búsqueda de logística" tone="secondary" onPress={() => search('')} />
            <AppButton appearance="stitch-action" label={props.loading ? 'Actualizando logística…' : 'Actualizar logística'} disabled={disabled} onPress={props.onRefresh} tone="secondary" />
          </View>
        </View>
        {props.feedback}
        {!props.unavailable && visible.length === 0 ? <EmptyState title={props.carriers.length || props.vehicles.length ? 'Sin coincidencias de logística' : 'Sin registros de logística'} message={props.carriers.length || props.vehicles.length ? 'Prueba otro nombre, teléfono o placa, o limpia la búsqueda.' : 'Registra un transportista o vehículo con el botón «+».'} /> : null}
        {!props.unavailable ? <View style={styles.list}>{visible.map((row) => {
          const primary = row.vehicle ? `vehículo ${row.vehicle.plate}` : `transportista ${row.name}`;
          const identity = <View style={styles.identity}>
            <View style={styles.titleLine}>
              <Text numberOfLines={1} style={styles.name}>{row.vehicle?.description || row.name}</Text>
              {row.vehicle ? <View style={styles.plate}><Text style={styles.plateText}>{row.vehicle.plate}</Text></View> : null}
            </View>
            <Text numberOfLines={1} style={styles.meta}>{row.vehicle ? `Chofer: ${row.name}` : 'Transportista sin vehículo'}{row.phone ? ` • ${row.phone}` : ''}</Text>
          </View>;
          return <View key={row.key} style={styles.row}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
              <SymbolView fallback={null} name={{ android: row.vehicle ? 'local_shipping' : 'person', ios: 'person', web: 'person' }} size={24} tintColor="#475569" />
            </View>
            <View style={styles.inner}>
              {props.canEdit && row.vehicle && row.carrier
                ? <Pressable accessibilityRole="button" accessibilityLabel={`Editar transportista ${row.name} para ${row.vehicle.plate}`} accessibilityHint="Abre el formulario del transportista. La placa se edita por separado." disabled={disabled} onPress={() => { setEditorOpen(true); props.onEditCarrier(row.carrier!); }} style={({ pressed }) => [styles.identityButton, pressed && styles.dimmed]}>{identity}</Pressable>
                : <View style={styles.identityButton}>{identity}</View>}
              <View style={styles.tag}><Text style={styles.tagText}>{row.vehicle ? (row.carrier ? 'Con transportista' : 'Vehículo') : 'Transportista'}</Text></View>
              {props.canEdit ? <View style={styles.actions}>
                <AppButton appearance="stitch-action" label="Editar" accessibilityLabel={`Editar ${primary}`} disabled={disabled} onPress={() => edit(row)} tone="secondary" />
                <AppButton appearance="stitch-action" label="Desactivar" accessibilityLabel={`Desactivar ${primary}`} disabled={disabled} onPress={() => deactivate(row)} stitchTone="danger" tone="secondary" />
              </View> : null}
            </View>
          </View>;
        })}</View> : null}
        {rows.length > pageSize ? <View style={styles.navigation}>
          <AppButton appearance="stitch-action" label="Página anterior" accessibilityLabel="Página anterior de Carros" tone="secondary" disabled={disabled || current === 0} onPress={() => setPage(current - 1)} />
          <AppButton appearance="stitch-action" label="Página siguiente" accessibilityLabel="Página siguiente de Carros" tone="secondary" disabled={disabled || props.unavailable || current >= lastPage} onPress={() => setPage(current + 1)} />
        </View> : null}
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
  searchBox: { alignItems: 'center', backgroundColor: '#E2E8F0', borderColor: '#CBD5E1', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 48, paddingHorizontal: 20 },
  searchInput: { color: '#0F172A', flex: 1, fontSize: 15, minHeight: 48 },
  tools: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  toolButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  count: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  list: { gap: 14 },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexDirection: 'row', gap: 14, padding: 14 },
  avatar: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  inner: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  identityButton: { flexBasis: 260, flexGrow: 1, justifyContent: 'center', minHeight: 44 },
  identity: { gap: 2, minWidth: 0 },
  titleLine: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  name: { color: '#0F172A', flexShrink: 1, fontSize: 16, fontWeight: '700' },
  plate: { backgroundColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  plateText: { color: '#334155', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  meta: { color: '#475569', fontSize: 12 },
  tag: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: '#065F46', fontSize: 12, fontWeight: '600' },
  actions: { flexDirection: 'row', flexShrink: 0, gap: 8 },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  editor: { gap: spacing.lg },
  fab: { alignItems: 'center', backgroundColor: color.brand, borderRadius: 999, bottom: 20, boxShadow: '0px 8px 20px rgba(15,23,42,0.3)', height: 60, justifyContent: 'center', position: 'absolute', right: 24, width: 60 },
  fabText: { color: color.textOnBrand, fontSize: 34, fontWeight: '400', lineHeight: 38 },
  dimmed: { opacity: 0.5 },
});
