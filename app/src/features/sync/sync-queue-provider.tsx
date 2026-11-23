import { precedingUnresolvedOperation } from '@/domain/sync/operation-order';
import { retiredContractReason } from '@/domain/sync/retired-contract';
import { createSerialExecutor } from '@/domain/sync/serial-executor';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { createOperationId } from '@/domain/reception/reception';
import { operationIdConflict, recoverInterruptedOperations, resendWithNewIdentity, transitionOperation, type SyncOperation } from '@/domain/sync/sync-operation';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError, ApiUnavailableError, apiRequest } from '@/services/api/api-client';
import { readEncryptedQueue, writeEncryptedQueue } from '@/services/storage/encrypted-queue-storage';

type EnqueueInput = Pick<SyncOperation, 'body' | 'method' | 'path' | 'type' | 'receptionContext'|'sackCharacteristics'> & { id?: string };
type Value = { isLoadingQueue: boolean; reloadQueue: ()=>Promise<void>; queueError: string | null; operations: SyncOperation[]; pendingCount: number; enqueue: (input: EnqueueInput) => Promise<SyncOperation>; sendQueued: (id: string) => Promise<SyncOperation>; synchronize: () => Promise<void>; retry: (id: string) => Promise<void>; discard: (id: string, reason: string) => Promise<void>; resendAsNew: (id: string) => Promise<SyncOperation> };
const Context = createContext<Value | null>(null);

export function SyncQueueProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const identity = session ? `${session.user.businessId}:${session.user.userId}` : 'anonymous';
  return <IdentitySyncQueueProvider key={identity}>{children}</IdentitySyncQueueProvider>;
}

