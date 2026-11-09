import { StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';

export type BarItem = { key: string; label: string; value: number; display: string };

type BarChartProps = {
  title: string;
  description?: string;
  items: readonly BarItem[];
  empty?: string;
};

// Spec 011 (RQ-ST07, RQ-ST08, CL-ST05): horizontal bars drawn with views, no
// chart library. Every bar carries its label and its value as text, so the
// chart reads the same on screen, at 200 % text and with a screen reader.
export function BarChart({ title, description, items, empty = 'Sin datos en el periodo.' }: BarChartProps) {
  const styles = useVisualStyles(createStyles);
  const max = Math.max(0, ...items.map((item) => item.value));
  return (
    <View style={styles.container} testID="bar-chart">
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {!items.length ? <Text style={styles.description}>{empty}</Text> : null}
      {items.map((item) => {
        const share = max > 0 ? Math.max(item.value / max, item.value > 0 ? 0.02 : 0) : 0;
        return (
          <View key={item.key} accessible accessibilityLabel={`${item.label}: ${item.display}`} style={styles.row}>
            <Text numberOfLines={2} style={styles.label}>{item.label}</Text>
            <View style={styles.track}>
              <View style={[styles.bar, { width: `${Math.round(share * 1000) / 10}%` }]} />
            </View>
            <Text style={styles.value}>{item.display}</Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    container: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
    title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
    description: { color: color.textSecondary, ...typography.bodySmall },
    row: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    label: { color: color.textPrimary, ...typography.bodySmall, flexBasis: 110, flexShrink: 1 },
    track: { backgroundColor: color.surface, borderRadius: radius.sm, flexBasis: 120, flexGrow: 1, height: 18, overflow: 'hidden' },
    bar: { backgroundColor: color.brand, borderRadius: radius.sm, height: '100%' },
    value: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700', minWidth: 96, textAlign: 'right' },
  });
