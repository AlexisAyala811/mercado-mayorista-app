import { backOrHome } from "@/navigation/back-or-home";
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { recoverLocalReception } from '@/domain/reception/local-reception-recovery';
import { useSyncQueue } from './sync-queue-provider';
import { useSession } from '@/features/auth/session/session-provider';
import { retiredContractReason } from '@/domain/sync/retired-contract';
import { AppButton, AppCard, AppScreen, EmptyState, FeedbackState, FormField, LoadingState, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';
import { syncOperationLabel } from '@/ui/operation-labels';

export function SyncQueueScreen() {
  const router = useRouter();
  const {isOfflineSession,retryBootstrap}=useSession();
  const { isLoadingQueue, reloadQueue, queueError, operations, pendingCount, retry, synchronize, discard } = useSyncQueue();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy,setBusy]=useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(action:()=>Promise<void>){if(busy)return;setBusy(true);setError(null);try{await action()}catch(cause){setError(cause instanceof Error?cause.message:'No se pudo completar la sincronización.')}finally{setBusy(false)}}
  async function synchronizeAndRevalidate() {await synchronize();if(isOfflineSession)retryBootstrap();}
  async function retryAndRevalidate(id:string) {await retry(id);if(isOfflineSession)retryBootstrap();}
  async function confirmDiscard() { if (!target || !reason.trim()) { setError('Indica el motivo del descarte.'); return; } try { await discard(target, reason); setTarget(null); setReason(''); } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo descartar.'); } }
  return <AppScreen contentContainerStyle={styles.screen}>
    <View style={styles.top}><AppButton label="Volver" onPress={() => backOrHome(router)} tone="secondary" /><AppButton disabled={busy||!pendingCount||Boolean(queueError)} label={busy?'Procesando…':'Sincronizar pendientes'} onPress={() => void run(synchronizeAndRevalidate)} /></View>
    <ScreenHeader eyebrow="SINCRONIZACIÓN" title="Operaciones del dispositivo" description="El servidor central sigue siendo la fuente oficial. Los pendientes requieren comprobar el resultado central antes de confirmar sus efectos comerciales." />
    {isOfflineSession?<FeedbackState title="Sesión local" message="Puedes comprobar la sesión central aunque no tengas operaciones pendientes." actionLabel="Revalidar sesión" onAction={retryBootstrap}/>:null}
    {queueError ? <FeedbackState title="No se pudieron recuperar los pendientes" message={queueError} tone="error" actionLabel="Reintentar lectura" onAction={()=>void run(reloadQueue)} /> : null}
    {error ? <FeedbackState title="No se pudo completar" message={error} tone="error" /> : null}
    {isLoadingQueue?<LoadingState label="Recuperando operaciones del dispositivo"/>:null}
    {!isLoadingQueue && !queueError ? operations.filter(item => item.type === 'reception.create').map(item => {
      const recovery = recoverLocalReception(operations, item.id, false);
      const confirmed = recoverLocalReception(operations, item.id).kind === 'central';
      return recovery.kind === 'open' ? <AppCard key={`resume-${item.id}`} title={confirmed ? 'Recepción guardada en este dispositivo' : 'Recepción local abierta'} description={`${recovery.reception.receivedOn} · ${recovery.reception.driverName}`}><Text style={styles.text}>{confirmed ? 'Consulta el estado central o recupera la copia local si estás sin conexión.' : 'Los cambios conservados aún requieren confirmación central.'}</Text><AppButton disabled={busy} label={confirmed ? 'Continuar recepción guardada' : recovery.reception.state === 'weighed' ? 'Continuar liquidación local' : 'Continuar pesaje local'} onPress={() => router.push({ pathname: '/purchase-flow', params: { receptionId: recovery.reception.id } } as Href)} /></AppCard> : null;
    }) : null}
    {operations.length ? operations.slice().reverse().map((item) => <AppCard key={item.id} title={label(item.status)} description={`${syncOperationLabel(item.type)} · ${new Date(item.createdAt).toLocaleString('es-PE')}`}>
      <Text style={styles.text}>Intentos: {item.attempts} de 5</Text>{item.message ? <Text style={styles.error}>{item.message}</Text> : null}
      {['pending', 'review'].includes(item.status) ? <AppButton disabled={busy} label={item.attempts<5&&!retiredContractReason(item)?'Reintentar':'Comprobar resultado central'} onPress={() => void run(()=>retryAndRevalidate(item.id))} tone="secondary" /> : null}
      {['pending', 'rejected', 'review'].includes(item.status) ? <View style={styles.actions}><AppButton disabled={busy} label="Descartar" onPress={() => setTarget(item.id)} tone="secondary" /></View> : null}
      {target === item.id ? <><FormField label="Motivo del descarte" onChangeText={setReason} value={reason} /><AppButton disabled={busy} label="Confirmar descarte" onPress={() => void run(confirmDiscard)} /></> : null}
    </AppCard>) : queueError||isLoadingQueue ? null : <EmptyState title="Sin operaciones locales" message="No hay registros de operaciones locales para esta identidad." />}
  </AppScreen>;
}
function label(status: string) { return ({ pending: 'Pendiente', syncing: 'Sincronizando', confirmed: 'Confirmada', discarded: 'Descartada', rejected: 'Rechazada', review: 'Requiere revisión' } as Record<string, string>)[status] ?? status; }
const styles = StyleSheet.create({ screen: { gap: spacing.xl }, top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, text: { color: color.textSecondary, ...typography.bodySmall }, error: { color: color.danger, ...typography.bodySmall } });
