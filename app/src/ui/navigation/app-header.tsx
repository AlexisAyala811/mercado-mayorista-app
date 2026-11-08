import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/ui/components/brand-mark';
import { radius, spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { useAppChrome } from './app-chrome';

type AppHeaderProps = {
  eyebrow?: string;
  title: string;
  // Replaces the user on the right, e.g. the menu's «Cerrar sesión».
  trailing?: ReactNode;
};

// Spec 011 (RQ-ST03): one header for every screen after sign-in: logo, eyebrow,
// title and the signed-in user. On a 360 dp phone the user wraps below.
export function AppHeader({ eyebrow, title, trailing }: AppHeaderProps) {
  const styles = useVisualStyles(createStyles);
  const username = useAppChrome()?.username ?? null;
  return (
    <View style={styles.header} testID="app-header">
      <BrandMark size={44} />
      <View style={styles.titles}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      </View>
      {trailing ?? (username ? (
        <Text accessibilityLabel={`Usuario: ${username}`} numberOfLines={1} style={styles.username}>{username}</Text>
      ) : null)}
    </View>
  );
}

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    header: {
      alignItems: 'center',
      backgroundColor: color.surfaceRaised,
      borderColor: color.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      padding: spacing.md,
    },
    titles: { flexBasis: 180, flexGrow: 1, flexShrink: 1 },
    eyebrow: { color: color.textSecondary, ...typography.eyebrow },
    title: { color: color.brand, fontSize: 28, fontWeight: '800', lineHeight: 34 },
    username: { color: color.textPrimary, ...typography.body, flexShrink: 1, fontWeight: '700' },
  });
