import { OutcomeDetails } from './outcome-details';
import { OutcomeConservation } from './outcome-conservation';
import { useEffect,useRef,useState } from 'react';
import type { PublicationOutcome } from '@/domain/analytics/analytics';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { getPublicationOutcome } from '@/services/api/analytics-api';
import { AppButton,AppCard,FeedbackState,LoadingState } from '@/ui/components';
export function PublicationOutcomePanel({token,id}:{token:string;id:string}){
  const {invalidateSession}=useSession();const active=useRef(true);const working=useRef(false);
  const [busy,setBusy]=useState(false);const [result,setResult]=useState<PublicationOutcome|null>(null);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function consult(){if(working.current)return;working.current=true;setBusy(true);setError(null);setResult(null);
    try{const value=await getPublicationOutcome(token,id);if(active.current)setResult(value);}
    catch(cause){if(active.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo comparar esta publicación.');}}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  return <AppCard title="Comparación posterior" description="Consulta el precio registrado al cerrar la semana y conserva la estimación original.">
    <AppButton label={busy?'Consultando comparación…':'Consultar comparación posterior'} disabled={busy} tone="secondary" onPress={()=>void consult()}/>
    {busy?<LoadingState label="Consultando operaciones de la semana"/>:null}
    {error?<FeedbackState title="Comparación no disponible" message={error} tone="error" actionLabel="Reintentar comparación" onAction={()=>void consult()}/>:null}
    {result?<OutcomeDetails result={result}/>:null}
    {result && result.state!=='week_in_progress'?<OutcomeConservation key={`${token}:${id}`} token={token} id={id}/>:null}
  </AppCard>;
}
