import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import type { ModuleId } from '@/features/auth/authorization/permissions';

export type HomeModule = {
  description: string;
  id: ModuleId;
  shortLabel: string;
  title: string;
};

type ModuleCardProps = {
  disabled?: boolean;
  module: HomeModule;
  onPress?: (module: HomeModule) => void;
};

export function ModuleCard({ disabled = false, module, onPress }: ModuleCardProps) {
  const styles = useVisualStyles(createStyles);
  return (
    <Pressable
      accessibilityHint={module.description}
      accessibilityLabel={module.title}
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => onPress?.(module)}
      style={({ pressed }) => [styles.card, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
        <Text style={styles.iconText}>{module.shortLabel}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{module.title}</Text>
        <Text style={styles.description}>{module.description}</Text>
      </View>
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.arrow}>
        →
      </Text>
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
  icon: {
    alignItems: 'center',
    backgroundColor: color.brandMuted,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  iconText: { color: color.brand, fontSize: 14, fontWeight: '800', letterSpacing: 0.6 },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  description: { color: color.textSecondary, ...typography.bodySmall },
  arrow: { alignSelf: 'flex-end', color: color.brand, fontSize: 24, lineHeight: 24 },
});
