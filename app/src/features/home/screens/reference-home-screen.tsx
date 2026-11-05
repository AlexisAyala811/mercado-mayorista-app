import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { useFonts } from 'expo-font';
import type { HomeScreenProps } from './home-screen';
import { ModuleCard, type HomeModule } from '../components/module-card';
import { AppButton, AppScreen, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { MenuVisualTheme } from '@/ui/visual-theme';
import { OriginalUserIcon } from '@/ui/components/original-user-icon';

const fonts = {
  MercadoInter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  MercadoRalewayExtraBold: require('@expo-google-fonts/raleway/800ExtraBold/Raleway_800ExtraBold.ttf'),
};
const primaryIds = new Set(['purchases', 'purchase-history', 'logistics', 'accounts', 'sales']);
const purchaseCards = [
  { id: 'purchases', label: 'ANOTE', source: require('../../../../assets/figma/original/menu/imgImage1.png'), imageStyle: 'anote' as const, titleStyle: 'anote' as const },
  { id: 'purchase-history', label: 'VER COMPRAS', source: require('../../../../assets/figma/original/menu/imgImage2.png'), imageStyle: 'history' as const, titleStyle: 'history' as const },
  { id: 'logistics', label: 'CARROS', source: require('../../../../assets/figma/original/menu/imgImage3.png'), imageStyle: 'cars' as const, titleStyle: 'cars' as const },
  { id: 'accounts', label: 'DEUDAS', source: require('../../../../assets/figma/original/menu/imgImage.png'), imageStyle: 'placeholder' as const, titleStyle: 'anote' as const },
];

export function ReferenceHomeScreen({ modules: providedModules, onLogout, onOpenModule, roleLabel, userDisplayName }: HomeScreenProps) {
  const modules = providedModules.filter(module => module.id !== 'inventory' && module.id !== 'catalog');
  const { width, fontScale } = useWindowDimensions();
  const expandedText = fontScale > 1.2;
  const wide = width >= 1100 && !expandedText;
  const [fontsLoaded, fontError] = useFonts(fonts);
  const [section, setSection] = useState<'purchase' | 'sale'>('purchase');
  const [moreVisible, setMoreVisible] = useState(false);
  const primary = purchaseCards.flatMap(card => { const module = modules.find(item => item.id === card.id); return module ? [{ ...card, module }] : []; });
  const sales = modules.filter(module => ['sales', 'sales-history'].includes(module.id));
  const more = modules.filter(module => !primaryIds.has(module.id));
  const hasPurchase = primary.length > 0 || more.length > 0;
  const activeSection = section === 'sale' && sales.length ? 'sale' : hasPurchase ? 'purchase' : 'sale';
  const gridWidth = expandedText ? Math.min(width - 64, 558) : wide ? 855 : width >= 680 ? 558 : 261;
  function open(module: HomeModule) { setMoreVisible(false); onOpenModule?.(module); }
  if (!fontsLoaded && !fontError) return <MenuVisualTheme><AppScreen><LoadingState label="Cargando menú principal" /></AppScreen></MenuVisualTheme>;

  return <MenuVisualTheme>
    <AppScreen contentContainerStyle={styles.screen} showsVerticalScrollIndicator={!wide} testID="home-screen">
      <View style={[styles.account, wide ? styles.referenceAccount : styles.compactAccount]}>
        <View style={styles.accountBackground} />
        <OriginalUserIcon style={wide ? styles.referenceUserIcon : styles.compactUserIcon} />
        <Text accessibilityRole="header" accessibilityLabel={`Menú principal. Usuario ${userDisplayName}`} numberOfLines={wide ? 1 : undefined} style={[styles.username, !wide && styles.compactUsername]}>{userDisplayName}</Text>
        <View style={styles.accountActions}><Text style={styles.role}>{roleLabel}</Text>{onLogout ? <AppButton label="Cerrar sesión" onPress={onLogout} tone="secondary" /> : null}</View>
      </View>
      {fontError ? <FeedbackState title="Tipografía no disponible" message="El menú continúa disponible con la tipografía del dispositivo." /> : null}
      {modules.length ? <>
        <View accessibilityRole="tablist" style={[styles.tabs, !wide && styles.compactTabs]}>
          {hasPurchase ? <MenuTab label="Compra" selected={activeSection === 'purchase'} onPress={() => setSection('purchase')} wide={wide} /> : null}
          {sales.length ? <MenuTab label="Venta" selected={activeSection === 'sale'} onPress={() => setSection('sale')} wide={wide} /> : null}
        </View>
        {activeSection === 'purchase' ? <View style={[styles.grid, { width: gridWidth }, wide && styles.referenceOffset]}>
          {primary.map(card => <Pressable key={card.id} accessibilityRole="button" accessibilityLabel={card.module.title} accessibilityHint={card.module.description} disabled={!onOpenModule} onPress={() => open(card.module)} style={({ pressed }) => [styles.card, expandedText && styles.expandedCard, pressed && styles.pressed, !onOpenModule && styles.disabled]}>
            <View style={styles.cardBorder} />
            {expandedText ? <Text style={[styles.cardTitle, titleStyles[card.titleStyle], styles.expandedTitle]}>{card.label}</Text> : null}
            <Image source={card.source} contentFit={card.imageStyle === 'placeholder' ? 'contain' : 'cover'} style={[styles.image, imageStyles[card.imageStyle], expandedText && styles.expandedImage]} accessibilityElementsHidden />
            {card.id === 'purchases' ? <Image source={require('../../../../assets/figma/original/menu/imgGridiconsBook.svg')} style={styles.book} contentFit="contain" accessibilityElementsHidden /> : null}
            {!expandedText ? <Text style={[styles.cardTitle, titleStyles[card.titleStyle]]}>{card.label}</Text> : null}
          </Pressable>)}
          {more.length ? <Pressable accessibilityRole="button" accessibilityLabel="Más operaciones" onPress={() => setMoreVisible(true)} style={({ pressed }) => [styles.card, expandedText && styles.expandedCard, pressed && styles.pressed]}>
            <View style={styles.cardBorder} />
            {expandedText ? <Text style={[styles.cardTitle, styles.moreTitle, styles.expandedTitle]}>MÁS OPERACIONES</Text> : null}
            <Image source={require('../../../../assets/figma/original/menu/imgImage.png')} style={[styles.image, imageStyles.placeholder, expandedText && styles.expandedImage]} contentFit="contain" accessibilityElementsHidden />
            {!expandedText ? <Text style={[styles.cardTitle, styles.moreTitle]}>MÁS OPERACIONES</Text> : null}
          </Pressable> : null}
        </View> : <View style={styles.secondaryGrid}>{sales.map(module => <View key={module.id} style={styles.secondarySlot}><ModuleCard module={module} disabled={!onOpenModule} onPress={open} /></View>)}</View>}
      </> : <EmptyState title="Sin módulos disponibles" message="Tu perfil no tiene operaciones habilitadas en este momento." />}
    </AppScreen>
    <Modal animationType="slide" visible={moreVisible && more.length > 0} onRequestClose={() => setMoreVisible(false)}>
      <AppScreen contentContainerStyle={styles.moreScreen}><Text accessibilityRole="header" style={styles.moreHeading}>Más operaciones</Text><AppButton label="Volver al menú" onPress={() => setMoreVisible(false)} tone="secondary" />
        <View style={styles.secondaryGrid}>{more.map(module => <View key={module.id} style={styles.secondarySlot}><ModuleCard module={module} disabled={!onOpenModule} onPress={open} /></View>)}</View>
      </AppScreen>
    </Modal>
  </MenuVisualTheme>;
}

function MenuTab({ label, selected, onPress, wide }: { label: string; selected: boolean; onPress: () => void; wide: boolean }) {
  return <Pressable accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }} aria-selected={selected} onPress={onPress} style={({ pressed }) => [styles.tab, !wide && styles.compactTab, selected && styles.selectedTab, pressed && styles.pressed]}><Text style={[styles.tabLabel, wide && styles.referenceTabLabel, wide && (label === 'Compra' ? styles.purchaseLabel : styles.saleLabel)]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { maxWidth: 1440, paddingTop: 23, paddingBottom: 132 },
  account: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referenceAccount: { height: 75 },
  referenceUserIcon: { position: 'absolute', left: 25, top: 11 },
  compactUserIcon: { position: 'absolute', left: 12, top: 12 },
  accountBackground: { position: 'absolute', top: 0, bottom: 0, left: -11, right: -14, backgroundColor: '#f6f6f6' },
  username: { alignSelf: 'flex-start', marginTop: 16, marginLeft: 97, maxWidth: '52%', color: '#000', fontFamily: 'MercadoInter', fontSize: 40 },
  accountActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 16 }, role: { color: '#454545', fontFamily: 'MercadoInter', fontSize: 16 },
  compactAccount: { minHeight: 75, flexDirection: 'column', alignItems: 'stretch', gap: 12, padding: 12 }, compactUsername: { flexShrink: 0, alignSelf: 'stretch', marginTop: 0, marginLeft: 66, minHeight: 54, paddingTop: 12, maxWidth: '100%', fontSize: 24 },
  tabs: { alignSelf: 'center', flexDirection: 'row', gap: 70, marginTop: 31 }, compactTabs: { width: '100%', gap: 16 },
  tab: { width: 313, height: 67, backgroundColor: '#f6f6f6', borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, compactTab: { width: 'auto', flex: 1, height: 'auto', minHeight: 67, padding: 12 }, selectedTab: { backgroundColor: '#cbcbcb' },
  tabLabel: { color: '#000', fontFamily: 'MercadoInter', fontSize: 28 },
  referenceTabLabel: { position: 'absolute', top: 17 }, purchaseLabel: { left: 97 }, saleLabel: { left: 116 },
  grid: { alignSelf: 'center', marginTop: 100, flexDirection: 'row', flexWrap: 'wrap', columnGap: 36, rowGap: 39 }, referenceOffset: { transform: [{ translateX: -5.5 }] },
  card: { width: 261, height: 279, backgroundColor: '#e3e3e3', borderRadius: 20, overflow: 'hidden' },
  cardBorder: { ...StyleSheet.absoluteFill, pointerEvents: 'none', borderColor: '#d9d9d9', borderWidth: 1, borderRadius: 20 },
  image: { position: 'absolute', width: 175, height: 175 }, book: { position: 'absolute', left: 16, top: 16, width: 24, height: 24 },
  cardTitle: { position: 'absolute', color: '#595959', fontFamily: 'MercadoRalewayExtraBold', fontSize: 20 }, moreTitle: { left: 16, top: 35, width: 229, textAlign: 'center' },
  expandedCard: { width: '100%', height: 'auto', minHeight: 279, padding: 24, paddingTop: 48, gap: 16, alignItems: 'center' },
  expandedImage: { position: 'relative', left: 0, top: 0 },
  expandedTitle: { position: 'relative', left: 0, top: 0, width: '100%', textAlign: 'center' },
  pressed: { opacity: 0.8 }, disabled: { opacity: 0.45 },
  secondaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 24 }, secondarySlot: { flexBasis: 260, flexGrow: 1 },
  moreScreen: { gap: 16 }, moreHeading: { fontFamily: 'MercadoInter', fontSize: 28, color: '#000' },
});
const imageStyles = StyleSheet.create({ anote: { left: 34, top: 77 }, history: { left: 42, top: 71 }, cars: { left: 34, top: 77 }, placeholder: { left: 16, top: 16, width: 229, height: 247, opacity: 0.2 } });
const titleStyles = StyleSheet.create({ anote: { left: 93, top: 35, width: 85 }, history: { left: 59, top: 35, width: 150 }, cars: { left: 73, top: 42, width: 85 } });
