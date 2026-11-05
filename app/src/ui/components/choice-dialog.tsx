import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from './app-button';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type Choice = { id: string; label: string; supportingText?: string };

type ChoiceDialogProps = {
  choices: Choice[];
  multiple?: boolean;
  onClose: () => void;
  onSelect: (choice: Choice) => void;
  selectedIds?: string[];
  title: string;
  visible: boolean;
};

export function ChoiceDialog({ choices, multiple, onClose, onSelect, selectedIds = [], title, visible }: ChoiceDialogProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.panel}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <FlatList
            data={choices}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No hay opciones activas disponibles.</Text>}
            renderItem={({ item }) => {
              const selected = selectedIds.includes(item.id);
              return (
                <Pressable
                  accessibilityRole={multiple ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [styles.choice, selected && styles.selected, pressed && styles.pressed]}>
                  <Text style={styles.choiceTitle}>{selected ? '✓ ' : ''}{item.label}</Text>
                  {item.supportingText ? <Text style={styles.supporting}>{item.supportingText}</Text> : null}
                </Pressable>
              );
            }}
          />
          <AppButton label={multiple ? 'Listo' : 'Cancelar'} onPress={onClose} tone="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(17, 24, 20, 0.52)', flex: 1, justifyContent: 'center', padding: spacing.md },
  panel: { backgroundColor: color.surfaceRaised, borderRadius: radius.lg, gap: spacing.md, maxHeight: '82%', maxWidth: 620, padding: spacing.lg, width: '100%' },
  title: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  choice: { borderBottomColor: color.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, minHeight: 58, padding: spacing.md },
  selected: { backgroundColor: color.brandMuted },
  pressed: { opacity: 0.75 },
  choiceTitle: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  supporting: { color: color.textSecondary, ...typography.bodySmall },
  empty: { color: color.textSecondary, padding: spacing.lg, ...typography.bodySmall },
});
