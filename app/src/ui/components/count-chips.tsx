import { Pressable, StyleSheet, Text, View } from 'react-native';

export type CountChip<T extends string> = { id: T; label: string; count: number | null; tone: 'neutral' | 'success' | 'danger' };

type Props<T extends string> = {
  chips: CountChip<T>[];
  selected: T;
  onSelect: (id: T) => void;
  disabled?: boolean;
};

// Status chips of the Stitch lists (spec 011, CL-ST21): neutral grey, green
// and red, each with its count in a darker bubble; the chosen one is dark green.
const look = {
  neutral: { bg: '#F1F5F9', ink: '#334155', bubble: '#E2E8F0', bubbleInk: '#334155', dot: null },
  success: { bg: '#ECFDF5', ink: '#065F46', bubble: '#047857', bubbleInk: '#FFFFFF', dot: '#10B981' },
  danger: { bg: '#FEF2F2', ink: '#991B1B', bubble: '#DC2626', bubbleInk: '#FFFFFF', dot: '#DC2626' },
} as const;

export function CountChips<T extends string>({ chips, disabled = false, onSelect, selected }: Props<T>) {
  return (
    <View accessibilityRole="radiogroup" style={styles.chips}>
      {chips.map((item) => {
        const checked = selected === item.id;
        const tone = look[item.tone];
        return (
          <Pressable
            key={item.id}
            accessibilityLabel={item.count === null ? item.label : `${item.label}: ${item.count}`}
            accessibilityRole="radio"
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [styles.chip, { backgroundColor: checked ? '#0F2A1F' : tone.bg }, pressed && styles.pressed]}>
            {tone.dot ? <View style={[styles.dot, { backgroundColor: tone.dot }]} /> : null}
            <Text numberOfLines={1} style={[styles.text, { color: checked ? '#FFFFFF' : tone.ink }]}>{item.label}</Text>
            {item.count === null ? null : (
              <View style={[styles.bubble, { backgroundColor: checked ? (item.tone === 'danger' ? '#DC2626' : 'rgba(255,255,255,0.22)') : tone.bubble }]}>
                <Text style={[styles.bubbleText, { color: checked ? '#FFFFFF' : tone.bubbleInk }]}>{item.count}</Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 4 },
  chip: { alignItems: 'center', borderRadius: 10, flexDirection: 'row', gap: 8, minHeight: 44, paddingHorizontal: 14 },
  pressed: { opacity: 0.85 },
  dot: { borderRadius: 4, height: 8, width: 8 },
  text: { fontSize: 14, fontWeight: '700' },
  bubble: { alignItems: 'center', borderRadius: 999, justifyContent: 'center', minWidth: 24, paddingHorizontal: 7, paddingVertical: 2 },
  bubbleText: { fontSize: 12, fontWeight: '800' },
});
