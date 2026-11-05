import { useEffect,useRef,useState } from 'react';
import type { AnalyticsEvaluation } from '@/domain/analytics/analytics';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { getAnalyticsEvaluation } from '@/services/api/analytics-api';
import { AppButton,FeedbackState,LoadingState } from '@/ui/components';
import { EvaluationDetails } from './evaluation-details';
export function PredictionEvidence({token,evaluationId}:{token:string;evaluationId:string}){
  const {invalidateSession}=useSession();const active=useRef(true);const working=useRef(false);
  const [detail,setDetail]=useState<AnalyticsEvaluation|null>(null);const [visible,setVisible]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function load(){if(working.current)return;if(detail){setVisible(current=>!current);return;}working.current=true;setBusy(true);setError(null);
    try{const saved=await getAnalyticsEvaluation(token,evaluationId);if(active.current){setDetail(saved);setVisible(true);}}
    catch(cause){if(active.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo consultar la evidencia de esta publicación.');}}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  return <><AppButton label={busy?'Consultando evidencia…':visible?'Ocultar evidencia de la publicación':'Ver evidencia de la publicación'} disabled={busy} tone="secondary" onPress={()=>void load()}/>
    {busy?<LoadingState label="Recuperando evaluación original"/>:null}
    {error?<FeedbackState title="Evidencia no disponible" message={error} tone="error" actionLabel="Reintentar evidencia" onAction={()=>void load()}/>:null}
    {visible&&detail?<EvaluationDetails evaluation={detail}/>:null}
  </>;
}
