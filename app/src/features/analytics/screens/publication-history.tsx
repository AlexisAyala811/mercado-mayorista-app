import { formatLimaDateTime } from '@/domain/shared/date';
import { OutcomeHistory } from './outcome-history';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import type { PredictionPublication } from '@/domain/analytics/analytics';
import type { Page } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { getPredictionPublication, listPredictionPublications, type PublicationSummary } from '@/services/api/analytics-api';
import { AppButton, AppCard, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { PredictionDetails } from './prediction-details';
import { PredictionEvidence } from './prediction-evidence';
import { PublicationOutcomePanel } from './publication-outcome';
import { color,typography } from '@/ui/tokens';
const textStyle={color:color.textPrimary,...typography.bodySmall};

export function PublicationHistory({token,varietyId}:{token:string;varietyId:string}) {
  const {invalidateSession}=useSession();
  const [offset,setOffset]=useState(0);const [attempt,setAttempt]=useState(0);
  const [page,setPage]=useState<Page<PublicationSummary>|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);const [detail,setDetail]=useState<PredictionPublication|null>(null);
  const [detailError,setDetailError]=useState<string|null>(null);const [opening,setOpening]=useState(false);
  const request=useRef(0);const active=useRef(true);
  useEffect(()=>{active.current=true;request.current++;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    let current=true;
    listPredictionPublications(token,varietyId,offset).then(result=>{if(current){setPage(result);setError(null);}}).catch(cause=>{
      if(!current)return;
      if(cause instanceof ApiError && cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo consultar el historial de publicaciones.');
    }).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[token,varietyId,offset,attempt,invalidateSession]);
  function changePage(next:number){setLoading(true);setPage(null);setError(null);setOffset(next);}
  async function open(id:string){
    const generation=++request.current;setSelected(id);setDetail(null);setDetailError(null);setOpening(true);
    try{const saved=await getPredictionPublication(token,id);if(active.current && generation===request.current)setDetail(saved);}
    catch(cause){if(!active.current || generation!==request.current)return;if(cause instanceof ApiError && cause.status===401)void invalidateSession();else setDetailError(cause instanceof ApiError?cause.message:'No se pudo recuperar la versión conservada.');}
    finally{if(active.current && generation===request.current)setOpening(false);}
  }
  if(selected)return <AppCard title="Versión conservada">
    <AppButton label="Volver a publicaciones" tone="secondary" onPress={()=>{request.current++;setSelected(null);setDetail(null);setDetailError(null);setOpening(false);}}/>
    {opening?<LoadingState label="Recuperando evidencia conservada"/>:null}
    {detailError?<FeedbackState title="No se pudo recuperar la versión" message={detailError} tone="error" actionLabel="Reintentar versión" onAction={()=>void open(selected)}/>:null}
    {detail?<PredictionDetails publication={detail}/>:null}
    {detail?<PredictionEvidence key={`${token}:${detail.id}`} token={token} evaluationId={detail.evaluationId}/>:null}
    {detail?<PublicationOutcomePanel key={`outcome:${token}:${detail.id}`} token={token} id={detail.id}/>:null}
    {detail?<OutcomeHistory key={`outcome-history:${token}:${detail.id}`} token={token} id={detail.id}/>:null}
  </AppCard>;
  return <AppCard title="Publicaciones conservadas" description="Versiones de esta variedad, de todos los cortes. Permanecen disponibles aunque el historial actual sea insuficiente.">
    {loading?<LoadingState label="Consultando publicaciones conservadas"/>:null}
    {error?<FeedbackState title="Historial no disponible" message={error} tone="error" actionLabel="Reintentar historial" onAction={()=>{setLoading(true);setPage(null);setError(null);setAttempt(current=>current+1);}}/>:null}
    {!loading && !error && page?<>
      {!page.items.length?<EmptyState title="Sin publicaciones conservadas" message="Todavía no se ha guardado una publicación para esta variedad."/>:null}
      <Text style={textStyle}>{page.total} versiones · Página {Math.floor(offset/20)+1}</Text>
      {page.items.map(item=><AppCard key={item.id} title={`Semana ${item.weekStart} – ${item.weekEnd}`} description={formatLimaDateTime(item.createdAt)}>
        <Text style={textStyle}>Versión {item.id} · {item.algorithmVersion}</Text>
        <AppButton expandLabel label={`Abrir publicación ${item.id}`} tone="secondary" onPress={()=>void open(item.id)}/>
      </AppCard>)}
      <AppButton label="Publicaciones anteriores" disabled={offset===0} tone="secondary" onPress={()=>changePage(Math.max(0,offset-20))}/>
      <AppButton label="Publicaciones siguientes" disabled={offset+page.items.length>=page.total} tone="secondary" onPress={()=>changePage(offset+20)}/>
    </>:null}
  </AppCard>;
}
