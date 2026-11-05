import { useVisualStyles, type VisualPalette } from "@/ui/visual-theme";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { radius, spacing, typography } from "@/ui/tokens";
import type { ReactNode } from 'react';
import { reportVisual } from '@/ui/report-tokens';

type AppButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  tone?: "primary" | "secondary";
  appearance?: "default" | "login" | "report" | "report-operation" | "report-query" | "report-link";
  expandLabel?: boolean;
  displayLabel?: string;
  leadingVisual?: ReactNode;
  reportFontsLoaded?: boolean;
};

export function AppButton({
  accessibilityLabel,
  accessibilityState,
  disabled,
  label,
  tone = "primary",
  appearance = "default",
  expandLabel = false,
  displayLabel,
  leadingVisual,
  reportFontsLoaded = false,
  ...props
}: AppButtonProps) {
  const styles = useVisualStyles(createStyles);
  const isPrimary = tone === "primary";

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      aria-checked={accessibilityState?.checked}
      aria-expanded={accessibilityState?.expanded}
      aria-selected={accessibilityState?.selected}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        appearance === "login" && loginStyles.base,
        isPrimary ? styles.primary : styles.secondary,
        appearance === "report" && reportStyles.base,
        appearance === 'report-query' && [reportStyles.base, {backgroundColor:reportVisual.title,borderColor:reportVisual.title,paddingHorizontal:18}],
        appearance === 'report-link' && [reportStyles.base, {backgroundColor:'transparent',borderWidth:0,paddingHorizontal:0}],
        appearance === "report-operation" && reportOperationStyles.base,
        appearance === "report-operation" && accessibilityState?.selected && reportOperationStyles.selected,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}
    >
      {leadingVisual}
      <Text
        style={[
          styles.label,
          expandLabel && styles.expandedLabel,
          appearance === "login" && loginStyles.label,
          isPrimary ? styles.primaryLabel : styles.secondaryLabel,
          appearance === "report" && reportStyles.label,
          appearance === "report" && reportFontsLoaded && { fontFamily: 'ReportInterSemiBold' },
          appearance === 'report-query' && [reportStyles.label,{fontSize:14,color:reportVisual.surface}, reportFontsLoaded && {fontFamily:'ReportInterSemiBold'}],
          appearance === 'report-link' && [reportStyles.label,{fontSize:leadingVisual ? 15 : 13,fontWeight:'500'}, reportFontsLoaded && {fontFamily:'ReportInterMedium'}],
          appearance === "report-operation" && reportOperationStyles.label,
          appearance === "report-operation" && reportFontsLoaded && { fontFamily: 'ReportInterRegular' },
        ]}
      >
        {displayLabel ?? label}
      </Text>
    </Pressable>
  );
}

const reportOperationStyles = StyleSheet.create({
  base: { width: 313, maxWidth: '100%', minHeight: 67, borderRadius: 10, borderWidth: 0, backgroundColor: reportVisual.control, paddingVertical: 12 },
  selected: { backgroundColor: reportVisual.selected },
  label: { fontSize: 28, lineHeight: 36, fontWeight: '400', color: reportVisual.value, textAlign: 'center' },
});

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      borderRadius: radius.lg,
      justifyContent: "center",
      minHeight: 52,
      paddingHorizontal: spacing.lg,
    },
    primary: { backgroundColor: color.brand },
    secondary: {
      backgroundColor: color.surfaceRaised,
      borderColor: color.brand,
      borderWidth: 1,
    },
    pressed: { opacity: 0.84 },
    disabled: { opacity: 0.46 },
    label: { ...typography.bodySmall, fontWeight: "700" },
    expandedLabel: { width: "100%", textAlign: "center" },
    primaryLabel: { color: color.textOnBrand },
    secondaryLabel: { color: color.brand },
  });

const loginStyles = StyleSheet.create({
  base: { minHeight: 56 },
  label: {
    fontFamily: "LoginInterSemiBold",
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
  },
});

const reportStyles = StyleSheet.create({
  base: { flexDirection: 'row', gap: 8, minHeight: 48, minWidth: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: reportVisual.border, backgroundColor: reportVisual.surface },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '600', color: reportVisual.title },
});
