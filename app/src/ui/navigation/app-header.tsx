import { SymbolView } from '@/ui/components/symbol';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BrandMark } from '@/ui/components/brand-mark';
import { accent, color, layout, spacing } from '@/ui/tokens';
import { useAppChrome, type ChromeConnection } from './app-chrome';

type AppHeaderProps = {
  // Module of the screen, drawn as the pill next to the title («COMPRA · ANOTE»).
  eyebrow?: string;
  title: string;
  // Line under the title, as in the mockups.
  subtitle?: string;
  // 'brand' is the menu: the MAÑAY mark in the centre instead of a title.
  variant?: 'screen' | 'brand';
  // Extra controls on the right, e.g. the menu's «Cerrar sesión».
  trailing?: ReactNode;
};

// Spec 011 (RQ-ST03, CL-ST18): the header of the Stitch mockups: the user
// with their state on the left, the title (or the brand on the menu) in the
// centre and the synchronization state on the right.
export function AppHeader({ eyebrow, subtitle, title, trailing, variant = 'screen' }: AppHeaderProps) {
  const chrome = useAppChrome();
  const { width } = useWindowDimensions();
  const narrow = width < 760;
  // The menu bar runs from edge to edge as in Stitch: it cancels the screen's
  // side padding (the one AppScreen uses for this width).
  const edge = width >= layout.tabletMinWidth ? spacing.xl : spacing.lg;
  const username = chrome?.username ?? null;
  const connection = chrome?.connection ?? null;
  return (
    <View style={[styles.header, variant === 'brand' && [styles.bar, { marginHorizontal: -edge, paddingHorizontal: edge }], narrow && styles.narrow]} testID="app-header">
      <View style={[styles.side, narrow && styles.sideNarrow]}>
        {username ? (
          <>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.avatar}>
              <SymbolView fallback={null} name={{ android: 'account_circle', ios: 'person.crop.circle', web: 'account_circle' }} size={28} tintColor={color.brand} />
            </View>
            <View style={styles.user}>
              <View style={styles.userLine}>
                <Text accessibilityLabel={`Usuario: ${username}`} numberOfLines={1} style={styles.username}>{username}</Text>
                {connection ? <StatePill connection={connection} /> : null}
              </View>
              {chrome?.role ? <Text numberOfLines={1} style={styles.role}>{chrome.role}</Text> : null}
            </View>
          </>
        ) : null}
      </View>

      <View style={[styles.center, narrow && styles.centerNarrow]}>
        {variant === 'brand' ? (
          <View style={styles.brand}>
            <BrandMark size={40} />
            <View>
              <Text accessibilityRole="header" accessibilityLabel={title} style={styles.brandName}>MAÑAY</Text>
              <Text style={styles.brandTagline}>GESTIÓN COMERCIAL DE PAPA</Text>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.titleLine}>
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
              {eyebrow ? <View style={styles.module}><Text numberOfLines={1} style={styles.moduleText}>{eyebrow}</Text></View> : null}
            </View>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </>
        )}
      </View>

      <View style={[styles.side, styles.sideEnd, narrow && styles.sideNarrow]}>
        {connection ? <SyncChip connection={connection} /> : null}
        {trailing}
      </View>
    </View>
  );
}

function StatePill({ connection }: { connection: ChromeConnection }) {
  const tone = toneOf(connection);
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.pill, { backgroundColor: tone.pill, borderColor: tone.line }]}>
      <View style={[styles.dot, { backgroundColor: tone.dot }]} />
      <Text style={[styles.pillText, { color: tone.pillInk }]}>{connection.title === 'En línea' || connection.title === 'Sin conexión' ? connection.title : 'Revisar'}</Text>
    </View>
  );
}

function SyncChip({ connection }: { connection: ChromeConnection }) {
  const tone = toneOf(connection);
  return (
    <Pressable
      accessibilityHint="Abre los pendientes de envío"
      accessibilityLabel={connection.accessibilityLabel}
      accessibilityRole="button"
      disabled={!connection.onPress}
      onPress={connection.onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
      testID="sync-chip">
      <View style={[styles.chipDot, { backgroundColor: tone.dot }]} />
      <Text numberOfLines={1} style={styles.chipText}>{connection.title} · {connection.detail}</Text>
      <SymbolView fallback={null} name={{ android: 'sync', ios: 'arrow.triangle.2.circlepath', web: 'sync' }} size={18} tintColor={color.textSecondary} />
    </Pressable>
  );
}

function toneOf(connection: ChromeConnection) {
  if (connection.tone === 'warning') return { ...accent.rose, dot: '#E11D48' };
  if (connection.tone === 'pending') return { ...accent.amber, dot: '#F59E0B' };
  return { ...accent.emerald, dot: '#10B981' };
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingBottom: 8 },
  bar: { backgroundColor: color.surfaceRaised, borderBottomColor: '#E2E8F0', borderBottomWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', paddingVertical: 12 },
  narrow: { alignItems: 'flex-start', flexWrap: 'wrap' },
  side: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12, minWidth: 0 },
  sideEnd: { justifyContent: 'flex-end' },
  sideNarrow: { flexBasis: '100%' },
  avatar: { alignItems: 'center', backgroundColor: 'rgba(31,58,47,0.1)', borderColor: 'rgba(31,58,47,0.2)', borderRadius: 999, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  avatarText: { color: color.brand, fontSize: 18, fontWeight: '800' },
  user: { flexShrink: 1, gap: 2 },
  userLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  username: { color: '#0F172A', flexShrink: 1, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  role: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  pill: { alignItems: 'center', borderRadius: 999, borderWidth: 1, flexDirection: 'row', gap: 4, paddingHorizontal: 8, paddingVertical: 2 },
  dot: { borderRadius: 999, height: 6, width: 6 },
  pillText: { fontSize: 12, fontWeight: '600' },
  center: { alignItems: 'center', flexShrink: 0, gap: 2 },
  centerNarrow: { alignItems: 'flex-start', flexBasis: '100%' },
  titleLine: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  title: { color: color.brand, fontSize: 30, fontWeight: '700', letterSpacing: -0.4, lineHeight: 36 },
  module: { backgroundColor: accent.emerald.ink, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  moduleText: { color: color.textOnBrand, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  subtitle: { color: accent.emerald.ink, fontSize: 14, fontWeight: '500', textAlign: 'center' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandName: { color: color.brand, fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  brandTagline: { color: '#64748B', fontSize: 9, fontWeight: '600', letterSpacing: 0.8 },
  chip: { alignItems: 'center', backgroundColor: '#EFF4FF', borderRadius: 12, boxShadow: '0px 1px 2px rgba(15,23,42,0.06)', flexDirection: 'row', flexShrink: 1, gap: 8, minHeight: 44, paddingHorizontal: 14 },
  chipDot: { borderRadius: 999, height: 10, width: 10 },
  chipText: { color: '#43474E', flexShrink: 1, fontSize: 12, fontWeight: '500' },
  pressed: { opacity: 0.7 },
});
