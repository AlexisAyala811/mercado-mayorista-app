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

import { radius, spacing, typography } from "@/ui/tokens";
import { KeyboardFocusContext } from "./keyboard-focus-context";
import { ReportAsset } from './report-asset';
import { reportVisual } from '@/ui/report-tokens';

type FormFieldProps = TextInputProps & {
  error?: string;
  label: string;
  supportingText?: string;
  appearance?: "default" | "login" | "report";
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
      <Text style={[styles.label, appearance === "login" && loginStyles.label, appearance === 'report' && reportStyles.label, appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterSemiBold'}]}>
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
          appearance === "login" ? "#78847c" : color.textSecondary
        }
        style={[
          styles.input,
          appearance === "login" && loginStyles.input,
          appearance === 'report' && reportStyles.input,
          appearance === 'report' && reportFontsLoaded && {fontFamily:'ReportInterRegular'},
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

const reportStyles = StyleSheet.create({
  label: {color:reportVisual.secondary,fontSize:12,lineHeight:18,fontWeight:'600'},
  input: {minHeight:48,paddingHorizontal:14,paddingRight:42,paddingVertical:8,borderRadius:10,borderWidth:1,borderColor:reportVisual.border,backgroundColor:reportVisual.surface,color:reportVisual.value,fontSize:14,lineHeight:20},
  icon: {position:'absolute',right:14,top:0,bottom:0,justifyContent:'center'},
});
const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    container: { gap: spacing.sm },
    label: {
      color: color.textPrimary,
      ...typography.bodySmall,
      fontWeight: "700",
    },
    input: {
      backgroundColor: color.controlSurface ?? color.surfaceRaised,
      borderColor: color.border,
      borderRadius: color.cornerRadius ?? radius.md,
      borderWidth: color.fieldBorderWidth ?? 1,
      color: color.textPrimary,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      ...typography.bodySmall,
    },
    inputError: { borderColor: color.danger, borderWidth: 2 },
    supporting: { color: color.textSecondary, ...typography.bodySmall },
    error: { color: color.danger, ...typography.bodySmall },
  });

const loginStyles = StyleSheet.create({
  container: { gap: 10 },
  label: {
    color: "#324038",
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
