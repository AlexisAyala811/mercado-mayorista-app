import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/ui/components/app-button';
import { color, radius, spacing, typography } from '@/ui/tokens';

type FeedbackTone = 'neutral' | 'error' | 'success' | 'warning';

type FeedbackStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
  title: string;
  tone?: FeedbackTone;
};

const toneStyles: Record<FeedbackTone, { backgroundColor: string; accentColor: string }> = {
  neutral: { backgroundColor: color.brandMuted, accentColor: color.brand },
  error: { backgroundColor: color.dangerMuted, accentColor: color.danger },
  success: { backgroundColor: color.successMuted, accentColor: color.success },
  warning: { backgroundColor: color.warningMuted, accentColor: color.warning },
};

export function FeedbackState({ actionLabel, message, onAction, title, tone = 'neutral' }: FeedbackStateProps) {
  const activeTone = toneStyles[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="summary"
      style={[styles.container, { backgroundColor: activeTone.backgroundColor }]}>
      <View style={[styles.marker, { backgroundColor: activeTone.accentColor }]} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: activeTone.accentColor }]}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        {actionLabel && onAction ? <AppButton label={actionLabel} onPress={onAction} tone="secondary" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: radius.lg, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  marker: { borderRadius: radius.sm, width: 6 },
  content: { flex: 1, gap: spacing.sm },
  title: { ...typography.body, fontWeight: '700' },
  message: { color: color.textSecondary, ...typography.bodySmall },
});
