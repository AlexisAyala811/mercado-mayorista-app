import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { OriginalUserIcon } from '@/ui/components/original-user-icon';

export type PurchaseDisplayContext = { username: string; providerName: string; providerPhone: string; receivedOn: string };

export const purchaseFonts = {
  MercadoInter: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  MercadoBentham: require('@expo-google-fonts/bentham/400Regular/Bentham_400Regular.ttf'),
  MercadoBevan: require('@expo-google-fonts/bevan/400Regular/Bevan_400Regular.ttf'),
};

// COMPRA 1:346: metadata bands 17:27 / 20:577 / 17:29.
export function PurchaseReferenceHeader({ context, stage }: { context?: PurchaseDisplayContext; stage: string }) {
  const { width } = useWindowDimensions();
  return <View style={styles.header}>
    <View style={styles.heading}>
      <OriginalUserIcon variant="purchase" style={styles.userIcon}/>
      {context ? <Text numberOfLines={1} accessibilityLabel={`Usuario: ${context.username}`} style={[styles.username, { fontSize: width >= 1300 ? 40 : 28 }]}>{context.username}</Text> : null}
      <Text accessibilityRole="header" style={styles.title}>Compra</Text>
      <Text style={styles.stage}>{stage}</Text>
    </View>
    {context ? <View style={styles.metadata}>
      <View style={styles.provider}><Text style={styles.metadataText}>Nombre: {context.providerName}</Text></View>
      <View style={styles.contact}><Text style={styles.metadataText}>N° Celular: {context.providerPhone || '—'}</Text></View>
      <View style={styles.contact}><Text style={styles.metadataText}>Fecha: {context.receivedOn}</Text></View>
    </View> : null}
  </View>;
}

// Original local assets retain their root dimensions. The right arrow keeps
// the rotate-180 / negative-Y wrapper from node 12:160.
export function PurchaseReferenceNavigation({ onBack, onHome, onContinue, busy, canContinue, continueLabel = 'Revisar y cerrar pesaje' }: {
  onBack?: () => void; onHome?: () => void; onContinue?: () => void; busy?: boolean; canContinue: boolean; continueLabel?: string;
}) {
  return <View style={styles.navigation}>
    <View style={styles.navigationBackground} />
    <Pressable accessibilityRole="button" accessibilityLabel="Volver al historial de compras" disabled={busy || !onBack} onPress={onBack} style={({ pressed }) => [styles.navigationButton, styles.backSlot, (pressed || busy || !onBack) && styles.dimmed]}>
      <Image source={require('../../../../assets/figma/original/compra/imgMaterialSymbolsArrowBack3.svg')} style={styles.backImage} contentFit="contain" accessibilityElementsHidden />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel="Volver al menú principal" disabled={busy || !onHome} onPress={onHome} style={({ pressed }) => [styles.navigationButton, styles.homeSlot, (pressed || busy || !onHome) && styles.dimmed]}>
      <Image source={require('../../../../assets/figma/original/compra/imgGravityUiHouseFill.svg')} style={styles.homeImage} contentFit="contain" accessibilityElementsHidden />
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={continueLabel} disabled={busy || !canContinue || !onContinue} onPress={onContinue} style={({ pressed }) => [styles.navigationButton, styles.forwardSlot, (pressed || busy || !canContinue || !onContinue) && styles.dimmed]}>
      <View style={styles.forwardTransform}><Image source={require('../../../../assets/figma/original/compra/imgMaterialSymbolsArrowBack2.svg')} style={styles.forwardImage} contentFit="contain" accessibilityElementsHidden /></View>
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  heading: { backgroundColor: '#f6f6f6', height: 75, alignItems: 'center', justifyContent: 'center' },
  userIcon: { position: 'absolute', left: 16, top: 11 },
  username: { position: 'absolute', left: 88, maxWidth: '30%', color: '#000', fontFamily: 'MercadoInter' },
  title: { color: '#000', fontFamily: 'MercadoInter', fontSize: 64 },
  stage: { position: 'absolute', right: 20, color: '#454545', fontSize: 16 },
  metadata: { flexDirection: 'row', gap: 12, paddingLeft: 58 },
  provider: { flex: 3.65, backgroundColor: '#d9d9d9', borderRadius: 10, minHeight: 45, justifyContent: 'center', paddingHorizontal: 12 },
  contact: { flex: 1, backgroundColor: '#d9d9d9', borderRadius: 10, minHeight: 45, justifyContent: 'center', paddingHorizontal: 12 },
  metadataText: { color: '#000', fontFamily: 'MercadoBentham', fontSize: 16 },
  navigation: { minHeight: 103 },
  navigationBackground: { position: 'absolute', top: 14, left: -13, right: -12, height: 75, backgroundColor: '#f6f6f6', borderWidth: 1, borderColor: '#fff' },
  navigationButton: { position: 'absolute', top: 0, width: 103, height: 103, alignItems: 'flex-start' },
  // Fractions of the 1376-px content area reproduce the supplied 1440-px frame.
  backSlot: { left: '26.2355%' }, homeSlot: { left: '46.875%' }, forwardSlot: { left: '66.2791%' },
  backImage: { width: 93, height: 93, marginTop: 10 }, homeImage: { width: 72, height: 72, marginTop: 16 }, forwardImage: { width: 103, height: 103 },
  forwardTransform: { transform: [{ rotate: '180deg' }, { scaleY: -1 }] }, dimmed: { opacity: 0.46 },
});
