import {
  useVisualPalette,
  useVisualStyles,
  type VisualPalette,
} from "@/ui/visual-theme";
import { useContext, useRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { spacing, typography, color as tokenColor } from "@/ui/tokens";
import { KeyboardFocusContext } from "./keyboard-focus-context";
import { ReportAsset } from './report-asset';
import { reportVisual } from '@/ui/report-tokens';

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
  supportingText?: string;
  appearance?: "default" | "login" | "report" | "stitch";
  reportFontsLoaded?: boolean;
};

export function FormField({
  accessibilityLabel,
  error,
  label,
  supportingText,
  onFocus,
  onBlur,
  appearance = "default",
  reportFontsLoaded = false,
  ...props
}: FormFieldProps) {
  const styles = useVisualStyles(createStyles);
  const color = useVisualPalette();
  const message = error ?? supportingText;
  const inputRef = useRef<TextInput>(null);
  const keyboardFocus = useContext(KeyboardFocusContext);

  return (
    <View
      style={[
        styles.container,
        appearance === "login" && loginStyles.container,
      ]}
    >
      <Text style={[styles.label, appearance === "login" && loginStyles.label, appearance === 'report' && reportStyles.label, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterSemiBold'}, appearance === 'stitch' && stitchStyles.label]}>
        {label}
      </Text>
      <View>
      <TextInput
        ref={inputRef}
        onFocus={(event) => {
          keyboardFocus?.focus(inputRef.current);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          keyboardFocus?.blur(inputRef.current);
          onBlur?.(event);
        }}
        accessibilityHint={error ?? supportingText}
        accessibilityLabel={accessibilityLabel ?? label}
        placeholderTextColor={
          color.textSecondary
        }
        style={[
          styles.input,
          appearance === "login" && loginStyles.input,
          appearance === 'report' && reportStyles.input,
          appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterRegular'},
          appearance === 'stitch' && [stitchStyles.control, stitchStyles.value],
          appearance === 'stitch' && props.editable === false && { color: '#475569' },
          error && styles.inputError,
        ]}
        {...props}
      />
      {appearance === 'report' ? <View pointerEvents="none" style={reportStyles.icon}><ReportAsset kind="calendar" /></View> : null}
      </View>
      {message ? (
        <Text style={error ? styles.error : styles.supporting}>{message}</Text>
      ) : null}
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
  input: {minHeight:48,paddingHorizontal:14,paddingRight:42,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:reportVisual.border,backgroundColor:reportVisual.surface,color:reportVisual.value,fontSize:14,lineHeight:20},
  icon: {position:'absolute',right:14,top:0,bottom:0,justifyContent:'center'},
});
const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    label: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.8, lineHeight: 16, textTransform: 'uppercase' },
    input: {
      backgroundColor: '#EFF4FF',
      borderColor: 'transparent',
      borderRadius: 12,
      borderWidth: 1,
      color: color.textPrimary,
      fontSize: 15,
      fontWeight: '500',
      minHeight: 48,
      paddingHorizontal: 14,
    },
    inputError: { borderColor: color.danger, borderWidth: 2 },
    supporting: { color: color.textSecondary, ...typography.bodySmall },
    error: { color: color.danger, ...typography.bodySmall },
  });

const loginStyles = StyleSheet.create({
  container: { gap: 10 },
  label: {
    color: tokenColor.textPrimary,
    fontFamily: "LoginInterSemiBold",
    fontSize: 15,
    lineHeight: 18,
    fontWeight: "600",
  },
  input: {
    fontFamily: "LoginInterRegular",
    fontSize: 16,
    lineHeight: 20,
    minHeight: 56,
    borderRadius: 12,
  },
});
