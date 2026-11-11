import type { AndroidSymbol } from 'expo-symbols';
import { SymbolView } from '@/ui/components/symbol';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ModuleId } from '@/features/auth/authorization/permissions';
import { accent, card, color, radius, spacing, type AccentName } from '@/ui/tokens';

export type HomeModule = {
  accent: AccentName;
  // Pill at the top right and line at the foot when there is no live data.
  badge: string;
  // Colour of the pill and of the foot when it is not the card's one, and the
  // mark drawn before the foot line ('dot' is a small green circle).
  badgeAccent?: AccentName;
  footAccent?: AccentName;
  footIcon?: AndroidSymbol | 'dot';
  description: string;
  foot: string;
  icon: AndroidSymbol;
  id: ModuleId;
  shortLabel: string;
  title: string;
};

type ModuleCardProps = {
  // Live pill (for example "12 hoy"); replaces the static one.
  badge?: string;
  compact?: boolean;
  // Short screens (tablet in landscape): tighter card so the six fit at once.
  dense?: boolean;
  disabled?: boolean;
  // Live line of the card (spec 011, RQ-ST01); absent when it could not be read.
  fact?: string;
  module: HomeModule;
  onPress?: (module: HomeModule) => void;
  // Position in its side, shown as 01, 02… as in Stitch.
  order: number;
};

// Card of the Stitch menu (spec 011, RQ-ST11): number, pill, coloured icon
// tile, title in capitals, description and a foot line.
export function ModuleCard({ badge, compact = false, dense = false, disabled = false, fact, module, onPress, order }: ModuleCardProps) {
  const tone = accent[module.accent];
  const pill = badge ?? module.badge;
  const foot = fact ?? module.foot;
  const pillTone = accent[module.badgeAccent ?? module.accent];
  const footTone = accent[module.footAccent ?? module.accent];
  return (
    <Pressable
      accessibilityHint={[module.description, badge, fact].filter(Boolean).join('. ')}
      accessibilityLabel={module.title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress?.(module)}
      style={({ pressed }) => [styles.card, dense && styles.cardDense, compact && styles.cardCompact, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.top}>
        <View style={[styles.order, { backgroundColor: tone.tint }]}>
          <Text style={[styles.orderText, { color: tone.ink }]}>{String(order).padStart(2, '0')}</Text>
        </View>
        {pill ? (
          <View style={[styles.pill, { backgroundColor: pillTone.pill, borderColor: pillTone.line }]}>
            <Text numberOfLines={1} style={[styles.pillText, { color: pillTone.pillInk }]} testID={`badge-${module.id}`}>{pill}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.middle}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.icon, (compact || dense) && styles.iconCompact, { backgroundColor: tone.tint, borderColor: tone.line }]}>
          <SymbolView
            fallback={<Text style={[styles.iconText, { color: tone.ink }]}>{module.shortLabel}</Text>}
            name={{ android: module.icon, ios: 'square.grid.2x2', web: module.icon }}
            size={compact || dense ? 36 : 46}
            tintColor={tone.ink}
          />
        </View>
        <Text style={styles.title}>{module.title.toUpperCase()}</Text>
        {compact ? null : <Text style={styles.description}>{module.description}</Text>}
      </View>
      {foot ? (
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.foot}>
          {module.footIcon === 'dot' ? <View style={styles.footDot} /> : module.footIcon ? <SymbolView fallback={null} name={{ android: module.footIcon, ios: 'circle', web: module.footIcon }} size={14} tintColor={footTone.ink} /> : null}
          <Text numberOfLines={1} style={[styles.footText, { color: footTone.ink }]} testID={`fact-${module.id}`}>{foot}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: card.borderColor,
    borderRadius: radius.lg,
    borderWidth: card.borderWidth,
    boxShadow: card.boxShadow,
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 175,
    padding: 20,
  },
  cardDense: { gap: 2, minHeight: 0, paddingHorizontal: spacing.md, paddingVertical: 12 },
  cardCompact: { minHeight: 168, padding: spacing.md },
  pressed: { borderColor: color.successAccent, transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.45 },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', width: '100%' },
  order: { alignItems: 'center', borderRadius: radius.sm, height: 28, justifyContent: 'center', width: 28 },
  orderText: { fontSize: 12, fontWeight: '700' },
  pill: { borderRadius: 999, borderWidth: 1, flexShrink: 1, paddingHorizontal: 10, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  middle: { alignItems: 'center', alignSelf: 'stretch', gap: 2 },
  icon: { alignItems: 'center', borderRadius: radius.lg, borderWidth: 2, height: 80, justifyContent: 'center', marginBottom: spacing.sm, width: 80 },
  iconCompact: { height: 60, marginBottom: 4, width: 60 },
  iconText: { fontSize: 16, fontWeight: '800', letterSpacing: 0.6 },
  title: { alignSelf: 'stretch', color: '#0F172A', fontSize: 16, fontWeight: '900', letterSpacing: 0.4, lineHeight: 22, marginTop: 2, textAlign: 'center' },
  description: { alignSelf: 'stretch', color: '#64748B', fontSize: 12, fontWeight: '500', lineHeight: 16, textAlign: 'center' },
  foot: { alignItems: 'center', borderColor: '#F1F5F9', borderTopWidth: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: 6, width: '100%' },
  footDot: { backgroundColor: '#10B981', borderRadius: 4, height: 8, width: 8 },
  footText: { fontSize: 11, fontWeight: '600', lineHeight: 16 },
});
