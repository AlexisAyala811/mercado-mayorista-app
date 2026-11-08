import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Carrier, LogisticsVehicle } from '@/services/api/operations-api';
import { AppButton, AppScreen, EmptyState, FormField } from '@/ui/components';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, radius, spacing, typography } from '@/ui/tokens';
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
  const rows = logisticsRecords(props.carriers, props.vehicles, props.search);
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1);
  const current = Math.min(page, lastPage);
  const visible = rows.slice(current * pageSize, current * pageSize + pageSize);
  const disabled = props.blocked || props.loading;
  const canCreate = !disabled && props.canEdit && !props.unavailable;
  function search(value: string) { setPage(0); props.onSearchChange(value); }
  function edit(row: LogisticsRecord) { if (row.vehicle) props.onEditVehicle(row.vehicle); else if (row.carrier) props.onEditCarrier(row.carrier); }
  function deactivate(row: LogisticsRecord) { if (row.vehicle) props.onDeactivateVehicle(row.vehicle); else if (row.carrier) props.onDeactivateCarrier(row.carrier); }

  return <AppScreen contentContainerStyle={styles.screen} testID="reference-logistics-screen">
    <AppHeader eyebrow="COMPRA · TRANSPORTISTAS Y VEHÍCULOS" title="Carros" />
    <View style={styles.toolbar}>
      <View style={styles.search}><FormField label="Buscar transportista o vehículo" accessibilityLabel="Buscar transportista o vehículo" value={props.search} onChangeText={search} placeholder="Nombre, teléfono o placa" autoCorrect={false} /></View>
      <AppButton label="Limpiar búsqueda" accessibilityLabel="Limpiar búsqueda de logística" tone="secondary" onPress={() => search('')} />
      <AppButton label={props.loading ? 'Actualizando logística…' : 'Actualizar logística'} disabled={disabled} onPress={props.onRefresh} tone="secondary" />
      <AppButton label="Nuevo" accessibilityLabel="Nuevo transportista o vehículo" disabled={!canCreate} onPress={props.onNew} />
    </View>
    {props.feedback}
    {!props.unavailable ? <Text accessibilityLiveRegion="polite" style={styles.count}>Página {current + 1} de {lastPage + 1} · {rows.length} registros</Text> : null}
    {!props.unavailable && visible.length === 0 ? <EmptyState title={props.carriers.length || props.vehicles.length ? 'Sin coincidencias de logística' : 'Sin registros de logística'} message={props.carriers.length || props.vehicles.length ? 'Prueba otro nombre, teléfono o placa, o limpia la búsqueda.' : 'Registra un transportista o vehículo para utilizarlo en tus operaciones.'} /> : null}
    {!props.unavailable ? <View style={styles.list}>{visible.map((row) => {
      const primary = row.vehicle ? `vehículo ${row.vehicle.plate}` : `transportista ${row.name}`;
      const identity = <View style={styles.identity}>
        <Text numberOfLines={1} style={styles.name}>{row.name}</Text>
        {row.vehicle?.description ? <Text numberOfLines={1} style={styles.meta}>{row.vehicle.description}</Text> : null}
      </View>;
      return <View key={row.key} style={styles.row}>
        {props.canEdit && row.vehicle && row.carrier
          ? <Pressable accessibilityRole="button" accessibilityLabel={`Editar transportista ${row.name} para ${row.vehicle.plate}`} accessibilityHint="Abre el formulario del transportista. La placa se edita por separado." disabled={disabled} onPress={() => props.onEditCarrier(row.carrier!)} style={({ pressed }) => [styles.identityButton, pressed && styles.dimmed]}>{identity}</Pressable>
          : <View style={styles.identityButton}>{identity}</View>}
        <View style={styles.details}>
          <Text style={styles.detail}>Teléfono: {row.phone || '—'}</Text>
          <View style={styles.plate}><Text style={styles.plateText}>{row.vehicle?.plate ?? 'Sin vehículo'}</Text></View>
        </View>
        {props.canEdit ? <View style={styles.actions}>
          <AppButton label="Editar" accessibilityLabel={`Editar ${primary}`} disabled={disabled} onPress={() => edit(row)} tone="secondary" />
          <AppButton label="Desactivar" accessibilityLabel={`Desactivar ${primary}`} disabled={disabled} onPress={() => deactivate(row)} tone="secondary" />
        </View> : null}
      </View>;
    })}</View> : null}
    <View style={styles.navigation}>
      <AppButton label="Página anterior" accessibilityLabel="Página anterior de Carros" tone="secondary" disabled={disabled || current === 0} onPress={() => setPage(current - 1)} />
      <AppButton label="Página siguiente" accessibilityLabel="Página siguiente de Carros" tone="secondary" disabled={disabled || props.unavailable || current >= lastPage} onPress={() => setPage(current + 1)} />
    </View>
    {props.editor ? <View nativeID="logistics-editor" style={styles.editor}>{props.editor}</View> : null}
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg, maxWidth: 1280 },
  toolbar: { alignItems: 'flex-end', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  search: { flexBasis: 320, flexGrow: 1 },
  count: { color: color.textSecondary, ...typography.bodySmall },
  list: { gap: spacing.sm },
  row: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, padding: spacing.md },
  identityButton: { flexBasis: 280, flexGrow: 2, minHeight: 48, justifyContent: 'center' },
  identity: { gap: spacing.xs, minWidth: 0 },
  name: { color: color.textPrimary, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  meta: { color: color.textSecondary, ...typography.bodySmall },
  details: { alignItems: 'center', flexBasis: 240, flexDirection: 'row', flexGrow: 1, flexWrap: 'wrap', gap: spacing.sm },
  detail: { color: color.textPrimary, ...typography.bodySmall },
  plate: { backgroundColor: color.brandMuted, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  plateText: { color: color.brand, ...typography.bodySmall, fontWeight: '800', letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  navigation: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  editor: { gap: spacing.lg },
  dimmed: { opacity: 0.5 },
});
