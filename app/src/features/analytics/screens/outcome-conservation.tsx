import { formatLimaDate } from '@/domain/shared/date';
import { useEffect,useRef,useState } from 'react';
import { Text } from 'react-native';
import { createOperationId } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { savePublicationOutcome,type SavedPublicationOutcome } from '@/services/api/analytics-api';
import { AppButton,AppCard,FeedbackState } from '@/ui/components';
import { OutcomeDetails } from './outcome-details';
import { color,typography } from '@/ui/tokens';
export function OutcomeConservation({token,id}:{token:string;id:string}){
  const {invalidateSession}=useSession();const active=useRef(true);const working=useRef(false);const operation=useRef<string|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [saved,setSaved]=useState<SavedPublicationOutcome|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function save(){if(working.current)return;working.current=true;operation.current??=createOperationId();setBusy(true);setError(null);
    try{const result=await savePublicationOutcome(token,id,operation.current);if(active.current)setSaved(result);}
    catch(cause){if(active.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo recuperar la versión. Reintenta con la misma petición.');}}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  return <AppCard title="Conservar comparación" description="Se medirá nuevamente con los hechos centrales al guardar. El resultado conservado puede diferir de la consulta anterior.">
    {!saved?<AppButton label={busy?'Conservando comparación…':'Conservar versión de comparación'} disabled={busy} onPress={()=>void save()}/>:null}
    {error?<FeedbackState title="Conservación no confirmada" message={error} tone="error" actionLabel="Reintentar conservación" onAction={()=>void save()}/>:null}
    {saved?<><OutcomeDetails result={saved.result}/><Text style={{color:color.textPrimary,...typography.bodySmall}}>Versión {saved.id} · Conservar hasta {formatLimaDate(saved.retainUntil)}</Text><AppButton label="Preparar otra versión" tone="secondary" onPress={()=>{operation.current=null;setSaved(null);}}/></>:null}
  </AppCard>;
}