function IdentitySyncQueueProvider({ children }: PropsWithChildren) {
  const { session } = useSession();
  const hydrationError=useRef<unknown>(null);const serial=useRef(createSerialExecutor());const currentOperations=useRef<SyncOperation[]>([]);
  const [isLoadingQueue,setIsLoadingQueue]=useState(true);
  const [queueError,setQueueError]=useState<string|null>(null);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const scope = useMemo(() => session ? { businessId: session.user.businessId, userId: session.user.userId } : null, [session]);
  const reloadQueue = useCallback(async () => {
    setIsLoadingQueue(true);
    setQueueError(null);
    try {
      const items=scope?await readEncryptedQueue(scope):[];
      currentOperations.current=recoverInterruptedOperations(items);
      setOperations(currentOperations.current);
      hydrationError.current=null;
    } catch(error) {
      hydrationError.current=error;
      setQueueError('No se pudo recuperar la cola cifrada. Conserva los datos del dispositivo y reintenta la lectura.');
      throw error;
    } finally {setIsLoadingQueue(false);}
  },[scope]);
  useEffect(()=>{void serial.current(reloadQueue).catch(()=>undefined);},[reloadQueue]);
  const persist = useCallback(async (items: SyncOperation[]) => { if (scope) await writeEncryptedQueue(scope, items);currentOperations.current=items;setOperations(items); }, [scope]);
  const enqueue = useCallback(async (input: EnqueueInput) => {
    if(hydrationError.current)throw new Error('No se pudo recuperar la cola cifrada. Conserva los datos del dispositivo y vuelve a iniciar sesión.');
    if (!scope) throw new Error('Se requiere una sesión para guardar pendientes.');
    const id=input.id??createOperationId();
    const existing=currentOperations.current.find(item=>item.id===id);
    if(existing){
      if(existing.type!==input.type||existing.path!==input.path||existing.method!==input.method||JSON.stringify(existing.body)!==JSON.stringify(input.body))throw new Error('El identificador ya corresponde a una operación guardada con otros datos. Conserva la operación original.');
      return existing;
    }
    const now=new Date().toISOString();
    const item:SyncOperation={...input,id,businessId:scope.businessId,userId:scope.userId,status:'pending',attempts:0,createdAt:now,updatedAt:now};
    await persist([...currentOperations.current,item]);
    return item;
  },[persist,scope]);
  const findCentralResult = useCallback(async (item: SyncOperation) => { if (!session) return null; const type = operationQueryType(item.type); if (!type) return null; try { return await apiRequest<{ resourceId: string }>(`/operations/${item.id}?type=${type}`, { token: session.accessToken }); } catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; } }, [session]);
  const runOne = useCallback(async (item: SyncOperation, current: SyncOperation[]) => {
    if (!session || !scope) return current;
    if (!['pending', 'rejected', 'review'].includes(item.status)) return current;
    // Spec 005: the central record under this identifier holds other data.
    // Sending again repeats the 409 and looking it up would confirm the wrong
    // record; only «Reenviar como nueva» or a discard move it on.
    if (item.conflictCode === operationIdConflict) return current;

    try { const recovered = await findCentralResult(item); if (recovered) { const final = transitionOperation(item, 'recover', { centralReference: recovered.resourceId }); const next = current.map((value) => value.id === item.id ? final : value); await persist(next); return next; } } catch (error) { if (error instanceof ApiUnavailableError) return current; throw error; }
    const retiredReason=retiredContractReason(item);
    if(retiredReason){
      const next=current.map(value=>value.id===item.id?{...value,status:'review' as const,message:retiredReason,updatedAt:new Date().toISOString()}:value);
      await persist(next);return next;
    }
    const predecessor=precedingUnresolvedOperation(item,current);
    const resolvedPath=resolveReferences(item.path,current);
    if(predecessor||!resolvedPath){
      const message=predecessor?'Esperando la confirmación de una operación anterior del mismo origen.':'Esperando la referencia central de la operación de origen.';
      const next=current.map(value=>value.id===item.id?{...value,message}:value);
      await persist(next);return next;
    }
    if (item.attempts >= 5) {
      const next = current.map(value => value.id === item.id ? {...value, message: 'Se alcanzaron cinco envíos. No hay confirmación central; conserva la operación para revisión o descarte razonado.'} : value);
      await persist(next);
      return next;
    }
    let working = current.map((value) => value.id === item.id ? transitionOperation(value, 'start') : value); await persist(working); const active = working.find((value) => value.id === item.id)!;
    try { const result = await apiRequest<Record<string, unknown>>(resolvedPath, { body: active.body, method: active.method, token: session.accessToken }); working = working.map((value) => value.id === active.id ? transitionOperation(value, 'confirm', { centralReference: centralReferenceFromResponse(active.type, result) }) : value); }
    catch (error) {
      const event = error instanceof ApiUnavailableError || (error instanceof ApiError && error.status >= 500) ? 'network-failure' : error instanceof ApiError && [401, 403, 409].includes(error.status) ? 'conflict' : 'reject';
      const code = error instanceof ApiError && error.status === 409 && error.code === operationIdConflict ? operationIdConflict : undefined;
      const message = code ? idConflictMessage : error instanceof Error ? error.message : 'No se pudo sincronizar.';
      working = working.map((value) => value.id === active.id ? transitionOperation(value, event, { code, message }) : value);
    }
    await persist(working); return working;
  }, [findCentralResult, persist, scope, session]);
  const synchronize = useCallback(async () => { let current = currentOperations.current; for (const item of current.filter((value) => value.status === 'pending')) current = await runOne(item, current); }, [runOne]);
  // Spec 011 (CL-ST36): the queue sends itself when the app comes to the front
  // and every minute while something is pending. It stops at the first
  // operation that the network did not let through, so a tablet without
  // connection neither spends the five sends nor holds new captures behind it.
  const synchronizeAvailable = useCallback(async () => {
    let current = currentOperations.current;
    for (const item of current.filter((value) => value.status === 'pending')) {
      const next = await runOne(item, current);
      const after = next.find((value) => value.id === item.id);
      const blockedByNetwork = next === current || (after?.status === 'pending' && after.attempts > item.attempts);
      current = next;
      if (blockedByNetwork) break;
    }
  }, [runOne]);
  const hasPending = operations.some((item) => item.status === 'pending');
  const autoRunning = useRef(false);
  useEffect(() => {
    if (!session) return;
    const run = () => {
      if (autoRunning.current) return;
      autoRunning.current = true;
      void serial.current(synchronizeAvailable).catch(() => undefined).finally(() => { autoRunning.current = false; });
    };
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') run(); });
    const timer = hasPending ? setInterval(run, autoSyncIntervalMs) : null;
    return () => { subscription.remove(); if (timer) clearInterval(timer); };
  }, [hasPending, session, synchronizeAvailable]);
  const retry = useCallback(async (id: string) => { const item = currentOperations.current.find((value) => value.id === id); if (item) await runOne(item, currentOperations.current); }, [runOne]);
  const sendQueued = useCallback(async (id: string) => {
    const item = currentOperations.current.find((value) => value.id === id);
    if (!item) throw new Error('La operación no está guardada en la cola de esta identidad.');
    const next = await runOne(item, currentOperations.current);
    return next.find((value) => value.id === id)!;
  }, [runOne]);
  // Spec 005: «Reenviar como nueva», only after the user confirms it in the
  // queue screen. The original stays discarded as evidence.
  const resendAsNew = useCallback(async (id: string) => {
    const newId = createOperationId();
    const next = resendWithNewIdentity(currentOperations.current, id, newId);
    await persist(next);
    const sent = await runOne(next.find((value) => value.id === newId)!, next);
    return sent.find((value) => value.id === newId)!;
  }, [persist, runOne]);
  const discard = useCallback(async (id: string, reason: string) => { const item = currentOperations.current.find((value) => value.id === id); if (!item || !reason.trim()) return; if (item.conflictCode === operationIdConflict) { await persist(currentOperations.current.map((value) => value.id === id ? transitionOperation(item, 'discard', { message: `Descartada localmente: ${reason.trim()}` }) : value)); return; } try { const result = await findCentralResult(item); const final = result ? transitionOperation(item, 'recover', { centralReference: result.resourceId }) : transitionOperation(item, 'discard', { message: `Descartada localmente: ${reason.trim()}` }); await persist(currentOperations.current.map((value) => value.id === id ? final : value)); } catch (error) { if (error instanceof ApiUnavailableError) throw new Error('Conéctate para comprobar el estado central antes de descartar.'); throw error; } }, [findCentralResult, persist]);
  const value = useMemo(() => ({ isLoadingQueue, reloadQueue:()=>serial.current(reloadQueue), queueError, operations, pendingCount: operations.filter((item) => item.status === 'pending' || item.status === 'syncing').length, enqueue:(input:EnqueueInput)=>serial.current(()=>enqueue(input)), sendQueued:(id:string)=>serial.current(()=>sendQueued(id)), synchronize:()=>serial.current(synchronize), retry:(id:string)=>serial.current(()=>retry(id)), discard:(id:string,reason:string)=>serial.current(()=>discard(id,reason)), resendAsNew:(id:string)=>serial.current(()=>resendAsNew(id)) }), [discard, enqueue, isLoadingQueue, operations, queueError, reloadQueue, resendAsNew, retry, sendQueued, synchronize]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const autoSyncIntervalMs = 60_000;
export const idConflictMessage = 'El servidor ya tiene otra operación registrada con este identificador. No se reenviará sola: revisa el historial y, si esta operación no está registrada, reenvíala como nueva; si ya lo está, descártala.';
export function useSyncQueue() { const value = useContext(Context); if (!value) throw new Error('useSyncQueue requiere SyncQueueProvider.'); return value; }
function centralReferenceFromResponse(type: string, result: Record<string, unknown>) {
  const resource = type === 'sale.return' ? result?.saleReturn : result;
  if (resource && typeof resource === 'object' && 'id' in resource && typeof resource.id === 'string') return resource.id;
  return undefined;
}
function resolveReferences(path: string, operations: SyncOperation[]) { let unresolved = false; const resolved = path.replace(/@([0-9a-f-]{36})/gi, (_, id: string) => { const parent = operations.find((item) => item.id === id); const reference = parent?.status === 'confirmed' ? parent.centralReference : undefined; if (!reference) { unresolved = true; return ''; } return reference; }); return unresolved ? null : resolved; }
function operationQueryType(type: string) { const map: Record<string, string> = { 'account.payment': 'account-payment', 'account.payment-reversal': 'account-payment', 'freight.settle': 'freight-settlement', 'purchase.settle': 'purchase-settlement', 'purchase.void': 'purchase-void', 'reception.void': 'reception-void', 'reception.sack-void': 'reception-sack-void', 'reception.create': 'reception', 'reception.sack-add': 'reception-sack', 'reception.sack-correct': 'reception-sack', 'reception.close': 'reception-weighing-close', 'sale.create': 'sale', 'sale.return': 'sale-return', 'sale.void': 'sale-void', 'stowage.entry': 'stowage-entry', 'stowage.settle': 'stowage-settlement' }; return map[type]; }
