import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';

import { radius, spacing, typography } from '@/ui/tokens';
import { ReportAsset } from './report-asset';
import { reportVisual } from '@/ui/report-tokens';

type SelectionFieldProps = {
  appearance?: 'default' | 'report';
  reportFontsLoaded?: boolean;
  disabled?: boolean;
  error?: string;
  label: string;
  onPress?: () => void;
  placeholder: string;
  supportingText?: string;
  value?: string;
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
}: SelectionFieldProps) {
  const styles = useVisualStyles(createStyles);
  const message = error ?? supportingText;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, appearance === 'report' && reportStyles.label, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterSemiBold'}]}>{label}</Text>
      <Pressable
        accessibilityHint={message ?? `Seleccionar ${label.toLocaleLowerCase()}`}
        accessibilityLabel={value ? `${label}: ${value}` : label}
        accessibilityRole="button"
        disabled={disabled || !onPress}
        onPress={() => { Keyboard.dismiss(); onPress?.(); }}
        style={({ pressed }) => [
          styles.control,
          appearance === 'report' && reportStyles.control,
          error && styles.controlError,
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}>
        <Text style={[styles.value, !value && styles.placeholder, appearance === 'report' && reportStyles.value, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterRegular'}]}>{value || placeholder}</Text>
        {appearance === 'report' ? <ReportAsset kind="chevron" /> : <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.chevron}>
          ▾
        </Text>}
      </Pressable>
      {message ? <Text style={error ? styles.error : styles.supporting}>{message}</Text> : null}
    </View>
  );
}

const reportStyles = StyleSheet.create({
  label: {color:reportVisual.secondary,fontSize:12,lineHeight:18,fontWeight:'600'},
  value: {color:reportVisual.value,fontSize:14,lineHeight:20},
  control: {minHeight:44,paddingHorizontal:14,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:reportVisual.border,backgroundColor:reportVisual.surface},
});
const createStyles = (color: VisualPalette) => StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' },
  control: {
    alignItems: 'center',
    backgroundColor: color.controlSurface ?? color.surfaceRaised,
    borderColor: color.border,
    borderRadius: color.cornerRadius ?? radius.md,
    borderWidth: color.fieldBorderWidth ?? 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  controlError: { borderColor: color.danger, borderWidth: 2 },
  pressed: { borderColor: color.brand },
  disabled: { opacity: 0.56 },
  value: { color: color.textPrimary, flex: 1, ...typography.bodySmall },
  placeholder: { color: color.textSecondary },
  chevron: { color: color.brand, fontSize: 18 },
  supporting: { color: color.textSecondary, ...typography.bodySmall },
  error: { color: color.danger, ...typography.bodySmall },
});
