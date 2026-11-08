import type { AndroidSymbol } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import type { ModuleId } from '@/features/auth/authorization/permissions';

export type HomeModule = {
  description: string;
  icon: AndroidSymbol;
  id: ModuleId;
  shortLabel: string;
  title: string;
};

type ModuleCardProps = {
  disabled?: boolean;
  // Live line of the card (spec 011, RQ-ST01); absent when it could not be read.
  fact?: string;
  module: HomeModule;
  onPress?: (module: HomeModule) => void;
  // Position in its section, shown as 01, 02… as in Stitch.
  order: number;
};

export function ModuleCard({ disabled = false, fact, module, onPress, order }: ModuleCardProps) {
  const styles = useVisualStyles(createStyles);
  return (
    <Pressable
      accessibilityHint={fact ? `${module.description} ${fact}.` : module.description}
      accessibilityLabel={module.title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress?.(module)}
      style={({ pressed }) => [styles.card, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.top}>
        <Text style={styles.order}>{String(order).padStart(2, '0')}</Text>
        <View style={styles.icon}>
          <SymbolView
            fallback={<Text style={styles.iconText}>{module.shortLabel}</Text>}
            name={{ android: module.icon, ios: 'square.grid.2x2', web: module.icon }}
            size={30}
            tintColor={styles.iconText.color}
          />
        </View>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.description}>{module.description}</Text>
      </View>
      <View style={styles.footer}>
        {fact ? <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.fact} testID={`fact-${module.id}`}>{fact}</Text> : <View />}
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>
          →
        </Text>
      </View>
    </Pressable>
  );
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  card: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flex: 1,
    gap: spacing.md,
    minHeight: 190,
    minWidth: 240,
    padding: spacing.lg,
  },
  pressed: { borderColor: color.brand, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
  top: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  order: { color: color.textSecondary, fontSize: 14, fontWeight: '700', letterSpacing: 0.6 },
  icon: {
    alignItems: 'center',
    backgroundColor: color.brandMuted,
    borderRadius: radius.md,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  iconText: { color: color.brand, fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  description: { color: color.textSecondary, ...typography.bodySmall },
  footer: { alignItems: 'center', borderColor: color.border, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', paddingTop: spacing.sm },
  fact: { color: color.brand, ...typography.bodySmall, flexShrink: 1, fontWeight: '700' },
  arrow: { alignSelf: 'flex-end', color: color.brand, fontSize: 24, lineHeight: 24 },
});
