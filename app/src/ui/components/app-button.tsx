import { useVisualStyles, type VisualPalette } from "@/ui/visual-theme";
import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";

import { color as brandColor } from "@/ui/tokens";
import type { ReactNode } from 'react';
import { reportVisual } from '@/ui/report-tokens';

type AppButtonProps = Omit<PressableProps, "children" | "style"> & {
  label: string;
  tone?: "primary" | "secondary";
  appearance?: "default" | "login" | "report" | "report-operation" | "report-query" | "report-link" | "stitch-chip" | "stitch-action";
  // Spec 011 (CL-ST18): colour of a Stitch chip or action.
  stitchTone?: "neutral" | "success" | "danger" | "brand";
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
  stitchTone = "neutral",
  ...props
}: AppButtonProps) {
  const checked = Boolean(accessibilityState?.checked || accessibilityState?.selected);
  const stitch = appearance === "stitch-chip" || appearance === "stitch-action";
  const palette = stitchPalette[stitchTone];
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
        appearance === 'report-query' && [reportStyles.base, {backgroundColor:brandColor.brand,borderColor:brandColor.brand,paddingHorizontal:18}],
        appearance === 'report-link' && [reportStyles.base, {backgroundColor:'transparent',borderWidth:0,paddingHorizontal:0}],
        appearance === "report-operation" && reportOperationStyles.base,
        appearance === "report-operation" && accessibilityState?.selected && reportOperationStyles.selected,
        appearance === "stitch-chip" && [stitchStyles.chip, { backgroundColor: checked ? palette.solid : palette.soft, borderColor: checked ? palette.solid : palette.border }],
        appearance === "stitch-action" && [stitchStyles.action, { backgroundColor: isPrimary ? palette.solid : "#FFFFFF", borderColor: isPrimary ? palette.solid : palette.border }],
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
      {...props}
    >
      {leadingVisual}
      {/* Stitch chips and actions: one line with a minimum width estimated from
          the text. Android measured some bold labels short (a count arriving
          later or an uppercase label) and wrapped the last word out of sight. */}
      <Text
        numberOfLines={stitch ? 1 : undefined}
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
          stitch && stitchStyles.label,
          stitch && { minWidth: labelWidth(displayLabel ?? label) },
          appearance === "stitch-chip" && { color: checked ? "#FFFFFF" : palette.ink },
          appearance === "stitch-action" && { color: isPrimary ? "#FFFFFF" : palette.ink },
        ]}
      >
        {displayLabel ?? label}
      </Text>
    </Pressable>
  );
}

// Width of a 13 px bold label, a little generous: upper case and digits are
// wider than lower case.
function labelWidth(text: string) {
  let width = 0;
  for (const char of text) width += char === " " ? 3.8 : /[A-ZÁÉÍÓÚÑ0-9+]/.test(char) ? 9.2 : /[il.,:;|!]/.test(char) ? 4 : 7.6;
  return Math.ceil(width);
}

const stitchPalette = {
  neutral: { solid: brandColor.brand, soft: '#FFFFFF', border: '#E2E8F0', ink: '#334155' },
  brand: { solid: brandColor.brand, soft: '#FFFFFF', border: '#E2E8F0', ink: brandColor.brand },
  success: { solid: '#047857', soft: '#ECFDF5', border: '#A7F3D0', ink: '#065F46' },
  danger: { solid: '#DC2626', soft: '#FEF2F2', border: '#FECACA', ink: '#B91C1C' },
} as const;

const stitchStyles = StyleSheet.create({
  chip: { borderRadius: 10, borderWidth: 1, minHeight: 44, paddingHorizontal: 14 },
  action: { borderRadius: 12, borderWidth: 1, minHeight: 44, paddingHorizontal: 16 },
  label: { flexShrink: 0, fontSize: 13, fontWeight: '700', lineHeight: 18 },
});

const reportOperationStyles = StyleSheet.create({
  base: { width: 313, maxWidth: '100%', minHeight: 67, borderRadius: 10, borderWidth: 0, backgroundColor: reportVisual.control, paddingVertical: 12 },
  selected: { backgroundColor: reportVisual.selected },
  label: { fontSize: 28, lineHeight: 36, fontWeight: '400', color: reportVisual.value, textAlign: 'center' },
});

const createStyles = (color: VisualPalette) =>
  StyleSheet.create({
    base: {
      alignItems: "center",
      borderRadius: 12,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 20,
    },
    primary: { backgroundColor: color.brand, boxShadow: '0px 2px 4px rgba(15,23,42,0.15)' },
    secondary: {
      backgroundColor: color.surfaceRaised,
      borderColor: '#CBD5E1',
      borderWidth: 1,
    },
    pressed: { opacity: 0.84 },
    disabled: { opacity: 0.46 },
    label: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
    expandedLabel: { width: "100%", textAlign: "center" },
    primaryLabel: { color: color.textOnBrand },
    secondaryLabel: { color: '#1E293B' },
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
