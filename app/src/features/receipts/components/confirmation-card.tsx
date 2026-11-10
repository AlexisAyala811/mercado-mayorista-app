import { SymbolView } from 'expo-symbols';
import type { AndroidSymbol } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { ConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { useSession } from '@/features/auth/session/session-provider';
import { shareReceipt, type ReceiptKind } from '@/services/receipts/receipt-sharing';
import { FeedbackState } from '@/ui/components';
import { accent, color } from '@/ui/tokens';

type Props = {
  title: string;
  party: string;
  summary: ConfirmationSummary;
  receipt: { kind: ReceiptKind; id: string } | null;
  newLabel: string;
  onNew: () => void;
  // «NOTA DE VENTA» or «LIQUIDACIÓN DE COMPRA» on the inner box.
  documentLabel?: string;
};

// Spec 011 (RQ-ST04, CL-ST18): the Stitch «Guardado exitosamente» card: the
// confirmed operation with its document, its facts, the charges line and the
// actions. Every send button opens the system share sheet with the PDF, where
// WhatsApp, the mail app or the printer are chosen.
export function ConfirmationCard({ documentLabel = 'COMPROBANTE', title, party, summary, receipt, newLabel, onNew }: Props) {
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
  const disabled = !receipt || sharing;
  return (
    <View accessibilityLabel={`${title}. ${party}. ${summary.totalLabel}: ${summary.total}`} style={styles.card} testID="confirmation-card">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.check}>
        <SymbolView fallback={null} name={{ android: 'check_circle', ios: 'checkmark.circle.fill', web: 'check_circle' }} size={36} tintColor={accent.emerald.ink} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Guardado exitosamente</Text>
      <Text style={styles.lead}>{title} para {party}: quedó registrada y archivada en el servidor.</Text>

      <View style={styles.box}>
        <View style={styles.boxHead}>
          <View style={styles.boxTitle}>
            <SymbolView fallback={null} name={{ android: 'description', ios: 'doc.text', web: 'description' }} size={16} tintColor="#475569" />
            <Text numberOfLines={1} style={styles.document}>{`${documentLabel}${receipt ? ` #${receipt.id.slice(0, 8).toUpperCase()}` : ''}`}</Text>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>{party.toUpperCase()}</Text></View>
        </View>
        <View style={styles.facts}>
          {summary.facts.map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <Text style={styles.label}>{fact.label}</Text>
              <Text style={styles.value}>{fact.value}</Text>
            </View>
          ))}
          <View style={[styles.fact, styles.total]}>
            <Text style={[styles.label, styles.totalLabel]}>{summary.totalLabel}</Text>
            <Text style={styles.totalValue}>{summary.total}</Text>
          </View>
        </View>
        {summary.notes?.length ? (
          <View style={styles.notes}>
            {summary.notes.map((note) => (
              <Text key={note.label} style={styles.note}><Text style={styles.noteLabel}>{note.label}: </Text>{note.value}</Text>
            ))}
          </View>
        ) : null}
      </View>

      {error ? <FeedbackState title="No se pudo compartir" message={error} tone="error" /> : null}
      <View style={styles.actions}>
        <Action disabled={disabled} icon="share" label={sharing ? 'Preparando comprobante…' : 'Compartir comprobante'} onPress={() => void share()} primary />
        <Action icon="add" label={newLabel} onPress={onNew} />
      </View>
      <View style={styles.sends}>
        <Send disabled={disabled} icon="chat" label="Enviar WhatsApp" onPress={() => void share()} tone="whatsapp" />
        <Send disabled={disabled} icon="mail" label="Enviar correo" onPress={() => void share()} />
        <Send disabled={disabled} icon="print" label="Imprimir" onPress={() => void share()} />
      </View>
      <Text style={styles.help}>Cada opción abre el PDF en la hoja de compartir del dispositivo.</Text>
    </View>
  );
}

function Action({ disabled, icon, label, onPress, primary = false }: { disabled?: boolean; icon: AndroidSymbol; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, primary ? styles.actionPrimary : styles.actionSecondary, (pressed || disabled) && styles.dimmed]}>
      <SymbolView fallback={null} name={{ android: icon, ios: 'square.and.arrow.up', web: icon }} size={20} tintColor={primary ? color.textOnBrand : '#334155'} />
      <Text style={[styles.actionText, primary && styles.actionTextPrimary]}>{label}</Text>
    </Pressable>
  );
}

