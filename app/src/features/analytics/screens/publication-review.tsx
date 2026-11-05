import { PredictionDetails } from './prediction-details';
import { useEffect,useRef,useState } from 'react';
import { Text } from 'react-native';
import type { AnalyticsEvaluation,PredictionPublication,PublicationPreview } from '@/domain/analytics/analytics';
import { createOperationId } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { previewPredictionPublication,publishPrediction } from '@/services/api/analytics-api';
import { AppButton,AppCard,ConfirmationDialog,FeedbackState } from '@/ui/components';
import { color,typography } from '@/ui/tokens';
export function PublicationReview({token,evaluation,onPublished}:{token:string;evaluation:AnalyticsEvaluation;onPublished?:()=>void}){
  const {invalidateSession}=useSession();const active=useRef(true);const working=useRef(false);const operation=useRef<string|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);const [preview,setPreview]=useState<PublicationPreview|null>(null);const [confirm,setConfirm]=useState(false);const [saved,setSaved]=useState<PredictionPublication|null>(null);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  async function review(){if(working.current)return;working.current=true;setBusy(true);setError(null);setPreview(null);
    try{const result=await previewPredictionPublication(token,evaluation.id);if(active.current)setPreview(result);}
    catch(cause){if(active.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo revisar la vigencia. Reintenta la consulta.');}}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  async function publish(){if(working.current||!preview)return;working.current=true;operation.current??=createOperationId();setBusy(true);setError(null);
    try{const result=await publishPrediction(token,{evaluationId:evaluation.id,clientOperationId:operation.current,reviewed:true});if(active.current){setSaved(result);setConfirm(false);onPublished?.();}}
    catch(cause){if(active.current){setConfirm(false);if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo recuperar la publicación. Reintenta la confirmación con la misma petición.');}}
    finally{working.current=false;if(active.current)setBusy(false);}
  }
  const text={color:color.textPrimary,...typography.bodySmall};
  return <AppCard title="Revisión del Mayorista">
    {!saved?<AppButton label={busy?'Revisando…':'Revisar vigencia para publicar'} disabled={busy||!evaluation.improvementMet||!evaluation.coverageMet} onPress={()=>void review()} tone="secondary"/>:null}
    {!evaluation.improvementMet||!evaluation.coverageMet?<Text style={text}>Esta evaluación no cumple los criterios de publicación. Conserva su evidencia.</Text>:null}
    {error?<FeedbackState title="Publicación no confirmada" message={error} tone="error"/>:null}
    {preview&&!saved?<>
      <Text style={text}>Semana {preview.weekStart} – {preview.weekEnd} · {preview.algorithmVersion}</Text>
      <Text style={text}>MAE S/ {preview.maeSolesPerKg} frente a S/ {preview.baselineMaeSolesPerKg} por kg · Cobertura {preview.coveredWeeks}/8.</Text>
      <Text style={text}>Revisa las ocho comparaciones anteriores. Confirmar declara tu revisión y solicita una versión publicada; el servidor comprobará otra vez la vigencia.</Text>
      <AppButton label="Confirmar revisión y publicar" disabled={busy} onPress={()=>setConfirm(true)}/>
    </>:null}
    {saved?<PredictionDetails publication={saved}/>:null}
    <ConfirmationDialog visible={confirm} busy={busy} title="¿Publicar la estimación revisada?" message={`Declaro que revisé la evidencia de ${evaluation.id}, sus ocho comparaciones y criterios. Semana ${preview?.weekStart} – ${preview?.weekEnd}. Se conservará una versión nueva.`} confirmLabel="He revisado la evidencia. Publicar" onCancel={()=>setConfirm(false)} onConfirm={()=>void publish()}/>
  </AppCard>;
}
