import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from './app-button';
import { color, radius, spacing, typography } from '@/ui/tokens';

type ConfirmationDialogProps = { busy?: boolean;
  confirmLabel: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  visible: boolean;
};

export function ConfirmationDialog({ busy = false, confirmLabel, message, onCancel, onConfirm, title, visible }: ConfirmationDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={() => { if (!busy) onCancel(); }} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.panel}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <AppButton expandLabel disabled={busy} label="Cancelar" onPress={onCancel} tone="secondary" />
            <AppButton expandLabel disabled={busy} label={busy ? 'Procesando…' : confirmLabel} onPress={onConfirm} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(17, 24, 20, 0.52)', flex: 1, justifyContent: 'center', padding: spacing.md },
  panel: { backgroundColor: color.surfaceRaised, borderRadius: radius.lg, gap: spacing.md, maxWidth: 520, padding: spacing.lg, width: '100%' },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  message: { color: color.textSecondary, ...typography.bodySmall },
  actions: { gap: spacing.sm },
});

