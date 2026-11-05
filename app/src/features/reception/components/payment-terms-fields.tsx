import { StyleSheet, Text, View } from 'react-native';
import type { SettlementScreenProps } from '../screens/settlement-screen';
import { AppButton, AppCard, FormField } from '@/ui/components';
import { useVisualStyles, type VisualPalette } from '@/ui/visual-theme';
import { spacing, typography } from '@/ui/tokens';

export function PaymentTermsFields({ values, onChange, onAddInstallment, onChangeInstallment, onRemoveInstallment, isSubmitting }: Pick<SettlementScreenProps, 'values' | 'onChange' | 'onAddInstallment' | 'onChangeInstallment' | 'onRemoveInstallment' | 'isSubmitting'>) {
  const styles = useVisualStyles(createStyles);
  return <AppCard title="Forma de pago">
    <View style={styles.toggleRow}>
      {([['cash', 'Contado'], ['credit', 'Crédito']] as const).map(([value, label]) => <AppButton key={value} disabled={isSubmitting} label={label} onPress={() => onChange('paymentMode', value)} accessibilityRole="radio" accessibilityState={{ checked: values.paymentMode === value }} tone={values.paymentMode === value ? 'primary' : 'secondary'} />)}
    </View>
    {values.paymentMode === 'credit' ? <View style={styles.installments}>
      <Text style={styles.help}>Las cuotas deben sumar exactamente el monto líquido confirmado.</Text>
      {values.installments.map((installment, index) => <View key={installment.id} style={styles.installment}>
        <Text style={styles.installmentTitle}>Cuota {index + 1}</Text>
        <View style={styles.columns}>
          <View style={styles.column}><FormField editable={!isSubmitting} label="Vence el" onChangeText={(value) => onChangeInstallment(installment.id, 'dueOn', value)} placeholder="aaaa-mm-dd" value={installment.dueOn} /></View>
          <View style={styles.column}><FormField editable={!isSubmitting} keyboardType="decimal-pad" label="Importe (S/)" onChangeText={(value) => onChangeInstallment(installment.id, 'amount', value)} placeholder="0.00" value={installment.amount} /></View>
        </View>
        <AppButton disabled={isSubmitting} label="Quitar cuota" onPress={() => onRemoveInstallment(installment.id)} tone="secondary" />
      </View>)}
      <AppButton disabled={isSubmitting} label="Agregar cuota" onPress={onAddInstallment} tone="secondary" />
    </View> : null}
  </AppCard>;
}

const createStyles = (color: VisualPalette) => StyleSheet.create({
  toggleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, column: { flexBasis: 200, flexGrow: 1 },
  installments: { gap: spacing.md }, installment: { borderTopColor: color.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.md, paddingTop: spacing.md },
  installmentTitle: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' }, help: { color: color.textSecondary, ...typography.bodySmall },
});
