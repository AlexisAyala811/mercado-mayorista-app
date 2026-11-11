import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/ui/tokens';
import type { AndroidSymbol } from 'expo-symbols';
import { ReportAsset } from './report-asset';
import { SymbolView } from './symbol';
import { reportVisual } from '@/ui/report-tokens';

type SelectionFieldProps = {
  appearance?: 'default' | 'report' | 'stitch';
  reportFontsLoaded?: boolean;
  disabled?: boolean;
  error?: string;
  label: string;
  onPress?: () => void;
  placeholder: string;
  supportingText?: string;
  value?: string;
  // Material symbol drawn at the start of the control (Stitch fields).
  leadingIcon?: AndroidSymbol;
};

export function SelectionField({
  appearance = 'default', reportFontsLoaded = false,
  disabled = false,
  error,
  label,
  onPress,
  placeholder,
  supportingText,
  value,
  leadingIcon,
}: SelectionFieldProps) {
  const styles = useVisualStyles(createStyles);
  const message = error ?? supportingText;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, appearance === 'report' && reportStyles.label, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterSemiBold'}, appearance === 'stitch' && stitchStyles.label]}>{label}</Text>
      <Pressable
        accessibilityHint={message ?? `Seleccionar ${label.toLocaleLowerCase()}`}
        accessibilityLabel={value ? `${label}: ${value}` : label}
        accessibilityRole="button"
        disabled={disabled || !onPress}
        onPress={() => { Keyboard.dismiss(); onPress?.(); }}
        style={({ pressed }) => [
          styles.control,
          appearance === 'report' && reportStyles.control,
          appearance === 'stitch' && stitchStyles.control,
          error && styles.controlError,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}>
        {leadingIcon ? <SymbolView fallback={null} name={{ android: leadingIcon, ios: "circle", web: leadingIcon }} size={20} tintColor="#74777F" /> : null}
        <Text style={[styles.value, !value && styles.placeholder, appearance === 'report' && reportStyles.value, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterRegular'}, appearance === 'stitch' && stitchStyles.value, appearance === 'stitch' && !value && styles.placeholder]}>{value || placeholder}</Text>
        {appearance === 'report' ? <ReportAsset kind="chevron" /> : <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>
          ▾
        </Text>}
      </Pressable>
      {message ? <Text style={error ? styles.error : styles.supporting}>{message}</Text> : null}
    </View>
  );
}

const stitchStyles = StyleSheet.create({
  label: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16, textTransform: 'uppercase' },
  control: { backgroundColor: '#EFF4FF', borderRadius: 12, borderWidth: 0, minHeight: 44, paddingHorizontal: 14 },
  value: { color: '#0B1C30', fontSize: 14, fontWeight: '500', lineHeight: 20 },
});
const reportStyles = StyleSheet.create({
  label: {color:reportVisual.secondary,fontSize:12,lineHeight:18,fontWeight:'600'},
  value: {color:reportVisual.value,fontSize:14,lineHeight:20},
  control: {minHeight:48,paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:reportVisual.border,backgroundColor:reportVisual.surface},
});
const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16, textTransform: 'uppercase' },
  control: {
    alignItems: 'center',
    backgroundColor: '#EFF4FF',
    borderColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  controlError: { borderColor: color.danger, borderWidth: 2 },
  pressed: { borderColor: color.brand },
  disabled: { opacity: 0.56 },
  value: { color: color.textPrimary, flex: 1, fontSize: 15, fontWeight: '500', lineHeight: 21 },
  placeholder: { color: color.textSecondary },
  chevron: { color: color.brand, fontSize: 18 },
  supporting: { color: color.textSecondary, ...typography.bodySmall },
  error: { color: color.danger, ...typography.bodySmall },
});
