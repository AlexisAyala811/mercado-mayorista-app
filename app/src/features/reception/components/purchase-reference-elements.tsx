import { StyleSheet, Text, View } from 'react-native';

import { useBottomNav } from '@/ui/navigation/app-chrome';
import { AppHeader } from '@/ui/navigation/app-header';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type PurchaseDisplayContext = { username: string; providerName: string; providerPhone: string; receivedOn: string };

// MAÑAY purchase header (spec 011, T1120): brand, stage and the reception data
// that stays visible while weighing and settling.
export function PurchaseReferenceHeader({ context, stage }: { context?: PurchaseDisplayContext; stage: string }) {
  return <View style={styles.header}>
    <AppHeader eyebrow={`COMPRA · ${stage.toUpperCase()}`} title="Compra" />
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

// Spec 011 (RQ-ST02, CL-ST07): the purchase steps use the bottom bar. «Atrás»
// returns to the previous step, «Menú principal» leaves through the flow's own
// exit and the step action takes the «Siguiente» place with its own name.
export function PurchaseReferenceNavigation({ onStepBack, stepBackLabel = 'Volver a datos', onHome, onContinue, busy, canContinue, continueLabel = 'Revisar y cerrar pesaje' }: {
  onStepBack?: () => void; stepBackLabel?: string; onHome?: () => void; onContinue?: () => void; busy?: boolean; canContinue: boolean; continueLabel?: string;
}) {
  useBottomNav({
    back: onStepBack ? { label: 'Atrás', accessibilityLabel: stepBackLabel, disabled: busy, onPress: onStepBack } : null,
    home: onHome ? { label: 'Menú principal', disabled: busy, onPress: onHome } : null,
    next: { label: continueLabel, disabled: Boolean(busy) || !canContinue || !onContinue, onPress: () => onContinue?.() },
  });
  return null;
}

const styles = StyleSheet.create({
  header: { gap: spacing.sm },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  field: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.sm, borderWidth: 1, flexBasis: 160, flexGrow: 1, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  fieldWide: { flexGrow: 3 },
  fieldLabel: { color: color.textSecondary, fontSize: 13, lineHeight: 18 },
  fieldValue: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
});
