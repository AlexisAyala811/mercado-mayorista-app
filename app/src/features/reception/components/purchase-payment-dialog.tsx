import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { reviewAccountPayment } from '@/domain/accounts/payment-review';
import { createOperationId, formatMoney } from '@/domain/reception/reception';
import type { HistoryCard } from '@/domain/shared/history-cards';
import { SheetInput } from '@/features/reception/screens/purchase-sheet';
import { useSyncQueue } from '@/features/sync/sync-queue-provider';
import { listAccounts, type Account } from '@/services/api/operations-api';
import { SymbolView } from '@/ui/components/symbol';

type Props = {
  card: HistoryCard;
  token: string;
  onClose: () => void;
  // The payment was confirmed by the server: reload the list and totals.
  onPaid: (message: string) => void;
  // Without connection or when the queue keeps it pending.
  onPending: () => void;
};

// «Abonar / Liquidar» of «Ver compras» (spec 011, CL-ST30): the payment of
// the purchase account, the same operation as in «Deudas» (account.payment
// with its clientOperationId and the account version), on this screen.
export function PurchasePaymentDialog({ card, onClose, onPaid, onPending, token }: Props) {
  const { enqueue, sendQueued } = useSyncQueue();
  const [account, setAccount] = useState<Account | null>(null);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const operation = useRef<string | null>(null);
  // With the keyboard open the window goes up and fits the free space, so the
  // amount and «Registrar pago» stay visible (same as the lot window, CL-ST26).
  const [keyboardTop, setKeyboardTop] = useState(0);
  const { height } = useWindowDimensions();
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => setKeyboardTop(event.endCoordinates.screenY || height - event.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(0));
    return () => { show.remove(); hide.remove(); };
  }, [height]);

  useEffect(() => {
    let active = true;
    listAccounts(token).then(
      (accounts) => {
        if (!active) return;
        const found = accounts.items.find((item) => item.kind === 'payable' && item.sourceId === card.sourceId) ?? null;
        setAccount(found);
        if (found) setAmount(centsInput(found.balanceCents));
        else setError('No se encontró la cuenta por pagar de esta compra.');
        setLoading(false);
      },
      (cause: unknown) => {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : 'No se pudo consultar la cuenta.');
        setLoading(false);
      },
    );
    return () => { active = false; };
  }, [card.sourceId, token]);

  async function pay() {
    if (!account || busy) return;
    const review = reviewAccountPayment(account, amount);
    if (review.kind === 'invalid') { setError(review.message); return; }
    setBusy(true); setError(null);
    operation.current ??= createOperationId();
    const id = operation.current;
    let saved = false;
    try {
      await enqueue({ body: { amountCents: review.amountCents, clientOperationId: id, expectedAccountVersion: account.version }, id, method: 'POST', path: `/accounts/${account.id}/payments`, type: 'account.payment' });
      saved = true;
      const outcome = await sendQueued(id);
      if (outcome.status !== 'confirmed') { onPending(); return; }
      onPaid(`Pago de ${formatMoney(review.amountCents)} registrado a ${card.party}.`);
    } catch (cause) {
      if (saved) { onPending(); return; }
      setError(cause instanceof Error ? cause.message : 'No se pudo registrar el pago.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={busy ? () => undefined : onClose} transparent visible>
      <View style={[styles.backdrop, keyboardTop > 0 && styles.backdropTop]}>
        <View accessibilityViewIsModal style={[styles.card, keyboardTop > 0 && { maxHeight: Math.max(220, keyboardTop - 24) }]}>
          <View style={styles.head}>
            <View style={styles.titleRow}>
              <SymbolView fallback={null} name={{ android: 'payments', ios: 'banknote', web: 'payments' }} size={24} tintColor="#FFFFFF" />
              <Text accessibilityRole="header" style={styles.title}>Abonar / Liquidar deuda</Text>
            </View>
            <Pressable accessibilityLabel="Cerrar" accessibilityRole="button" disabled={busy} hitSlop={8} onPress={onClose} style={styles.close}>
              <SymbolView fallback={null} name={{ android: 'close', ios: 'xmark', web: 'close' }} size={22} tintColor="#FFFFFF" />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.party}>
              <Text style={styles.ticket}>#{card.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.partyName}>{card.party}</Text>
            </View>
            {loading ? <ActivityIndicator accessibilityLabel="Consultando la cuenta" color="#047857" /> : null}
            {account ? (
              <>
                <View style={styles.balance}>
                  <Text style={styles.balanceLabel}>SALDO PENDIENTE ACTUAL:</Text>
                  <Text accessibilityLabel={`Saldo pendiente actual: ${formatMoney(account.balanceCents)}`} style={styles.balanceValue}>{formatMoney(account.balanceCents)}</Text>
                </View>
                <Text style={styles.label}>MONTO A CANCELAR / ABONAR (S/):</Text>
                <SheetInput accessibilityLabel="Monto a cancelar o abonar (S/)" autoComplete="off" autoCorrect={false} editable={!busy} importantForAutofill="no" keyboardType="decimal-pad" onChangeText={(value) => { setAmount(value); setError(null); }} placeholder="0.00" style={styles.amount} value={amount} />
              </>
            ) : null}
            {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
          </ScrollView>
          <View style={styles.footer}>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={busy} onPress={onClose} style={styles.cancel}><Text style={styles.cancelText}>CANCELAR</Text></Pressable>
              <Pressable accessibilityLabel="Registrar pago" accessibilityRole="button" accessibilityState={{ disabled: !account || busy }} disabled={!account || busy} onPress={() => void pay()} style={({ pressed }) => [styles.pay, (pressed || !account || busy) && styles.dimmed]}>
                <SymbolView fallback={null} name={{ android: 'check_circle', ios: 'checkmark.circle', web: 'check_circle' }} size={18} tintColor="#FFFFFF" />
                <Text style={styles.payText}>{busy ? 'REGISTRANDO…' : 'REGISTRAR PAGO'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function centsInput(cents: string) {
  const value = BigInt(cents);
  return `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  backdrop: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'center', padding: 16 },
  backdropTop: { justifyContent: 'flex-start', paddingTop: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, maxWidth: 448, overflow: 'hidden', width: '100%' },
  head: { alignItems: 'center', backgroundColor: '#B91C1C', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
  titleRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  close: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  body: { gap: 16, padding: 24, paddingBottom: 12 },
  party: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, padding: 14 },
  ticket: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  partyName: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  balance: { alignItems: 'center', backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 12, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 14 },
  balanceLabel: { color: '#7F1D1D', fontSize: 12, fontWeight: '700' },
  balanceValue: { color: '#DC2626', fontSize: 20, fontWeight: '900' },
  label: { color: '#334155', fontSize: 12, fontWeight: '700', marginBottom: -10 },
  amount: { borderColor: '#10B981', borderRadius: 12, borderWidth: 2, color: '#064E3B', fontSize: 20, fontWeight: '900', minHeight: 52 },
  error: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  footer: { paddingBottom: 20, paddingHorizontal: 24 },
  actions: { alignItems: 'center', flexDirection: 'row', gap: 12, justifyContent: 'flex-end' },
  cancel: { alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: 20 },
  cancelText: { color: '#334155', fontSize: 12, fontWeight: '700' },
  pay: { alignItems: 'center', backgroundColor: '#059669', borderRadius: 12, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 44, paddingHorizontal: 24 },
  payText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  dimmed: { opacity: 0.5 },
});
