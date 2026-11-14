import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { useSession } from '@/features/auth/session/session-provider';
import { shareReceipt, type ReceiptKind } from '@/services/receipts/receipt-sharing';
import { AppButton, FeedbackState } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Props = {
  title: string;
  party: string;
  summary: ConfirmationSummary;
  receipt: { kind: ReceiptKind; id: string } | null;
  newLabel: string;
  onNew: () => void;
};

// Spec 011 (RQ-ST04, Stitch «Guardado exitosamente»): the confirmed purchase
// or sale in one card, its PDF receipt to share (WhatsApp, correo… through the
// system share sheet) and the next operation.
export function ConfirmationCard({ title, party, summary, receipt, newLabel, onNew }: Props) {
  const { session } = useSession();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function share() {
    if (!receipt || !session || sharing) return;
    setSharing(true);
    setError(null);
    try {
      await shareReceipt(receipt.kind, receipt.id, session.accessToken, () => mounted.current);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'No se pudo compartir el comprobante.');
    } finally {
      if (mounted.current) setSharing(false);
    }
  }
  return (
    <View accessibilityLabel={`${title}. ${party}. ${summary.totalLabel}: ${summary.total}`} style={styles.card} testID="confirmation-card">
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Text style={styles.party}>{party}</Text>
      </View>
      <View style={styles.facts}>
        {summary.facts.map((fact) => (
          <View key={fact.label} style={styles.fact}>
            <Text style={styles.label}>{fact.label}</Text>
            <Text style={styles.value}>{fact.value}</Text>
          </View>
        ))}
        <View style={[styles.fact, styles.total]}>
          <Text style={[styles.label, styles.totalText]}>{summary.totalLabel}</Text>
          <Text style={[styles.totalValue, styles.totalText]}>{summary.total}</Text>
        </View>
      </View>
      {error ? <FeedbackState title="No se pudo compartir" message={error} tone="error" /> : null}
      <View style={styles.actions}>
        <AppButton disabled={!receipt || sharing} label={sharing ? 'Preparando comprobante…' : 'Compartir comprobante'} onPress={() => void share()} />
        <AppButton label={newLabel} tone="secondary" onPress={onNew} />
      </View>
      <Text style={styles.help}>El comprobante se comparte en PDF por WhatsApp, correo u otra aplicación del dispositivo.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignSelf: 'center', backgroundColor: color.surfaceRaised, borderColor: color.border, borderRadius: radius.lg, borderWidth: 1, gap: spacing.lg, maxWidth: 760, padding: spacing.lg, width: '100%' },
  heading: { gap: spacing.xs },
  title: { color: color.success, fontSize: 26, fontWeight: '800', lineHeight: 32 },
  party: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  fact: { backgroundColor: color.surface, borderColor: color.border, borderRadius: radius.md, borderWidth: 1, flexBasis: 160, flexGrow: 1, gap: spacing.xs, padding: spacing.md },
  label: { color: color.textSecondary, ...typography.bodySmall },
  value: { color: color.textPrimary, ...typography.body, fontWeight: '700' },
  total: { backgroundColor: color.successMuted, borderColor: color.successAccent },
  totalText: { color: color.success },
  totalValue: { fontSize: 22, fontWeight: '800', lineHeight: 28 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'center' },
  help: { color: color.textSecondary, textAlign: 'center', ...typography.bodySmall },
});
