import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '@/ui/tokens';

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
    borderColor: '#E2E8F0',
    borderRadius: radius.lg,
    borderWidth: 1,
    boxShadow: '0px 1px 2px rgba(15,23,42,0.05)',
    gap: spacing.md,
    padding: 20,
  },
  header: { gap: 2 },
  title: { color: '#0F172A', fontSize: 17, fontWeight: '700', lineHeight: 24 },
  description: { color: '#64748B', fontSize: 13, lineHeight: 19 },
});
