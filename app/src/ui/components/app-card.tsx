import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';

type AppCardProps = {
  children: ReactNode;
  description?: string;
  style?: StyleProp<ViewStyle>;
  title?: string;
};

export function AppCard({ children, description, style, title }: AppCardProps) {
  const styles = useVisualStyles(createStyles);
  return (
    <View style={[styles.container, style]}>
      {title || description ? (
        <View style={styles.header}>
          {title ? (
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
          ) : null}
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: color.cornerRadius ?? radius.lg,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  header: { gap: spacing.xs },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  description: { color: color.textSecondary, ...typography.bodySmall },
});
