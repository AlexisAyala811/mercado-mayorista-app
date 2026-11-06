import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandMark } from '@/ui/components/brand-mark';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type PurchaseDisplayContext = { username: string; providerName: string; providerPhone: string; receivedOn: string };

// MAÑAY purchase header (spec 011, T1120): brand, stage and the reception data
// that stays visible while weighing and settling.
export function PurchaseReferenceHeader({ context, stage }: { context?: PurchaseDisplayContext; stage: string }) {
  return <View style={styles.header}>
    <View style={styles.heading}>
      <BrandMark size={44} />
      <View style={styles.titles}>
        <Text accessibilityRole="header" style={styles.title}>Compra</Text>
        <Text style={styles.stage}>{stage}</Text>
      </View>
      {context ? <Text numberOfLines={1} accessibilityLabel={`Usuario: ${context.username}`} style={styles.username}>{context.username}</Text> : null}
    </View>
    {context ? <View style={styles.metadata}>
      <Field label="Proveedor" value={context.providerName} wide />
      <Field label="Celular" value={context.providerPhone || '—'} />
      <Field label="Fecha" value={context.receivedOn} />
    </View> : null}
  </View>;
}

function Field({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return <View style={[styles.field, wide && styles.fieldWide]}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.fieldValue}>{value}</Text>
  </View>;
}

export function PurchaseReferenceNavigation({ onBack, onHome, onContinue, busy, canContinue, continueLabel = 'Revisar y cerrar pesaje' }: {
  onBack?: () => void; onHome?: () => void; onContinue?: () => void; busy?: boolean; canContinue: boolean; continueLabel?: string;
}) {
  return <View style={styles.navigation}>
    <NavigationButton label="Historial" accessibilityLabel="Volver al historial de compras" disabled={busy || !onBack} onPress={onBack} />
    <NavigationButton label="Menú" accessibilityLabel="Volver al menú principal" disabled={busy || !onHome} onPress={onHome} />
    <NavigationButton label={continueLabel} accessibilityLabel={continueLabel} disabled={busy || !canContinue || !onContinue} onPress={onContinue} primary />
  </View>;
}

function NavigationButton({ label, accessibilityLabel, disabled, onPress, primary }: { label: string; accessibilityLabel: string; disabled: boolean; onPress?: () => void; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.navigationButton, primary && styles.navigationPrimary, (pressed || disabled) && styles.dimmed]}>
    <Text style={[styles.navigationText, primary && styles.navigationPrimaryText]}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  heading: { alignItems: 'center', backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  titles: { flex: 1 },
  title: { color: color.brand, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  stage: { color: color.textSecondary, ...typography.bodySmall },
  username: { color: color.textPrimary, ...typography.body, fontWeight: '700', maxWidth: '30%' },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.sm, borderWidth: 1, flexBasis: 160, flexGrow: 1, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  fieldWide: { flexGrow: 3 },
  fieldLabel: { color: color.textSecondary, fontSize: 13, lineHeight: 18 },
  fieldValue: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  navigation: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center', paddingVertical: spacing.sm },
  navigationButton: { alignItems: 'center', borderColor: color.brand, borderRadius: radius.sm, borderWidth: 1, justifyContent: 'center', minHeight: 48, minWidth: 140, paddingHorizontal: spacing.lg, backgroundColor: color.surfaceRaised },
  navigationPrimary: { backgroundColor: color.brand },
  navigationText: { color: color.brand, ...typography.body, fontWeight: '700' },
  navigationPrimaryText: { color: color.textOnBrand },
  dimmed: { opacity: 0.5 },
});
