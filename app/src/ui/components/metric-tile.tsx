import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { reportVisual } from '@/ui/report-tokens';

type MetricTileProps = {
  label: string;
  value: string;
  description?: string;
  appearance?: 'default' | 'report' | 'stitch';
  reportFontsLoaded?: boolean;
  // Stitch tiles (spec 011, CL-ST18): neutral, paid (green) or owed (red).
  tone?: 'neutral' | 'success' | 'danger';
};

export function MetricTile({ label, value, description, appearance = 'default', reportFontsLoaded = false, tone = 'neutral' }: MetricTileProps) {
  const styles = useVisualStyles(createStyles);
  const report = appearance === 'report';
  if (appearance === 'stitch') {
    const palette = stitchTones[tone];
    return (
      <View style={[stitchStyles.container, { backgroundColor: palette.background, borderColor: palette.border }]}>
        <View style={stitchStyles.copy}>
          <Text style={[stitchStyles.label, { color: palette.label }]}>{label}</Text>
          <Text accessibilityLabel={`${label}: ${value}`} style={[stitchStyles.value, { color: palette.value }]}>{value}</Text>
          {description ? <Text style={stitchStyles.detail}>{description}</Text> : null}
        </View>
        <View style={[stitchStyles.icon, { backgroundColor: palette.icon }]}>
          {tone === 'success' ? <Text style={[stitchStyles.iconText, { color: palette.label }]}>✓</Text> : tone === 'danger' ? <Text style={[stitchStyles.iconText, { color: palette.label }]}>!</Text> : null}
        </View>
      </View>
    );
  }
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

const stitchTones = {
  neutral: { background: '#FFFFFF', border: '#E2E8F0', label: '#475569', value: '#1E293B', icon: '#F1F5F9' },
  success: { background: '#ECFDF5', border: '#A7F3D0', label: '#047857', value: '#065F46', icon: '#A7F3D0' },
  danger: { background: '#FEF2F2', border: '#FECACA', label: '#B91C1C', value: '#B91C1C', icon: '#FECACA' },
} as const;

const stitchStyles = StyleSheet.create({
  container: { alignItems: 'center', borderRadius: 16, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexBasis: 220, flexDirection: 'row', flexGrow: 1, gap: 12, justifyContent: 'space-between', minWidth: 0, paddingHorizontal: 16, paddingVertical: 12 },
  copy: { flexShrink: 1, gap: 2 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  detail: { color: '#64748B', fontSize: 12 },
  icon: { alignItems: 'center', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  iconText: { fontSize: 18, fontWeight: '900' },
});

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