function Send({ disabled, icon, label, onPress, tone }: { disabled?: boolean; icon: AndroidSymbol; label: string; onPress: () => void; tone?: 'whatsapp' }) {
  return (
    <Pressable accessibilityHint="Abre la hoja de compartir con el PDF" accessibilityLabel={label} accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.send, tone === 'whatsapp' && styles.sendWhatsapp, (pressed || disabled) && styles.dimmed]}>
      <SymbolView fallback={null} name={{ android: icon, ios: 'paperplane', web: icon }} size={18} tintColor={tone === 'whatsapp' ? accent.emerald.ink : '#334155'} />
      <Text style={[styles.sendText, tone === 'whatsapp' && { color: accent.emerald.pillInk }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', alignSelf: 'center', backgroundColor: color.surfaceRaised, borderColor: '#F1F5F9', borderRadius: 24, borderWidth: 1, boxShadow: '0px 10px 30px rgba(15,23,42,0.08)', gap: 8, maxWidth: 840, paddingHorizontal: 40, paddingVertical: 20, width: '100%' },
  check: { alignItems: 'center', backgroundColor: accent.emerald.tint, borderRadius: 999, height: 56, justifyContent: 'center', width: 56 },
  title: { color: '#0F172A', fontSize: 28, fontWeight: '800', letterSpacing: -0.4, textAlign: 'center' },
  lead: { color: '#475569', fontSize: 15, lineHeight: 22, maxWidth: 460, textAlign: 'center' },
  box: { alignSelf: 'stretch', backgroundColor: 'rgba(248,250,252,0.8)', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, gap: 10, marginTop: 4, padding: 16 },
  boxHead: { alignItems: 'center', borderBottomColor: '#E2E8F0', borderBottomWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'space-between', paddingBottom: 12 },
  boxTitle: { alignItems: 'center', flexDirection: 'row', flexShrink: 1, gap: 6 },
  document: { color: '#334155', flexShrink: 1, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  badge: { backgroundColor: accent.emerald.pill, borderRadius: 999, flexShrink: 1, paddingHorizontal: 10, paddingVertical: 2 },
  badgeText: { color: accent.emerald.pillInk, fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  fact: { backgroundColor: color.surfaceRaised, borderColor: '#F1F5F9', borderRadius: 12, borderWidth: 1, boxShadow: '0px 1px 2px rgba(15,23,42,0.05)', flexBasis: 150, flexGrow: 1, gap: 6, padding: 12 },
  label: { color: '#64748B', fontSize: 12, fontWeight: '500' },
  value: { color: '#0F172A', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  total: { backgroundColor: accent.emerald.tint, borderColor: accent.emerald.line },
  totalLabel: { color: accent.emerald.pillInk, fontWeight: '700' },
  totalValue: { color: accent.emerald.pillInk, fontSize: 18, fontWeight: '800' },
  notes: { borderTopColor: '#E2E8F0', borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingTop: 10 },
  note: { color: '#64748B', fontSize: 12 },
  noteLabel: { color: '#475569', fontWeight: '700' },
  actions: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginTop: 8 },
  action: { alignItems: 'center', borderRadius: 12, flexBasis: 240, flexDirection: 'row', flexGrow: 1, gap: 10, justifyContent: 'center', maxWidth: 270, minHeight: 52, paddingHorizontal: 20 },
  actionPrimary: { backgroundColor: color.brand, boxShadow: '0px 4px 6px rgba(15,23,42,0.18)' },
  actionSecondary: { backgroundColor: color.surfaceRaised, borderColor: '#CBD5E1', borderWidth: 2 },
  actionText: { color: '#1E293B', fontSize: 16, fontWeight: '600' },
  actionTextPrimary: { color: color.textOnBrand, fontWeight: '700' },
  sends: { alignSelf: 'stretch', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  send: { alignItems: 'center', backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, flexBasis: 160, flexDirection: 'row', flexGrow: 1, gap: 8, justifyContent: 'center', maxWidth: 176, minHeight: 44, paddingHorizontal: 12 },
  sendWhatsapp: { backgroundColor: accent.emerald.tint, borderColor: accent.emerald.line },
  sendText: { color: '#334155', fontSize: 14, fontWeight: '600' },
  help: { color: '#64748B', fontSize: 12, textAlign: 'center' },
  dimmed: { opacity: 0.5 },
});
