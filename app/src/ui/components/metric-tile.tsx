import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { reportVisual } from '@/ui/report-tokens';

type MetricTileProps = {
  label: string;
  value: string;
  description?: string;
  appearance?: 'default' | 'report';
  reportFontsLoaded?: boolean;
};

export function MetricTile({ label, value, description, appearance = 'default', reportFontsLoaded = false }: MetricTileProps) {
  const styles = useVisualStyles(createStyles);
  const report = appearance === 'report';
  return (
    <View style={[styles.container, report && reportStyles.container]}>
      <Text style={[styles.label, report && reportStyles.label, report && reportFontsLoaded && { fontFamily: 'ReportRalewayBold' }]}>{label}</Text>
      <Text accessibilityLabel={`${label}: ${value}`} style={[styles.value, report && reportStyles.value, report && reportFontsLoaded && { fontFamily: 'ReportInterSemiBold' }]}>
        {value}
      </Text>
      {description ? <Text style={[reportStyles.detail, report && reportFontsLoaded && { fontFamily: 'ReportInterRegular' }]}>{description}</Text> : null}
    </View>
  );
}

const reportStyles = StyleSheet.create({
  container: { backgroundColor: reportVisual.tile, borderRadius: reportVisual.radius,
    paddingHorizontal: reportVisual.horizontalPadding, paddingVertical: reportVisual.verticalPadding,
    gap: reportVisual.gap, flexBasis: 240, flexGrow: 1, flexShrink: 1, minWidth: 0 },
  label: { fontSize: reportVisual.labelSize, lineHeight: 20, fontWeight: '700', color: reportVisual.title },
  value: { fontSize: reportVisual.valueSize, lineHeight: 36, fontWeight: '600', color: reportVisual.value },
  detail: { fontSize: reportVisual.detailSize, lineHeight: 18, color: reportVisual.secondary },
});

const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: {
    backgroundColor: color.brandMuted,
    borderRadius: radius.md,
    flexGrow: 1,
    gap: spacing.xs,
    minWidth: 150,
    padding: spacing.md,
  },
  label: { color: color.textSecondary, ...typography.bodySmall },
  value: { color: color.textPrimary, fontSize: 24, fontWeight: '700', lineHeight: 30 },
});
