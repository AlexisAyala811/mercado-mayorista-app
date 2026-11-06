import { StyleSheet, Text, View } from 'react-native';

import type { PurchaseSettlement, SettlementLotView } from '@/domain/reception/reception';
import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { color, radius, spacing, typography } from '@/ui/tokens';

// Lots of a confirmed settlement (spec 010, T1042): shared by the confirmation
// and the purchase detail of «Ver compras».
export function SettlementLotList({ settlement }: { settlement: PurchaseSettlement }) {
  if (!settlement.lots?.length) return null;
  return <View style={styles.lots}>{settlement.lots.map((lot) => <LotRow key={lot.letter} lot={lot} />)}</View>;
}

export function freightLabel(settlement: Pick<PurchaseSettlement, 'freightChargedTo'>) {
  return settlement.freightChargedTo === 'wholesaler' ? 'Flete a cargo del Mayorista' : 'Flete descontado';
}

export function lotTitleOf(lot: SettlementLotView) {
  return [`Lote ${lot.letter}`, lot.name, lot.varietyName, lot.qualityName ?? (lot.varietyName ? 'Calidad no informada' : null)].filter(Boolean).join(' · ');
}

function LotRow({ lot }: { lot: SettlementLotView }) {
  const rate = `${formatMoney(lot.unitPriceCents)} por ${lot.priceBasis === 'sack' ? 'saco' : 'kg'}`;
  return <View style={styles.lot}>
    <View style={styles.lotCopy}>
      <Text style={styles.lotTitle}>{lotTitleOf(lot)}</Text>
      <Text style={styles.help}>{lot.sacks} {lot.sacks === 1 ? 'saco' : 'sacos'} · {formatKilograms(lot.netWeightKg)} · {rate}</Text>
    </View>
    <Text accessibilityLabel={`Importe del lote ${lot.letter}: ${formatMoney(lot.amountCents)}`} style={styles.amount}>{formatMoney(lot.amountCents)}</Text>
  </View>;
}

const styles = StyleSheet.create({
  lots: { gap: spacing.sm },
  lot: { alignItems: 'center', borderColor: color.border, borderRadius: radius.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  lotCopy: { flex: 1, gap: spacing.xs },
  lotTitle: { color: color.brand, ...typography.bodySmall, fontWeight: '800' },
  amount: { color: color.textPrimary, fontSize: 18, fontWeight: '800' },
  help: { color: color.textSecondary, fontSize: 14, lineHeight: 20 },
});
