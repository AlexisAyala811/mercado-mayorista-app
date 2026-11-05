import { formatLimaDateTime, formatLimaDate } from '@/domain/shared/date';
import { useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import type { Page } from '@/domain/reception/reception';
import { useSession } from '@/features/auth/session/session-provider';
import { ApiError } from '@/services/api/api-client';
import { getSavedPublicationOutcome, listPublicationOutcomes, type OutcomeSummary,type SavedPublicationOutcome } from '@/services/api/analytics-api';
import { AppButton, AppCard, EmptyState, FeedbackState, LoadingState } from '@/ui/components';
import { OutcomeDetails } from './outcome-details';
import { color,typography } from '@/ui/tokens';
const textStyle={color:color.textPrimary,...typography.bodySmall};

export function OutcomeHistory({token,id}:{token:string;id:string}) {
  const {invalidateSession}=useSession();
  const [offset,setOffset]=useState(0);const [attempt,setAttempt]=useState(0);
  const [page,setPage]=useState<Page<OutcomeSummary>|null>(null);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null);const [detail,setDetail]=useState<SavedPublicationOutcome|null>(null);
  const [detailError,setDetailError]=useState<string|null>(null);const [opening,setOpening]=useState(false);
  const request=useRef(0);const active=useRef(true);
  useEffect(()=>{active.current=true;request.current++;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    let current=true;
    listPublicationOutcomes(token,id,offset).then(result=>{if(current){setPage(result);setError(null);}}).catch(cause=>{
      if(!current)return;
      if(cause instanceof ApiError && cause.status===401)void invalidateSession();else setError(cause instanceof ApiError?cause.message:'No se pudo consultar el historial de comparaciones.');
    }).finally(()=>{if(current)setLoading(false);});
    return ()=>{current=false;};
  },[token,id,offset,attempt,invalidateSession]);
  function changePage(next:number){setLoading(true);setPage(null);setError(null);setOffset(next);}
  async function open(outcomeId:string){
    const generation=++request.current;setSelected(outcomeId);setDetail(null);setDetailError(null);setOpening(true);
    try{const saved=await getSavedPublicationOutcome(token,id,outcomeId);if(active.current && generation===request.current)setDetail(saved);}
    catch(cause){if(!active.current || generation!==request.current)return;if(cause instanceof ApiError && cause.status===401)void invalidateSession();else setDetailError(cause instanceof ApiError?cause.message:'No se pudo recuperar la versión conservada.');}
    finally{if(active.current && generation===request.current)setOpening(false);}
  }
  if(selected)return <AppCard title="Versión conservada">
    <AppButton label="Volver a comparaciones" tone="secondary" onPress={()=>{request.current++;setSelected(null);setDetail(null);setDetailError(null);setOpening(false);}}/>
    {opening?<LoadingState label="Recuperando evidencia conservada"/>:null}
    {detailError?<FeedbackState title="No se pudo recuperar la versión" message={detailError} tone="error" actionLabel="Reintentar versión" onAction={()=>void open(selected)}/>:null}
    {detail?<><OutcomeDetails result={detail.result}/><Text style={textStyle}>Versión {detail.id} · Conservar hasta {formatLimaDate(detail.retainUntil)}</Text></>:null}
  </AppCard>;
  return <AppCard title="Comparaciones conservadas" description="Mediciones conservadas de esta comparación. Abrir una versión recupera su resultado original.">
    <AppButton label="Actualizar comparaciones" disabled={loading} tone="secondary" onPress={()=>{setLoading(true);setPage(null);setError(null);setOffset(0);setAttempt(current=>current+1);}}/>
    {loading?<LoadingState label="Consultando comparaciones conservadas"/>:null}
    {error?<FeedbackState title="Historial no disponible" message={error} tone="error" actionLabel="Reintentar historial" onAction={()=>{setLoading(true);setPage(null);setError(null);setAttempt(current=>current+1);}}/>:null}
    {!loading && !error && page?<>
      {!page.items.length?<EmptyState title="Sin comparaciones conservadas" message="Todavía no se ha guardado una comparación para esta comparación."/>:null}
      <Text style={textStyle}>{page.total} versiones · Página {Math.floor(offset/20)+1}</Text>
      {page.items.map(item=><AppCard key={item.id} title="Comparación conservada" description={formatLimaDateTime(item.createdAt)}>
        <Text style={textStyle}>Versión {item.id}</Text>
        <AppButton expandLabel label={`Abrir comparación ${item.id}`} tone="secondary" onPress={()=>void open(item.id)}/>
      </AppCard>)}
      <AppButton label="Comparaciones anteriores" disabled={offset===0} tone="secondary" onPress={()=>changePage(Math.max(0,offset-20))}/>
      <AppButton label="Comparaciones siguientes" disabled={offset+page.items.length>=page.total} tone="secondary" onPress={()=>changePage(offset+20)}/>
    </>:null}
  </AppCard>;
}
