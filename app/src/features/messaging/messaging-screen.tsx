import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useSession } from '@/features/auth/session/session-provider';
import { loadMessagingAlerts, loadRecipients, loadShareHistory, recordShareAttempt, type FinancialAlert, type Recipient, type ShareAttempt, type ShareInput } from '@/services/api/messaging-api';
import { downloadAttachmentCopy, pickAttachment, releaseAttachment, requestAttachmentShare, type Attachment } from '@/services/messaging/attachment-sharing';
import { AppButton, AppCard, AppScreen, ChoiceDialog, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader, SelectionField } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';
import { formatMoney } from '@/domain/reception/reception';
import { backOrHome } from '@/navigation/back-or-home';

const labels = { prepared: 'Preparado', sharing_requested: 'Compartición solicitada', failed: 'Intento fallido' };
export function MessagingScreen() {
  const { session } = useSession();
  return session?.user.role === 'wholesaler' ? <MessagingWorkspace key={session.accessToken} /> : null;
}
function MessagingWorkspace() {
  const { session } = useSession();
  const token = session?.accessToken ?? '';
  const router = useRouter();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  const [asOf, setAsOf] = useState(today);
  const [through, setThrough] = useState(today);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipient, setRecipient] = useState<Recipient | null>(null);
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [history, setHistory] = useState<ShareAttempt[]>([]);
  const [alerts, setAlerts] = useState<FinancialAlert[] | null>(null);
  const [alertCut, setAlertCut] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [pendingResult, setPendingResult] = useState<ShareInput | null>(null);
  const active = useRef(true);
  const processing = useRef(false);
  const currentFile = useRef<Attachment | null>(null);
  const attempt = useRef<ShareInput | null>(null);
  const blocked = useRef(false);
  const [used, setUsed] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; if (currentFile.current) releaseAttachment(currentFile.current); }; }, []);
  async function reportError(cause: unknown) {
    if (!active.current) return;
    setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación.');
  }
  async function load() {
    if (processing.current) return;
    processing.current = true; setLoading(true); setError(null);
    try {
      const [people, records] = await Promise.all([loadRecipients(token), loadShareHistory(token)]);
      if (active.current) { setRecipients(people); setHistory(records); }
    } catch (cause) { await reportError(cause); }
    finally { processing.current = false; if (active.current) setLoading(false); }
  }
  useEffect(() => {
    let ignore = false;
    processing.current = true;
    Promise.all([loadRecipients(token), loadShareHistory(token)]).then(([people, records]) => {
      if (!ignore && active.current) { setRecipients(people); setHistory(records); }
    }).catch(cause => {
      // The API client handles rejected credentials with the token-scoped session listener.
      if (!ignore && active.current) setError(cause instanceof Error ? cause.message : 'No se pudo cargar la mensajería.');
    }).finally(() => {
      if (!ignore) { processing.current = false; if (active.current) setLoading(false); }
    });
    return () => { ignore = true; };
  }, [token]);
  function clearPreparation() { attempt.current = null; blocked.current = false; setUsed(false); setFeedback(null); setError(null); }
  async function selectFile() {
    if (processing.current) return;
    processing.current = true; setBusy(true); setError(null);
    try {
      const next = await pickAttachment();
      if (!next) return;
      if (!active.current) { releaseAttachment(next); return; }
      if (currentFile.current) releaseAttachment(currentFile.current);
      currentFile.current = next; setAttachment(next); clearPreparation();
    } catch (cause) { await reportError(cause); }
    finally { processing.current = false; if (active.current) setBusy(false); }
  }
  async function share() {
    if (processing.current || blocked.current || !attachment || !recipient) return;
    processing.current = true; setBusy(true); setError(null); setFeedback(null);
    const input: ShareInput = attempt.current ?? { clientOperationId: Crypto.randomUUID(), recipientId: recipient.id, recipientKind: recipient.kind, channel, filename: attachment.filename, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, state: 'prepared' };
    attempt.current = input;
    let outcome: ShareInput['state'] | null = null;
    let selectorStarted = false;
    try {
      const prepared = await recordShareAttempt(token, input);
      if (!active.current) return;
      if (prepared.state !== 'prepared') { blocked.current = true; setUsed(true); throw new Error('Este intento ya tiene un resultado. Selecciona de nuevo el archivo para otro intento.'); }
      selectorStarted = true;
      const result = await requestAttachmentShare(attachment, recipient.name, () => active.current);
      if (!active.current) return;
      if (result !== 'sharing_requested') {
        setFeedback(result === 'downloaded' ? 'Archivo descargado. Adjunta el archivo manualmente en WhatsApp o correo. El registro permanece preparado.' : 'Compartición cancelada. El archivo sigue preparado.');
        return;
      }
      outcome = 'sharing_requested'; blocked.current = true; setUsed(true);
      const update = { ...input, state: outcome };
      setPendingResult(update);
      await recordShareAttempt(token, update);
      if (active.current) { setPendingResult(null); setFeedback('Compartición solicitada. Comprueba el destinatario y el envío en la aplicación externa; Mercado no verifica la entrega.'); }
    } catch (cause) {
      if (active.current && selectorStarted && !outcome) {
        blocked.current = true; setUsed(true);
        const update: ShareInput = { ...input, state: 'failed' }; setPendingResult(update);
        try { await recordShareAttempt(token, update); if (active.current) setPendingResult(null); } catch { /* Retain pending metadata; never re-open the selector automatically. */ }
      }
      await reportError(cause);
    } finally {
      processing.current = false;
      if (active.current) {
        setBusy(false);
        try { const records = await loadShareHistory(token); if (active.current) setHistory(records); } catch { /* The action result remains visible. */ }
      }
    }
  }
  async function retryRecord() {
    if (!pendingResult || processing.current) return;
    processing.current = true; setBusy(true); setError(null);
    try { const saved = await recordShareAttempt(token, pendingResult); if (active.current) { setHistory(rows => [saved, ...rows.filter(row => row.id !== saved.id)]); setPendingResult(null); setFeedback('Estado del intento conservado. No se volvió a abrir la aplicación externa.'); } }
    catch (cause) { await reportError(cause); }
    finally { processing.current = false; if (active.current) setBusy(false); }
  }
  function downloadCopy() {
    if (processing.current || !attachment) return;
    setError(null);
    try {
      downloadAttachmentCopy(attachment);
      setFeedback('Copia descargada. Adjúntala manualmente en WhatsApp o correo. Esta descarga no confirma compartición ni cambia el estado del intento.');
    } catch (cause) { void reportError(cause); }
  }
  async function queryAlerts() {
    if (processing.current) return;
    processing.current = true; setBusy(true); setError(null); setAlerts(null); setAlertCut(null);
    try { const result = await loadMessagingAlerts(token, asOf, through); if (active.current) { setAlerts(result.accountAlerts); setAlertCut(`${asOf} hasta ${through}`); } }
    catch (cause) { await reportError(cause); }
    finally { processing.current = false; if (active.current) setBusy(false); }
  }
  if (!session) return null;
  return <AppScreen contentContainerStyle={styles.screen}>
    <AppButton label="Volver" tone="secondary" onPress={() => backOrHome(router)} />
    <ScreenHeader eyebrow="COMUNICACIÓN COMERCIAL" title="Mensajería y notificaciones" description="Prepara un archivo para tu cliente o proveedor y confirma el envío en WhatsApp o correo." />
    {loading ? <LoadingState label="Cargando destinatarios e historial" /> : null}
    {error ? <FeedbackState title="Revisa la operación" message={error} tone="error" /> : null}
    {feedback ? <FeedbackState title="Estado del archivo" message={feedback} /> : null}
    {pendingResult ? <FeedbackState title="Estado central pendiente" message="El intento aún no tiene su estado final conservado. Reintentar registro no vuelve a compartir el archivo." actionLabel="Reintentar registro" onAction={() => void retryRecord()} /> : null}
    <AppCard title="Compartir un archivo">
      <SelectionField label="Cliente o proveedor" value={recipient ? `${recipient.name} (${recipient.kind === 'buyer' ? 'Cliente' : 'Proveedor'})` : undefined} placeholder="Selecciona una contraparte" disabled={busy || loading || Boolean(pendingResult)} onPress={() => setChoosing(true)} />
      {recipient?.phone ? <Text style={styles.text}>Teléfono registrado: {recipient.phone}. Confirma el contacto final en la aplicación externa.</Text> : null}
      <View style={styles.actions}>{(['whatsapp', 'email'] as const).map(value => <AppButton key={value} label={value === 'whatsapp' ? 'Preparar para WhatsApp' : 'Preparar para correo'} tone={channel === value ? 'primary' : 'secondary'} disabled={busy || Boolean(pendingResult)} onPress={() => { setChannel(value); clearPreparation(); }} />)}</View>
      <AppButton label="Seleccionar PDF, Word o imagen" disabled={busy || loading || Boolean(pendingResult)} tone="secondary" onPress={() => void selectFile()} />
      {attachment ? <Text style={styles.text}>{attachment.filename} · {(attachment.sizeBytes / 1024 / 1024).toFixed(2)} MiB</Text> : <Text style={styles.text}>Un archivo de hasta 20 MiB. No se sube su contenido al servidor.</Text>}
      {Platform.OS === 'web' ? <AppButton label="Descargar copia" tone="secondary" disabled={busy || loading || !attachment || Boolean(pendingResult)} onPress={downloadCopy} /> : null}
      <AppButton label={busy ? 'Preparando…' : 'Revisado: abrir selector para compartir'} disabled={busy || loading || !attachment || !recipient || used || Boolean(pendingResult)} onPress={() => void share()} />
      <Text style={styles.text}>El selector no fija el destinatario ni confirma entrega. Elige WhatsApp o correo y revisa el contacto antes de enviar.</Text>
      <AppButton label="Ver comprobantes generados" tone="secondary" disabled={busy} onPress={() => router.push('/receipts')} />
    </AppCard>
    <AppCard title="Notificaciones de pagos y cobranzas">
      <FormField label="Fecha de corte (AAAA-MM-DD)" value={asOf} editable={!busy} onChangeText={value => { setAsOf(value); setAlerts(null); setAlertCut(null); }} />
      <FormField label="Vencimientos hasta (AAAA-MM-DD)" value={through} editable={!busy} onChangeText={value => { setThrough(value); setAlerts(null); setAlertCut(null); }} />
      <AppButton label="Consultar avisos" disabled={busy || loading} tone="secondary" onPress={() => void queryAlerts()} />
      {alertCut ? <Text style={styles.text}>Corte: {alertCut}. Los avisos no registran pagos.</Text> : null}
      {alerts?.length ? alerts.map(row => <View key={row.installmentId} style={styles.row}><Text style={styles.text}>{row.kind === 'payable' ? 'Por pagar' : 'Por cobrar'} · {row.dueOn} · {formatMoney(row.balanceCents)}</Text><Text style={styles.text}>Cuenta {row.accountId} · Cuota {row.installmentId} · {row.status === 'overdue' ? 'Vencida' : 'Próxima a vencer'}</Text></View>) : alerts ? <EmptyState title="Sin avisos en este corte" message="No hay cuotas abiertas para el intervalo consultado." /> : null}
    </AppCard>
    <AppCard title="Últimos 50 intentos de compartición">
      <AppButton label="Actualizar destinatarios e historial" tone="secondary" disabled={busy || loading} onPress={() => void load()} />
      {history.map(row => <View key={row.id} style={styles.row}><Text style={styles.text}>{row.filename} · {row.recipientName}</Text><Text style={styles.text}>{labels[row.state]} · Canal previsto: {row.channel === 'email' ? 'Correo' : 'WhatsApp'} · {new Date(row.createdAt).toLocaleString('es-PE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })} (Lima)</Text></View>)}
      {!loading && !history.length ? <EmptyState title="Sin intentos registrados" message="Aquí se conservan metadatos, no archivos ni confirmaciones de entrega." /> : null}
    </AppCard>
    <ChoiceDialog title="Selecciona cliente o proveedor" visible={choosing} choices={recipients.map(value => ({ id: `${value.kind}:${value.id}`, label: value.name, supportingText: value.kind === 'buyer' ? 'Cliente' : 'Proveedor' }))} onClose={() => setChoosing(false)} onSelect={choice => { const value = recipients.find(item => `${item.kind}:${item.id}` === choice.id); if (value) { setRecipient(value); clearPreparation(); } setChoosing(false); }} />
  </AppScreen>;
}
const styles = StyleSheet.create({ screen: { gap: spacing.lg }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, text: { color: color.textPrimary, ...typography.bodySmall }, row: { paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.border, gap: spacing.xs } });
