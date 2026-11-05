import { useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { Carrier, LogisticsVehicle } from '@/services/api/operations-api';
import { AppButton, AppScreen, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { OriginalUserIcon } from '@/ui/components/original-user-icon';
import { logisticsRecords, type LogisticsRecord } from '../logistics-records';

type Props = {
  username: string;
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
  onBack: () => void;
  onHome: () => void;
  onRefresh: () => void;
  onEditCarrier: (carrier: Carrier) => void;
  onEditVehicle: (vehicle: LogisticsVehicle) => void;
  onDeactivateCarrier: (carrier: Carrier) => void;
  onDeactivateVehicle: (vehicle: LogisticsVehicle) => void;
};

/** Carros 18:459: original assets and a live, complete set of references. */
export function ReferenceLogisticsScreen(props: Props) {
  const { width, fontScale } = useWindowDimensions();
  const canvas = Math.min(width, 1440);
  const wide = canvas >= 1240 && fontScale <= 1.2;
  const [fontsLoaded, fontError] = useFonts({ MercadoInter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf') });
  const [page, setPage] = useState(0);
  const rows = logisticsRecords(props.carriers, props.vehicles, props.search);
  const lastPage = Math.max(0, Math.ceil(rows.length / 4) - 1);
  const current = Math.min(page, lastPage);
  const visible = rows.slice(current * 4, current * 4 + 4);
  const disabled = props.blocked || props.loading;
  const panelWidth = wide ? Math.min(canvas - 48, 1281) : canvas - 32;
  const searchWidth = wide ? Math.min(canvas - 48, 1127) : canvas - 32;
  function search(value: string) { setPage(0); props.onSearchChange(value); }
  function edit(row: LogisticsRecord) { if (row.vehicle) props.onEditVehicle(row.vehicle); else if (row.carrier) props.onEditCarrier(row.carrier); }
  function deactivate(row: LogisticsRecord) { if (row.vehicle) props.onDeactivateVehicle(row.vehicle); else if (row.carrier) props.onDeactivateCarrier(row.carrier); }
  function addSlot() {
    return <View key="new-reference" style={wide ? styles.addReservation : styles.compactAddReservation}>
      <Pressable accessibilityRole="button" accessibilityLabel="Nuevo transportista o vehículo" disabled={disabled || !props.canEdit || props.unavailable} onPress={props.onNew} style={({ pressed }) => [styles.add, wide ? styles.referenceAdd : styles.compactAdd, (pressed || disabled || !props.canEdit || props.unavailable) && styles.dimmed]}>
        <Image source={require('../../../../assets/figma/original/carros/add.svg')} contentFit="contain" accessibilityElementsHidden style={styles.addImage} />
      </Pressable>
    </View>;
  }
  if (!fontsLoaded && !fontError) return <AppScreen><LoadingState label="Preparando Carros" /></AppScreen>;
  return <AppScreen edgeToEdge contentContainerStyle={[styles.screen, { width: canvas }, !wide && styles.compactScreen]} testID="reference-logistics-screen">
    <View pointerEvents="none" aria-hidden style={styles.frameBorder} />
    {wide ? <View pointerEvents="none" aria-hidden style={[styles.band, { width: canvas - 39 }]} /> : null}
    <View style={wide ? styles.header : styles.compactHeader}>
      <OriginalUserIcon style={wide ? styles.referenceUser : styles.compactUser} />
      <Text accessibilityLabel={`Usuario: ${props.username}`} numberOfLines={1} style={[styles.username, wide ? { position: 'absolute', left: 121, top: 26, maxWidth: canvas * 568 / 1440 - 145 } : styles.compactUsername]}>{props.username}</Text>
      <Text accessibilityRole="header" style={[styles.title, wide ? { position: 'absolute', left: canvas * 568 / 1440, top: 10 } : styles.compactTitle]}>Carros</Text>
      <View style={wide ? styles.refresh : styles.compactRefresh}><AppButton label={props.loading ? 'Actualizando logística…' : 'Actualizar logística'} disabled={disabled} onPress={props.onRefresh} tone="secondary" /></View>
    </View>
    <View style={[styles.main, !wide && styles.compactMain]}>
      <View style={[styles.searchRegion, { width: searchWidth }, !wide && styles.compactSearchRegion]}>
        <LogisticsSearch label="Buscar transportista o vehículo" value={props.search} onChangeText={search} />
        <View style={[styles.pageSummary, !wide && styles.compactPageSummary]}>
          {!props.unavailable ? <Text accessibilityLiveRegion="polite" style={styles.pageLabel}>Página {current + 1} de {lastPage + 1} · {rows.length} registros</Text> : <View />}
          <Pressable accessibilityRole="button" accessibilityLabel="Limpiar búsqueda de logística" onPress={() => search('')} style={({ pressed }) => [styles.clear, pressed && styles.dimmed]}><Text style={styles.clearLabel}>Limpiar búsqueda</Text></Pressable>
        </View>
      </View>
      {fontError ? <View style={styles.feedback}><FeedbackState title="Tipografía no disponible" message="Carros sigue disponible con la tipografía del dispositivo." /></View> : null}
      {props.feedback ? <View style={styles.feedback}>{props.feedback}</View> : null}
      <View style={[styles.records, { width: panelWidth }, !wide && styles.compactRecords]}>
        {!props.unavailable && visible.length === 0 ? <EmptyState title={props.carriers.length || props.vehicles.length ? 'Sin coincidencias de logística' : 'Sin registros de logística'} message={props.carriers.length || props.vehicles.length ? 'Prueba otro nombre, teléfono o placa, o limpia la búsqueda.' : 'Registra un transportista o vehículo para utilizarlo en tus operaciones.'} /> : null}
        {!props.unavailable ? visible.flatMap((row, index) => {
          const primary = row.vehicle ? `vehículo ${row.vehicle.plate}` : `transportista ${row.name}`;
          const nameContent = <>
            <View pointerEvents="none" aria-hidden style={[styles.nameBorder, !wide && styles.compactNameBorder]} />
            <OriginalUserIcon style={wide ? styles.rowUser : styles.compactRowUser} />
            {wide ? <Image source={require('../../../../assets/figma/original/carros/field.svg')} contentFit="contain" accessibilityElementsHidden style={styles.nameField} /> : null}
            <Text numberOfLines={wide ? 1 : undefined} style={[styles.name, !wide && styles.compactName]}>{row.name}</Text>
            {row.vehicle?.description ? <Text numberOfLines={wide ? 1 : undefined} style={[styles.description, !wide && styles.compactDescription]}>{row.vehicle.description}</Text> : null}
          </>;
          return [<View key={row.key} style={[styles.record, !wide && styles.compactRecord, index === 0 && wide && styles.firstSpacing, index === 1 && wide && styles.secondSpacing, index >= 3 && wide && styles.laterSpacing]}>
            {props.canEdit && row.vehicle && row.carrier ? <Pressable accessibilityRole="button" accessibilityLabel={`Editar transportista ${row.name} para ${row.vehicle.plate}`} accessibilityHint="Abre el formulario del transportista. La placa se edita por separado." disabled={disabled} onPress={() => props.onEditCarrier(row.carrier!)} style={({ pressed }) => [styles.nameCard, !wide && styles.compactNameCard, pressed && styles.dimmed]}>{nameContent}</Pressable> : <View style={[styles.nameCard, !wide && styles.compactNameCard]}>{nameContent}</View>}
            <View style={[styles.contactCard, !wide && styles.compactContactCard]}>
              <View style={styles.contactDetails}><Text numberOfLines={wide ? 1 : undefined} style={styles.contact}>Teléfono: {row.phone || '—'}</Text><Text numberOfLines={wide ? 1 : undefined} style={styles.contact}>Placa: {row.vehicle?.plate ?? 'Sin vehículo'}</Text></View>
              {props.canEdit ? <View style={[styles.recordActions, !wide && styles.compactRecordActions]}><AppButton label="Editar" accessibilityLabel={`Editar ${primary}`} disabled={disabled} onPress={() => edit(row)} tone="secondary" expandLabel /><AppButton label="Desactivar" accessibilityLabel={`Desactivar ${primary}`} disabled={disabled} onPress={() => deactivate(row)} tone="secondary" expandLabel /></View> : null}
            </View>
          </View>, ...(index === 2 ? [addSlot()] : [])];
        }) : null}
        {visible.length < 3 || props.unavailable ? addSlot() : null}
      </View>
    </View>
    <View style={[styles.navigation, !wide && styles.compactNavigation]}>
      <View pointerEvents="none" aria-hidden style={[styles.navigationBackground, { width: wide ? canvas - 39 : canvas - 16 }, !wide && styles.compactNavigationBackground]} />
      <Pressable accessibilityRole="button" accessibilityLabel={current > 0 ? 'Página anterior de Carros' : 'Volver'} disabled={disabled} onPress={() => current > 0 ? setPage(current - 1) : props.onBack()} style={({ pressed }) => [styles.navigationButton, wide && { position: 'absolute', left: canvas * 394 / 1440 }, (pressed || disabled) && styles.dimmed]}><Image source={require('../../../../assets/figma/original/carros/back.svg')} contentFit="contain" accessibilityElementsHidden style={styles.backImage} />{!wide ? <Text style={styles.navigationLabel}>{current > 0 ? 'Anterior' : 'Volver'}</Text> : null}</Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver al menú principal" disabled={disabled} onPress={props.onHome} style={({ pressed }) => [styles.navigationButton, wide && { position: 'absolute', left: canvas * 678 / 1440 }, (pressed || disabled) && styles.dimmed]}><Image source={require('../../../../assets/figma/original/carros/home.svg')} contentFit="contain" accessibilityElementsHidden style={styles.homeImage} />{!wide ? <Text style={styles.navigationLabel}>Menú</Text> : null}</Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Página siguiente de Carros" disabled={disabled || props.unavailable || current >= lastPage} onPress={() => setPage(current + 1)} style={({ pressed }) => [styles.navigationButton, wide && { position: 'absolute', left: canvas * 945 / 1440 }, (pressed || disabled || props.unavailable || current >= lastPage) && styles.dimmed]}><View style={styles.forwardTransform}><Image source={require('../../../../assets/figma/original/carros/forward.svg')} contentFit="contain" accessibilityElementsHidden style={styles.forwardImage} /></View>{!wide ? <Text style={styles.navigationLabel}>Siguiente</Text> : null}</Pressable>
    </View>
    {props.editor ? <View nativeID="logistics-editor" style={styles.editor}>{props.editor}</View> : null}
  </AppScreen>;
}

function LogisticsSearch({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  return <View style={styles.search}>
    <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder="Buscar..." placeholderTextColor="#000" autoCorrect={false} style={styles.searchInput} />
    <Image source={require('../../../../assets/figma/original/carros/search.png')} contentFit="cover" accessibilityElementsHidden style={styles.searchImage} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { maxWidth: 1440, minHeight: 1024, paddingVertical: 0, backgroundColor: '#fff' },
  compactScreen: { minHeight: 0 }, frameBorder: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderWidth: 1, borderColor: '#000' },
  band: { position: 'absolute', left: 39, top: 202, height: 75, backgroundColor: '#f6f6f6' },
  header: { height: 84 }, referenceUser: { position: 'absolute', left: 48, top: 20 },
  username: { color: '#000', fontFamily: 'MercadoInter', fontSize: 40, lineHeight: 48 }, title: { color: '#000', fontFamily: 'MercadoInter', fontSize: 64, lineHeight: 77 },
  refresh: { position: 'absolute', right: 24, top: 16 },
  compactHeader: { padding: 16, paddingBottom: 0, gap: 12 }, compactUser: { position: 'absolute', left: 16, top: 16 }, compactUsername: { marginLeft: 66, minHeight: 54, paddingTop: 12, fontSize: 24, lineHeight: 29 }, compactTitle: { fontSize: 34, lineHeight: 42 }, compactRefresh: { alignSelf: 'flex-start' },
  main: { minHeight: 836 }, compactMain: { minHeight: 0 },
  searchRegion: { alignSelf: 'center', marginTop: 50, transform: [{ translateX: 2.5 }] }, compactSearchRegion: { marginTop: 24, transform: [] },
  search: { height: 61, borderRadius: 45, backgroundColor: '#e9e9e9', justifyContent: 'center' },
  searchInput: { height: 61, paddingLeft: 18.7833, paddingRight: 88, fontFamily: 'MercadoInter', color: '#000', fontSize: 28 },
  searchImage: { position: 'absolute', right: 17.6214, top: 0.1744, width: 60.6512, height: 60.6512 },
  pageSummary: { height: 49, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, pageLabel: { fontFamily: 'MercadoInter', color: '#454545', fontSize: 14, flexShrink: 1 }, clear: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' }, clearLabel: { fontFamily: 'MercadoInter', color: '#000', fontSize: 14, textDecorationLine: 'underline' },
  compactPageSummary: { height: 'auto', minHeight: 49, flexWrap: 'wrap', paddingVertical: 4 },
  feedback: { marginHorizontal: 24, marginBottom: 16 },
  records: { alignSelf: 'center', transform: [{ translateX: 13.5 }] }, compactRecords: { transform: [] },
  record: { flexDirection: 'row', gap: 26, minHeight: 120 }, compactRecord: { flexDirection: 'column', gap: 8, marginBottom: 20 }, firstSpacing: { marginBottom: 32 }, secondSpacing: { marginBottom: 27 }, laterSpacing: { marginBottom: 0 },
  nameCard: { flex: 784, minWidth: 0, height: 119, marginTop: 1, borderRadius: 20, backgroundColor: '#e3e3e3' }, nameBorder: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, borderWidth: 1, borderColor: '#d9d9d9' }, compactNameBorder: { borderRadius: 20 },
  rowUser: { position: 'absolute', left: 16, top: 16 }, nameField: { position: 'absolute', left: 97, top: 32, width: 621, height: 45 },
  name: { position: 'absolute', left: 109, top: 37, width: 597, fontFamily: 'MercadoInter', fontSize: 28, lineHeight: 34, color: '#000' }, description: { position: 'absolute', left: 97, top: 84, right: 16, fontFamily: 'MercadoInter', fontSize: 14, color: '#454545' },
  compactNameCard: { flex: 0, flexBasis: 'auto', flexShrink: 0, minHeight: 90, height: 'auto', padding: 16, paddingLeft: 82 }, compactRowUser: { position: 'absolute', left: 16, top: 16 }, compactName: { position: 'relative', left: 0, top: 0, width: 'auto', minHeight: 38, paddingTop: 9, fontSize: 22, lineHeight: 27 }, compactDescription: { position: 'relative', left: 0, top: 0, right: 'auto', marginTop: 4 },
  contactCard: { flex: 471, minWidth: 0, minHeight: 120, borderRadius: 20, backgroundColor: '#d9d9d9', flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 }, contactDetails: { flex: 1, minWidth: 0, gap: 4, paddingLeft: 38, paddingVertical: 16 }, contact: { fontFamily: 'MercadoInter', fontSize: 18, lineHeight: 24, color: '#000' }, recordActions: { gap: 4, maxWidth: 160, paddingVertical: 6 },
  compactContactCard: { flex: 0, flexBasis: 'auto', flexShrink: 0, flexDirection: 'column', alignItems: 'stretch', gap: 8, padding: 12, minHeight: 0 }, compactRecordActions: { flexDirection: 'row', flexWrap: 'wrap', maxWidth: '100%', gap: 8 },
  addReservation: { height: 137, position: 'relative' }, compactAddReservation: { minHeight: 101, alignItems: 'flex-end' }, add: { width: 85, height: 85, alignItems: 'center', justifyContent: 'center' }, referenceAdd: { position: 'absolute', right: 21, top: 19 }, compactAdd: { marginTop: 4, marginBottom: 12 }, addImage: { width: 70.8333, height: 70.8333 },
  navigation: { height: 104 }, navigationBackground: { position: 'absolute', left: 20, top: 14, height: 75, backgroundColor: '#f6f6f6' }, navigationButton: { width: 103, height: 104, alignItems: 'flex-start' }, backImage: { width: 93, height: 93, marginTop: 10 }, homeImage: { width: 72, height: 72, marginTop: 16 }, forwardTransform: { transform: [{ rotate: '180deg' }, { scaleY: -1 }] }, forwardImage: { width: 103, height: 103 },
  compactNavigation: { height: 130, flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, compactNavigationBackground: { left: 8 }, navigationLabel: { position: 'absolute', top: 104, left: 0, width: 103, textAlign: 'center', fontFamily: 'MercadoInter', fontSize: 12, color: '#000' },
  editor: { padding: 24, gap: 24, marginTop: 24 }, dimmed: { opacity: 0.46 },
});
