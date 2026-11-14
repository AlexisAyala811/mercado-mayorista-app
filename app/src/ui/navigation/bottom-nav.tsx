import { useRouter, type Href } from 'expo-router';
import { SymbolView } from '@/ui/components/symbol';
import type { AndroidSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { backOrHome } from '@/navigation/back-or-home';
import { color } from '@/ui/tokens';
import { useAppChrome } from './app-chrome';

// Spec 011 (RQ-ST02, CL-ST07, CL-ST18): the dock of the Stitch mockups fixed
// at the bottom of every screen after sign-in: «Atrás», «Menú principal» and
// «Siguiente», with their icons. «Siguiente» is the step action of a purchase
// or a sale; elsewhere it is shown disabled, as a place, like in Stitch.
export function BottomNav({ onMenu = false }: { onMenu?: boolean }) {
  const chrome = useAppChrome();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const slots = chrome?.slots ?? {};
  const back = () => {
    if (!chrome?.press('back')) backOrHome(router);
  };
  const home = () => {
    if (!chrome?.press('home')) router.replace('/home' as Href);
  };
  const next = slots.next;
  // On a phone the dock keeps its three places: arrows only for «Atrás» and an
  // undeclared «Siguiente», and «Menú» for the menu.
  const narrow = width < 600;
  const online = chrome?.connection?.tone === 'ok' || chrome?.connection?.title === 'En línea';
  return (
    <View accessibilityRole="toolbar" style={[styles.bar, narrow && styles.barNarrow, { paddingBottom: 12 + insets.bottom }]} testID="bottom-nav">
      {width >= 1000 ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.side}>
          <View style={[styles.dot, !online && styles.dotOff]} />
          <Text style={styles.sideText}>MAÑAY</Text>
        </View>
      ) : null}
      <View style={[styles.dock, narrow && styles.dockNarrow]}>
        <DockButton
          accessibilityLabel={slots.back?.accessibilityLabel ?? 'Atrás'}
          disabled={onMenu || slots.back?.disabled}
          icon="arrow_back"
          label={onMenu || narrow ? undefined : slots.back?.label ?? 'Atrás'}
          onPress={back}
        />
        <DockButton
          accessibilityLabel={slots.home?.accessibilityLabel ?? 'Menú principal'}
          disabled={slots.home?.disabled}
          icon={onMenu ? 'grid_view' : 'home'}
          label={onMenu ? 'MENÚ' : narrow ? 'Menú' : slots.home?.label ?? 'Menú principal'}
          onPress={home}
          primary
        />
        <DockButton
          accessibilityLabel={next ? next.accessibilityLabel ?? next.label : 'Siguiente'}
          disabled={!next || next.disabled}
          icon="arrow_forward"
          label={onMenu || (narrow && !next) ? undefined : next?.label ?? 'Siguiente'}
          onPress={() => chrome?.press('next')}
          trailingIcon
        />
      </View>
      {width >= 1000 ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.side, styles.sideEnd]}>
          <Text style={styles.sideText}>{online ? 'TABLET EN LÍNEA' : 'TABLET SIN CONEXIÓN'}</Text>
          <View style={[styles.dot, !online && styles.dotOff]} />
        </View>
      ) : null}
    </View>
  );
}

function DockButton({ accessibilityLabel, disabled, icon, label, onPress, primary = false, trailingIcon = false }: {
  accessibilityLabel: string; disabled?: boolean; icon: AndroidSymbol; label?: string; onPress: () => void; primary?: boolean; trailingIcon?: boolean;
}) {
  const symbol = <SymbolView fallback={null} name={{ android: icon, ios: 'chevron.left', web: icon }} size={primary ? 20 : 18} tintColor={primary ? '#34D399' : '#334155'} />;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary ? styles.primary : styles.secondary, !label && styles.iconOnly, pressed && styles.pressed, disabled && styles.disabled]}>
      {trailingIcon ? null : symbol}
      {label ? <Text numberOfLines={1} style={[styles.label, primary && styles.primaryLabel]}>{label}</Text> : null}
      {trailingIcon ? symbol : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: '#E2E8F0',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  side: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 8 },
  sideEnd: { justifyContent: 'flex-end' },
  sideText: { color: '#94A3B8', fontFamily: 'monospace', fontSize: 11, letterSpacing: 0.8 },
  dot: { backgroundColor: '#10B981', borderRadius: 999, height: 8, width: 8 },
  dotOff: { backgroundColor: '#F59E0B' },
  barNarrow: { paddingHorizontal: 12 },
  dockNarrow: { flexShrink: 1, gap: 8, maxWidth: '100%' },
  dock: { alignItems: 'center', backgroundColor: '#F1F5F9', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 16, padding: 6 },
  button: { flexShrink: 1, alignItems: 'center', borderRadius: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 },
  iconOnly: { minWidth: 60 },
  secondary: { backgroundColor: color.surfaceRaised, borderColor: '#E2E8F0', borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.06)' },
  primary: { backgroundColor: color.brand, boxShadow: '0px 4px 6px rgba(15,23,42,0.18)', paddingHorizontal: 20 },
  label: { color: '#334155', fontSize: 14, fontWeight: '500' },
  primaryLabel: { color: color.textOnBrand, fontWeight: '600' },
  pressed: { transform: [{ scale: 0.95 }] },
  disabled: { opacity: 0.45 },
});
