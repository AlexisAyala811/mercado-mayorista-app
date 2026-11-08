import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createOperationId, formatMoney } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiUnavailableError } from '@/services/api/api-client';
import { recordShareAttempt, type ShareInput } from '@/services/api/messaging-api';
import { getBuyerStatement, statementErrorMessage, type BuyerStatement } from '@/services/api/statement-api';
import { downloadStatement, openStatementShare, releaseStatementUri, type StatementFormat } from '@/services/receipts/statement-sharing';
import { AppButton, AppCard, AppScreen, EmptyState, FeedbackState, LoadingState, MetricTile, ScreenHeader } from '@/ui/components';
import { color, radius, spacing, typography } from '@/ui/tokens';

type Channel = ShareInput['channel'];
type Props = { buyerId: string; onBack: () => void };

// Spec 009 (T941–T943) inside Cobranzas (spec 011, CL-FM13): preview of the
// buyer statement and sending its PDF or image through Mensajería.
export function BuyerStatementScreen({ buyerId, onBack }: Props) {
  const { session } = useSession();
  const token = session?.accessToken ?? '';
  const active = useRef(true);
  const sending = useRef(false);
  const [statement, setStatement] = useState<BuyerStatement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [busy, setBusy] = useState<StatementFormat | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  const fetchStatement = useCallback(() => getBuyerStatement(token, buyerId)
    .then((value) => { if (active.current) { setStatement(value); setError(null); setOffline(false); } })
    .catch((cause: unknown) => {
      if (!active.current) return;
      setStatement(null);
      if (cause instanceof ApiUnavailableError) setOffline(true);
      else setError(statementErrorMessage(cause));
    })
    .finally(() => { if (active.current) setLoading(false); }), [token, buyerId]);
  useEffect(() => { active.current = true; void fetchStatement(); return () => { active.current = false; }; }, [fetchStatement]);
  function load() { setLoading(true); setError(null); setOffline(false); void fetchStatement(); }

  async function send(format: StatementFormat) {
    if (!statement || sending.current) return;
    sending.current = true; setBusy(format); setResult(null); setSendError(null);
    let attempt: ShareInput | null = null;
    let uri: string | null = null;
    try {
      const file = await downloadStatement(format, buyerId, token, statement.statementNumber);
      uri = file.uri;
      if (!active.current) return;
      attempt = { clientOperationId: createOperationId(), recipientId: statement.buyer.id, recipientKind: 'buyer', channel, filename: file.filename, mimeType: file.mimeType, sizeBytes: file.sizeBytes, state: 'prepared' };
      await recordShareAttempt(token, attempt);
      await openStatementShare(file, statement.buyer.name);
      await recordShareAttempt(token, { ...attempt, state: 'sharing_requested' });
      if (active.current) setResult(`Se abrió la compartición del ${format === 'pdf' ? 'PDF' : 'imagen'} para ${statement.buyer.name}. Comprueba el destinatario y el envío en ${channel === 'whatsapp' ? 'WhatsApp' : 'el correo'}; MAÑAY no verifica la entrega.`);
    } catch (cause) {
      if (attempt) { try { await recordShareAttempt(token, { ...attempt, state: 'failed' }); } catch { /* the attempt stays prepared in Mensajería */ } }
      if (active.current) setSendError(cause instanceof ApiUnavailableError ? 'Sin conexión: el estado de cuenta se genera en el servidor. Vuelve a intentarlo con conexión.' : statementErrorMessage(cause));
    } finally {
      if (uri) releaseStatementUri(uri);
      sending.current = false;
      if (active.current) setBusy(null);
    }
  }

  if (loading) return <AppScreen><LoadingState label="Preparando el estado de cuenta" /></AppScreen>;
  return <AppScreen contentContainerStyle={styles.screen} testID="buyer-statement-screen">
    <View style={styles.top}><AppButton label="Volver a cobranzas" tone="secondary" onPress={onBack} /></View>
    <ScreenHeader eyebrow="VENTA · COBRANZAS" title="Estado de cuenta" description={statement ? `${statement.buyer.name} · N.⁠° ${statement.statementNumber} · corte ${statement.cutoffDate}` : 'Resumen de lo que debe el comprador, calculado por el servidor.'} />
    {offline ? <FeedbackState title="Sin conexión" message="El estado de cuenta se calcula en el servidor con las cuentas confirmadas. Conéctate para verlo." tone="warning" actionLabel="Reintentar" onAction={() => void load()} /> : null}
    {error ? <FeedbackState title="No se pudo preparar el estado de cuenta" message={error} tone="error" actionLabel="Reintentar" onAction={() => void load()} /> : null}
    {statement ? <>
      <View style={styles.metrics}>
        <MetricTile label="Saldo pendiente" value={formatMoney(statement.totals.outstandingCents)} />
        <MetricTile label="Vencido" value={formatMoney(statement.totals.overdueCents)} />
        <MetricTile label="Próximo vencimiento" value={statement.totals.nextDue ? `${statement.totals.nextDue.dueOn} · ${formatMoney(statement.totals.nextDue.amountCents)}` : 'Sin cuotas pendientes'} />
      </View>
      {!statement.sales.length ? <EmptyState title="Sin deuda" message={`${statement.buyer.name} no tiene ventas con saldo pendiente.`} /> : null}
      {statement.sales.map((sale) => <AppCard key={sale.saleId} title={`Venta ${sale.saleCode} · ${sale.saleDate}`}>
        <Text style={styles.line}>Importe {formatMoney(sale.initialCents)} · cobrado {formatMoney(sale.paidCents)}{sale.returnedCents !== '0' ? ` · devuelto ${formatMoney(sale.returnedCents)}` : ''}</Text>
        <Text accessibilityLabel={`Saldo de la venta ${sale.saleCode}: ${formatMoney(sale.outstandingCents)}`} style={styles.outstanding}>Saldo {formatMoney(sale.outstandingCents)}</Text>
        {sale.installments.map((installment) => <View key={`${sale.saleId}-${installment.dueOn}`} style={styles.installment}>
          <Text style={styles.line}>Vence {installment.dueOn} · {formatMoney(installment.outstandingCents)}</Text>
          {installment.overdue ? <View accessibilityLabel="Cuota vencida" style={styles.overdue}><Text style={styles.overdueText}>Vencida</Text></View> : null}
        </View>)}
      </AppCard>)}
      <AppCard title="Enviar al comprador" description="El archivo se genera en el servidor y se comparte por la aplicación que elijas. Queda registrado en Mensajería.">
        <View style={styles.metrics}>{([['whatsapp', 'WhatsApp'], ['email', 'Correo']] as const).map(([value, label]) => <AppButton key={value} label={label} accessibilityRole="radio" accessibilityState={{ checked: channel === value }} tone={channel === value ? 'primary' : 'secondary'} disabled={Boolean(busy)} onPress={() => setChannel(value)} />)}</View>
        <View style={styles.metrics}>
          <AppButton label={busy === 'pdf' ? 'Preparando PDF…' : 'Enviar PDF'} disabled={Boolean(busy)} onPress={() => void send('pdf')} />
          <AppButton label={busy === 'png' ? 'Preparando imagen…' : 'Enviar imagen'} tone="secondary" disabled={Boolean(busy) || !statement.imageAvailable} onPress={() => void send('png')} />
        </View>
        {!statement.imageAvailable ? <Text style={styles.line}>{`La imagen admite hasta ${statement.imageLimit} ventas para que se lea sin ampliar. Envía el PDF.`}</Text> : null}
        {result ? <FeedbackState title="Compartición solicitada" message={result} tone="success" /> : null}
        {sendError ? <FeedbackState title="No se pudo enviar" message={sendError} tone="error" /> : null}
      </AppCard>
    </> : null}
  </AppScreen>;
}

const styles = StyleSheet.create({
  screen: { gap: spacing.lg },
  top: { flexDirection: 'row' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  line: { color: color.textSecondary, ...typography.bodySmall },
  outstanding: { color: color.danger, ...typography.body, fontWeight: '800' },
  installment: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  overdue: { backgroundColor: color.dangerMuted, borderColor: color.dangerAccent, borderLeftWidth: 4, borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  overdueText: { color: color.danger, ...typography.bodySmall, fontWeight: '800' },
});
