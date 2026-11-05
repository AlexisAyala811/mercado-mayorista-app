import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/ui/tokens';
import { reportVisual } from '@/ui/report-tokens';

type ScreenHeaderProps = {
  actions?: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
  appearance?: 'default' | 'report';
  reportFontsLoaded?: boolean;
};

export function ScreenHeader({ actions, description, eyebrow, title, appearance = 'default', reportFontsLoaded = false }: ScreenHeaderProps) {
  const styles = useVisualStyles(createStyles);
  return (
    <View style={styles.container}>
      <View style={[styles.copy, appearance === 'report' && reportStyles.copy]}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[styles.title, appearance === 'report' && reportStyles.title, appearance === 'report' && reportFontsLoaded && { fontFamily: 'ReportRalewayExtraBold' }]}>
          {title}
        </Text>
        {description ? <Text style={[styles.description, appearance === 'report' && reportStyles.description, appearance === 'report' && reportFontsLoaded && { fontFamily: 'ReportInterRegular' }]}>{description}</Text> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const reportStyles = StyleSheet.create({
  copy: { maxWidth: '100%', gap: 8 },
  title: { color: reportVisual.title, fontSize: 34, lineHeight: 42, fontWeight: '800' },
  description: { color: reportVisual.secondary, fontSize: 15, lineHeight: 22, fontWeight: '400' },
});

const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: { gap: spacing.lg },
  copy: { gap: spacing.sm, maxWidth: 720 },
  eyebrow: { color: color.brand, ...typography.eyebrow },
  title: { color: color.textPrimary, ...typography.title },
  description: { color: color.textSecondary, ...typography.body },
  actions: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
