import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/ui/tokens';

type StepProgressProps = {
  activeIndex: number;
  steps: readonly string[];
};

export function StepProgress({ activeIndex, steps }: StepProgressProps) {
  const styles = useVisualStyles(createStyles);
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), Math.max(steps.length - 1, 0));
  const activeLabel = steps[safeActiveIndex] ?? '';

  return (
    <View
      accessibilityLabel={`Paso ${safeActiveIndex + 1} de ${steps.length}: ${activeLabel}`}
      style={styles.container}>
      {steps.map((step, index) => {
        const isActive = index === safeActiveIndex;
        const isComplete = index < safeActiveIndex;

        return (
          <View key={`${index}-${step}`} style={styles.item}>
            <View style={[styles.number, (isActive || isComplete) && styles.numberHighlighted]}>
              <Text style={[styles.numberText, (isActive || isComplete) && styles.numberTextHighlighted]}>
                {isComplete ? '✓' : index + 1}
              </Text>
            </View>
            <Text style={[styles.label, isActive && styles.labelActive]}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  item: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  number: {
    alignItems: 'center',
    borderColor: color.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  numberHighlighted: { backgroundColor: color.brand, borderColor: color.brand },
  numberText: { color: color.textSecondary, fontSize: 14, fontWeight: '700' },
  numberTextHighlighted: { color: color.textOnBrand },
  label: { color: color.textSecondary, ...typography.bodySmall },
  labelActive: { color: color.textPrimary, fontWeight: '700' },
});
