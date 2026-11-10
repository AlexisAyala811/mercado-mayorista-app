import { useSession } from '@/features/auth/session/session-provider';
import { useSyncQueue } from './sync-queue-provider';

export type SyncTone = 'ok' | 'pending' | 'warning';
export type SyncStatus = { tone: SyncTone; title: string; detail: string; accessibilityLabel: string };

// Spec 011 (CL-ST18): the state of the local queue, shown in the Stitch header
// («En línea · Sincronizado»). A queue that could not be read is never shown
// as synchronized.
export function useSyncStatus(): SyncStatus | null {
  const { session, isOfflineSession } = useSession();
  const { isLoadingQueue, queueError, operations, pendingCount } = useSyncQueue();
  if (!session) return null;
  const attention = operations.filter((item) => item.status === 'rejected' || item.status === 'review').length;
  if (isLoadingQueue) return { tone: 'pending', title: 'Recuperando operaciones', detail: 'Leyendo los pendientes', accessibilityLabel: 'Recuperando operaciones del dispositivo' };
  if (queueError) return { tone: 'warning', title: 'No se pudieron recuperar los pendientes', detail: 'Revisar', accessibilityLabel: 'No se pudo recuperar la sincronización' };
  if (attention) return { tone: 'warning', title: 'Sincronización requiere revisión', detail: `${attention} por revisar`, accessibilityLabel: `${pendingCount} operaciones pendientes, ${attention} requieren revisión` };
  if (isOfflineSession) return { tone: 'pending', title: 'Sin conexión', detail: `${pendingCount} pendientes`, accessibilityLabel: `Sesión local sin conexión, ${pendingCount} operaciones pendientes` };
  if (pendingCount) return { tone: 'pending', title: 'En línea', detail: `${pendingCount} pendientes`, accessibilityLabel: `${pendingCount} operaciones pendientes de confirmación central` };
  return { tone: 'ok', title: 'En línea', detail: 'Sincronizado', accessibilityLabel: 'En línea, datos sincronizados' };
}
