import { useState, type ReactNode } from 'react';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import type { Account } from '@/services/api/operations-api';
import { accountCounterpartyName } from '@/domain/accounts/account-filters';
import { accountDueLabel, accountMovementLabel } from '@/domain/accounts/account-dates';
import { formatMoney } from '@/domain/reception/reception';
import { AppButton, AppScreen, ChoiceDialog, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { OriginalUserIcon } from '@/ui/components/original-user-icon';

type Props = {
  username: string; accounts: Account[]; total: number; ready: boolean;
  search: string; filterKey: string; onSearch: (value: string) => void;
  onOpen: (account: Account) => void; onBack: () => void; onHome: () => void;
  onRefresh: () => void; onNewSource: (source: 'purchase' | 'sale') => void;
  feedback: ReactNode; children: ReactNode;
};

/** Deudas 20:531; financial commands stay in AccountsContent. */
export function ReferenceAccountsOverview(props: Props) {
  const { width, fontScale } = useWindowDimensions();
  const canvas = Math.min(width, 1440);
  const wide = canvas >= 1280 && fontScale <= 1.2;
  const [fontsLoaded, fontError] = useFonts({ MercadoInter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf') });
  const [paging, setPaging] = useState({ key: props.filterKey, page: 0 });
  const [sourceVisible, setSourceVisible] = useState(false);
  const lastPage = Math.max(0, Math.ceil(props.accounts.length / 4) - 1);
  const page = Math.min(paging.key === props.filterKey ? paging.page : 0, lastPage);
  const visible = props.accounts.slice(page * 4, page * 4 + 4);
  const panelLeft = wide ? canvas * 92 / 1440 : 16;
  const panelWidth = wide ? Math.min(1281, canvas - panelLeft - 24) : canvas - 32;
  const goPage = (next: number) => setPaging({ key: props.filterKey, page: next });
  const add = () => <View key="source" style={wide ? styles.addSlot : styles.compactAddSlot}>
    <Pressable accessibilityRole="button" accessibilityLabel="Nueva operación que origina una cuenta" onPress={() => setSourceVisible(true)} style={({ pressed }) => [styles.add, wide && styles.wideAdd, pressed && styles.dimmed]}>
      <Image source={require('../../../../assets/figma/original/deudas/add.svg')} contentFit="contain" accessibilityElementsHidden style={styles.addImage} />
    </Pressable>
  </View>;
  if (!fontsLoaded && !fontError) return <AppScreen><LoadingState label="Preparando Deudas" /></AppScreen>;
  return <>
    <AppScreen edgeToEdge contentContainerStyle={[styles.screen, { width: canvas }]} testID="reference-accounts-overview">
      <View style={wide ? styles.header : styles.compactHeader}>
        {wide ? <View pointerEvents="none" aria-hidden style={[styles.band, { width: canvas - 39 }]} /> : null}
        <OriginalUserIcon variant="purchase" style={wide ? styles.headerUser : undefined} />
        <Text accessibilityLabel={`Usuario: ${props.username}`} numberOfLines={wide ? 1 : undefined} style={[styles.username, wide ? { position: 'absolute', left: 120, top: 25, maxWidth: canvas * 567 / 1440 - 144 } : styles.compactUsername]}>{props.username}</Text>
        <Text accessibilityRole="header" style={[styles.title, wide ? { position: 'absolute', left: canvas * 567 / 1440, top: 9 } : styles.compactTitle]}>Deudas</Text>
        <View style={wide ? { position: 'absolute', left: canvas * 159 / 1440, top: 134, width: Math.min(1127, canvas - 2 * canvas * 159 / 1440) } : styles.compactSearch}>
          <AccountsSearch label="Nombre o referencia de cuenta" value={props.search} onChangeText={props.onSearch} />
        </View>
      </View>
      {props.feedback ? <View style={styles.auxiliary}>{props.feedback}</View> : null}
      {fontError ? <FeedbackState title="Tipografía no disponible" message="Puedes consultar las cuentas con la tipografía del dispositivo." /> : null}
      <View style={{ marginLeft: panelLeft, width: panelWidth }}>
        {props.ready ? <>
          {!visible.length ? <EmptyState title={props.total ? 'Sin resultados de cuentas' : 'Sin cuentas'} message={props.total ? 'No hay cuentas que coincidan con la búsqueda y filtros.' : 'No existen saldos registrados.'} /> : null}
          {visible.flatMap((account, index) => {
            const name = accountCounterpartyName(account);
            const kind = account.kind === 'payable' ? 'Por pagar' : 'Por cobrar';
            const state = { open: 'Pendiente', paid: 'Pagada', voided: 'Anulada' }[account.state];
            return [<View key={account.id} style={[styles.row, !wide && styles.compactRow, wide && { marginBottom: index === 0 ? 33 : index === 1 ? 28 : 0 }]}>
              <View style={[styles.party, wide ? { flex: 0, width: Math.max(720, panelWidth * 784 / 1281) } : styles.compactParty]}>
                <OriginalUserIcon variant="purchase" style={wide ? styles.partyUser : undefined} />
                <View style={wide ? styles.nameSlot : styles.compactNameSlot}>
                  {wide ? <Image source={require('../../../../assets/figma/original/deudas/field.svg')} contentFit="contain" accessibilityElementsHidden style={styles.fieldImage} /> : null}
                  <Text numberOfLines={wide ? 1 : undefined} style={styles.name}>{name}</Text>
                </View>
                <Text numberOfLines={wide ? 1 : undefined} style={wide ? styles.reference : styles.compactReference}>{kind} · Referencia {account.id}</Text>
                <View style={wide ? styles.dates : styles.compactDates}><Text style={styles.dateText}>{accountDueLabel(account.nextDueOn)} · {accountMovementLabel(account.lastMovementAt)}</Text></View>
              </View>
              <View style={[styles.balanceCard, wide ? { flex: 1 } : styles.compactBalance]}>
                <View style={styles.balanceCopy}><Text style={styles.label}>Saldo · {state}</Text><Text style={styles.balance}>{formatMoney(account.balanceCents)}</Text></View>
                <AppButton label="Ver detalle" accessibilityLabel={`Ver detalle de ${name}, referencia ${account.id}`} tone="secondary" onPress={() => props.onOpen(account)} />
              </View>
            </View>, ...(index === 2 ? [add()] : [])];
          })}
          {visible.length < 3 ? add() : null}
        </> : null}
      </View>
      <View style={[styles.navigation, !wide && styles.compactNavigation]}>
        <View pointerEvents="none" aria-hidden style={[styles.navBand, { width: canvas - 39 }]} />
        <Pressable accessibilityRole="button" accessibilityLabel={page ? 'Página anterior de cuentas' : 'Volver'} onPress={() => page ? goPage(page - 1) : props.onBack()} style={[styles.navButton, wide && { position: 'absolute', left: canvas * 393 / 1440 }]}><Image source={require('../../../../assets/figma/original/carros/back.svg')} contentFit="contain" accessibilityElementsHidden style={styles.back} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al menú principal" onPress={props.onHome} style={[styles.navButton, wide && { position: 'absolute', left: canvas * 677 / 1440 }]}><Image source={require('../../../../assets/figma/original/carros/home.svg')} contentFit="contain" accessibilityElementsHidden style={styles.home} /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Página siguiente de cuentas" disabled={!props.ready || page >= lastPage} onPress={() => goPage(page + 1)} style={[styles.navButton, wide && { position: 'absolute', left: canvas * 944 / 1440 }, (!props.ready || page >= lastPage) && styles.dimmed]}><View style={styles.forwardTransform}><Image source={require('../../../../assets/figma/original/carros/forward.svg')} contentFit="contain" accessibilityElementsHidden style={styles.forward} /></View></Pressable>
      </View>
      <View style={styles.auxiliary}>{props.ready ? <Text accessibilityLiveRegion="polite" style={styles.count}>{props.accounts.length ? `${page * 4 + 1}–${page * 4 + visible.length} de ${props.accounts.length}` : '0'} cuentas · {props.total} consultadas</Text> : null}<AppButton label="Actualizar" onPress={props.onRefresh} tone="secondary" />{props.children}</View>
    </AppScreen>
    <ChoiceDialog visible={sourceVisible} title="Las cuentas se originan en operaciones a crédito" choices={[{ id: 'purchase', label: 'Registrar compra', supportingText: 'La cuenta por pagar se crea al liquidar la compra a crédito.' }, { id: 'sale', label: 'Registrar venta', supportingText: 'La cuenta por cobrar se crea al confirmar la venta a crédito.' }]} onClose={() => setSourceVisible(false)} onSelect={choice => { if (choice.id === 'purchase' || choice.id === 'sale') { setSourceVisible(false); props.onNewSource(choice.id); } }} />
  </>;
}

function AccountsSearch({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const { fontScale } = useWindowDimensions();
  return <View style={styles.search}><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder="Buscar..." style={[styles.searchInput, fontScale <= 1.2 && { height: 61, paddingVertical: 0 }]} autoCorrect={false} /><Image pointerEvents="none" source={require('../../../../assets/figma/original/carros/search.png')} contentFit="contain" accessibilityElementsHidden style={styles.searchImage} /></View>;
}

const styles = StyleSheet.create({
  screen: { alignSelf: 'center', backgroundColor: '#fff' }, header: { height: 244 }, compactHeader: { padding: 16, gap: 12, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }, band: { position: 'absolute', left: 12, top: 9, height: 75, backgroundColor: '#f6f6f6' }, headerUser: { position: 'absolute', left: 48, top: 20 }, username: { fontFamily: 'MercadoInter', fontSize: 40, color: '#000' }, compactUsername: { flex: 1, minWidth: 150, fontSize: 24 }, title: { fontFamily: 'MercadoInter', fontSize: 64, color: '#000' }, compactTitle: { width: '100%', fontSize: 36 }, compactSearch: { width: '100%' },
  search: { minHeight: 61, backgroundColor: '#e9e9e9', borderRadius: 45, flexDirection: 'row', alignItems: 'center' }, searchInput: { flex: 1, minWidth: 0, paddingLeft: 19, paddingVertical: 12, paddingRight: 72, fontFamily: 'MercadoInter', fontSize: 28, color: '#000' }, searchImage: { position: 'absolute', right: 18, width: 60.651, height: 60.651 },
  row: { flexDirection: 'row', gap: 26, minHeight: 119, height: 'auto' }, compactRow: { flexDirection: 'column', height: 'auto', gap: 8, marginBottom: 20 }, party: { flex: 784, backgroundColor: '#e3e3e3', borderColor: '#d9d9d9', borderWidth: 1, borderRadius: 20, position: 'relative' }, compactParty: { flex: 0, flexBasis: 'auto', flexShrink: 0, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', padding: 16, gap: 12 }, partyUser: { position: 'absolute', left: 16, top: 16 }, nameSlot: { position: 'absolute', left: 97, top: 32, width: 621, height: 45, justifyContent: 'center', paddingHorizontal: 12 }, compactNameSlot: { flex: 1, minWidth: 150 }, fieldImage: { position: 'absolute', left: 0, top: 0, width: 621, height: 45 }, name: { fontFamily: 'MercadoInter', fontSize: 24, color: '#000' }, reference: { position: 'absolute', left: 97, right: 12, top: 84, fontSize: 14, color: '#303030' }, compactReference: { width: '100%', fontSize: 16, color: '#303030' },
  dates: { paddingTop: 108, paddingLeft: 97, paddingRight: 12, paddingBottom: 12 }, compactDates: { width: '100%' }, dateText: { fontSize: 14, lineHeight: 20, color: '#303030' },
  balanceCard: { flex: 471, backgroundColor: '#d9d9d9', borderRadius: 20, paddingHorizontal: 24, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }, compactBalance: { flex: 0, flexBasis: 'auto', flexShrink: 0 }, balanceCopy: { flex: 1, minWidth: 120, gap: 4 }, label: { fontSize: 16, color: '#303030' }, balance: { fontFamily: 'MercadoInter', fontSize: 28, color: '#000' }, addSlot: { height: 138 }, compactAddSlot: { minHeight: 101, alignItems: 'flex-end' }, add: { width: 85, height: 85, alignItems: 'center', justifyContent: 'center' }, wideAdd: { alignSelf: 'flex-end', marginRight: 21, marginTop: 19 }, addImage: { width: 70.8333, height: 70.8333 }, count: { color: '#454545', fontSize: 14, marginVertical: 8 },
  navigation: { height: 104 }, compactNavigation: { flexDirection: 'row', justifyContent: 'space-around' }, navBand: { position: 'absolute', left: 19, top: 14, height: 75, backgroundColor: '#f6f6f6' }, navButton: { width: 103, height: 104 }, back: { width: 93, height: 93, marginTop: 10 }, home: { width: 72, height: 72, marginTop: 16 }, forward: { width: 103, height: 103 }, forwardTransform: { transform: [{ rotate: '180deg' }, { scaleY: -1 }] }, auxiliary: { padding: 24, gap: 24 }, dimmed: { opacity: 0.45 },
});
