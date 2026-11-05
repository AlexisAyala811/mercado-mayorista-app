import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { color, radius, spacing, typography } from '@/ui/tokens';

type LoadingStateProps = {
  label?: string;
};

export function LoadingState({ label = 'Cargando información' }: LoadingStateProps) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      accessibilityRole="progressbar"
      style={styles.container}>
      <ActivityIndicator color={color.brand} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.md,
    justifyContent: 'center',
    minHeight: 180,
    padding: spacing.xl,
  },
  label: { color: color.textSecondary, textAlign: 'center', ...typography.bodySmall },
});
