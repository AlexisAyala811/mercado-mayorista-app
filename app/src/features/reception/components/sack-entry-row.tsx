import { Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';

export type SackEntryView = {
  id: string;
  sequence: number;
  varietyName: string;
  weightDisplay: string;
  detailDisplay?: string;
};

type SackEntryRowProps = {
  entry: SackEntryView;
  onEdit?: (entry: SackEntryView) => void;
};

export function SackEntryRow({ entry, onEdit }: SackEntryRowProps) {
  const styles = useVisualStyles(createStyles);
  return (
    <View style={styles.row}>
      <View style={styles.sequence}>
        <Text style={styles.sequenceText}>{entry.sequence}</Text>
      </View>
      <View style={styles.copy}>
        <Text style={styles.variety}>{entry.varietyName}</Text>
        <Text style={styles.weight}>{entry.weightDisplay}</Text>
        {entry.detailDisplay ? <Text style={styles.detail}>{entry.detailDisplay}</Text> : null}
      </View>
      <Pressable
        accessibilityLabel={`Corregir saco ${entry.sequence}`}
        accessibilityRole="button"
        disabled={!onEdit}
        onPress={() => onEdit?.(entry)}
        style={({ pressed }) => [styles.edit, pressed && styles.editPressed, !onEdit && styles.editDisabled]}>
        <Text style={styles.editText}>Corregir</Text>
      </Pressable>
    </View>
  );
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: color.cornerRadius ?? radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  sequence: {
    alignItems: 'center',
    backgroundColor: color.brandMuted,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  sequenceText: { color: color.brand, fontSize: 16, fontWeight: '800' },
  copy: { flex: 1, gap: spacing.xs },
  variety: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  weight: { color: color.textSecondary, ...typography.bodySmall },
  detail: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  edit: { borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  editPressed: { backgroundColor: color.brandMuted },
  editDisabled: { opacity: 0.45 },
  editText: { color: color.brand, ...typography.bodySmall, fontWeight: '700' },
});
