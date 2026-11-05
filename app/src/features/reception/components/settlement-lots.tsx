import { StyleSheet, Text, View } from 'react-native';

import { emptyLotDraft, formatPreviewMoney, lotTitle, type LotDraft, type PurchaseLot, type PurchasePreview } from '@/domain/reception/purchase-preview';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import type { SettlementDraft } from '../screens/settlement-screen';
import { AppButton, FormField } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

export type LotField = keyof LotDraft;

// One editor per lot A, B…: basis, price and optional name (CL-FM08–CL-FM10).
export function SettlementLots({ lots, drafts, preview, disabled, onChangeLot }: {
  lots: readonly PurchaseLot[]; drafts: SettlementDraft['lots']; preview: PurchasePreview; disabled?: boolean;
  onChangeLot: (key: string, field: LotField, value: string) => void;
}) {
  return <View style={styles.lots}>
    {lots.map((lot) => {
      const draft = drafts[lot.key] ?? emptyLotDraft;
      const lotAmount = preview.kind === 'ready' ? preview.lots.find((item) => item.key === lot.key)?.amountCents : undefined;
      const quantity = draft.priceBasis === 'kilogram' ? formatKilograms(lot.netWeightKg) : `${lot.sacks} ${lot.sacks === 1 ? 'saco' : 'sacos'}`;
      return <View key={lot.key} style={styles.lot} testID={`lot-${lot.letter}`}>
        <Text accessibilityRole="header" style={styles.lotTitle}>{lotTitle(lot)}</Text>
        <Text style={styles.help}>{lot.sacks} {lot.sacks === 1 ? 'saco' : 'sacos'} · {formatKilograms(lot.netWeightKg)} netos</Text>
        <View style={styles.options}>{([['kilogram', 'Por kilogramo'], ['sack', 'Por saco']] as const).map(([value, label]) => <AppButton key={value} disabled={disabled} label={label} accessibilityLabel={`Lote ${lot.letter}: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: draft.priceBasis === value }} tone={draft.priceBasis === value ? 'primary' : 'secondary'} onPress={() => onChangeLot(lot.key, 'priceBasis', value)} />)}</View>
        <View style={styles.equation}>
          <View style={styles.quantity}><Text style={styles.quantityText}>{quantity}</Text></View>
          <Text style={styles.multiply}>×</Text>
          <View style={styles.rate}><FormField editable={!disabled} label={draft.priceBasis === 'kilogram' ? `Precio por kilogramo, lote ${lot.letter} (S/)` : `Precio por saco, lote ${lot.letter} (S/)`} keyboardType="decimal-pad" value={draft.unitPrice} onChangeText={(value) => onChangeLot(lot.key, 'unitPrice', value)} placeholder="0.00" /></View>
        </View>
        <FormField editable={!disabled} label={`Nombre del lote ${lot.letter} (opcional)`} value={draft.name} onChangeText={(value) => onChangeLot(lot.key, 'name', value)} maxLength={60} placeholder={`Lote ${lot.letter}`} />
        <AmountLine label={`Importe del lote ${lot.letter}`} value={lotAmount ? formatPreviewMoney(lotAmount) : 'Pendiente'} />
      </View>;
    })}
  </View>;
}

// Freight is optional; when the wholesaler pays it, it is shown but not
// deducted from the provider (CL-PL03).
export function SettlementFreight({ values, preview, disabled, onChange }: {
  values: SettlementDraft; preview: PurchasePreview; disabled?: boolean;
  onChange: (field: 'freightBasis' | 'freightRate' | 'freightChargedTo', value: string) => void;
}) {
  const freight = preview.kind === 'ready' ? formatPreviewMoney(preview.freightCents) : 'Pendiente';
  return <View style={styles.freight}>
    <View style={styles.options}>{([['none', 'Sin flete'], ['kilogram', 'Por kilogramo'], ['sack', 'Por saco']] as const).map(([value, label]) => <AppButton key={value} disabled={disabled} label={label} accessibilityLabel={`Flete: ${label.toLowerCase()}`} accessibilityRole="radio" accessibilityState={{ checked: values.freightBasis === value }} tone={values.freightBasis === value ? 'primary' : 'secondary'} onPress={() => onChange('freightBasis', value)} />)}</View>
    {values.freightBasis !== 'none' ? <>
      <FormField editable={!disabled} label="Tarifa de flete (S/)" keyboardType="decimal-pad" value={values.freightRate} onChangeText={(value) => onChange('freightRate', value)} placeholder="0.00" />
      <Text style={styles.label}>¿Quién asume el flete?</Text>
      <View style={styles.options}>{([['provider', 'Se descuenta al proveedor'], ['wholesaler', 'Lo paga el Mayorista']] as const).map(([value, label]) => <AppButton key={value} disabled={disabled} label={label} accessibilityRole="radio" accessibilityState={{ checked: values.freightChargedTo === value }} tone={values.freightChargedTo === value ? 'primary' : 'secondary'} onPress={() => onChange('freightChargedTo', value)} />)}</View>
      <AmountLine label={values.freightChargedTo === 'provider' ? 'Flete descontado' : 'Flete a cargo del Mayorista (informativo)'} value={freight} />
      {values.freightChargedTo === 'wholesaler' ? <Text style={styles.help}>No se descuenta del proveedor; queda como flete pendiente con el transportista.</Text> : null}
    </> : null}
  </View>;
}

export function AmountLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <View style={styles.amountRow}>
    <Text style={[styles.label, strong && styles.strong]}>{label}</Text>
    <Text accessibilityLabel={`${label}: ${value}`} style={[styles.amount, strong && styles.amountStrong]}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  lots: { gap: spacing.md },
  lot: { backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
  lotTitle: { color: color.brand, fontSize: 18, fontWeight: '800', lineHeight: 24 },
  freight: { gap: spacing.sm },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  equation: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.sm },
  quantity: { backgroundColor: color.brandMuted, borderRadius: radius.sm, justifyContent: 'center', minHeight: 48, minWidth: 110, paddingHorizontal: spacing.md },
  quantityText: { color: color.brand, ...typography.body, fontWeight: '700' },
  multiply: { color: color.textPrimary, fontSize: 22, fontWeight: '700', paddingBottom: spacing.sm },
  rate: { flex: 1 },
  label: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700', flexShrink: 1 },
  strong: { fontSize: 18 },
  help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
  amountRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
  amount: { color: color.textPrimary, fontSize: 18, fontWeight: '800' },
  amountStrong: { color: color.brand, fontSize: 24 },
});
