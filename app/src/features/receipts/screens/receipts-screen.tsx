import {ApiError} from '@/services/api/api-client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { formatMoney, type Page } from '@/domain/reception/reception';
import type {ReceiptHistoryRow,ReceiptHistoryKind} from '@/domain/receipts/receipt';
import { useSession } from '@/features/auth/session/session-provider';
import { ReceiptPreview } from '@/features/receipts/components/receipt-preview';
import {listReceiptHistory} from '@/services/api/receipts-api';
import { downloadReceipt, shareReceipt,releaseReceiptUri } from '@/services/receipts/receipt-sharing';
import { AppButton, AppCard, AppScreen, EmptyState, FeedbackState, LoadingState, ScreenHeader } from '@/ui/components';
import { color, spacing, typography } from '@/ui/tokens';


type ReceiptKind=ReceiptHistoryKind;

export function ReceiptsScreen(){
  const {session}=useSession();return session?<ReceiptsWorkspace key={session.accessToken}/>:null;
}
function ReceiptsWorkspace() {
  const { session,invalidateSession } = useSession();
  const active=useRef(true);const request=useRef(0);const processing=useRef(false);const previewUri=useRef<string|null>(null);
  const {width}=useWindowDimensions();
  const token = session?.accessToken ?? '';
  const [sales, setSales] = useState<Page<ReceiptHistoryRow>|null>(null);
  const [purchases, setPurchases] = useState<Page<ReceiptHistoryRow>|null>(null);
  const [saleOffset,setSaleOffset]=useState(0);const [purchaseOffset,setPurchaseOffset]=useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; uri: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyError,setHistoryError]=useState<string|null>(null);
  const [failedAction,setFailedAction]=useState<{kind:ReceiptKind;id:string;title:string;mode:'preview'|'share'}|null>(null);

  const fetchHistory=useCallback(async()=>{
    const [sales,purchases]=await Promise.all([listReceiptHistory(token,'sales',saleOffset),listReceiptHistory(token,'purchases',purchaseOffset)]);
    return {sales,purchases};
  },[token,saleOffset,purchaseOffset]);

  useEffect(()=>{active.current=true;return()=>{active.current=false;if(previewUri.current)releaseReceiptUri(previewUri.current);};},[]);
  const read=useCallback(async()=>{
    const generation=++request.current;
    try{const value=await fetchHistory();if(active.current&&generation===request.current){setSales(value.sales);setPurchases(value.purchases);setHistoryError(null);}}
    catch(cause){if(active.current&&generation===request.current){if(cause instanceof ApiError&&cause.status===401){setHistoryError('La sesión venció. Inicia sesión nuevamente.');void invalidateSession();}else setHistoryError(cause instanceof Error?cause.message:'No se pudo cargar el historial.');}}
    finally{if(active.current&&generation===request.current)setLoading(false);}
  },[fetchHistory,invalidateSession]);
  useEffect(()=>{void Promise.resolve().then(()=>{if(active.current)void read();});},[read]);
  function load(){setLoading(true);setHistoryError(null);void read();}
  function changePage(kind:ReceiptKind,next:number){
    if(processing.current||next===(kind==='sales'?saleOffset:purchaseOffset))return;
    request.current++;setLoading(true);setHistoryError(null);setError(null);setFailedAction(null);setSales(null);setPurchases(null);
    if(kind==='sales')setSaleOffset(next);else setPurchaseOffset(next);
  }
  function closePreview(){if(previewUri.current)releaseReceiptUri(previewUri.current);previewUri.current=null;setPreview(null);}
  async function documentAction(kind:ReceiptKind,id:string,title:string,mode:'preview'|'share'){
    if(processing.current)return;processing.current=true;setWorking(`${mode}-${id}`);setError(null);setFailedAction(null);
    try{
      if(mode==='share')await shareReceipt(kind,id,token,()=>active.current);
      else{
        const file=await downloadReceipt(kind,id,token);
        if(!active.current){releaseReceiptUri(file.uri);return;}
        if(previewUri.current)releaseReceiptUri(previewUri.current);
        previewUri.current=file.uri;setPreview({title,uri:file.uri});
      }
    }catch(cause){if(active.current){if(cause instanceof ApiError&&cause.status===401)void invalidateSession();else{setError(cause instanceof Error?cause.message:'No se pudo abrir el comprobante.');setFailedAction({kind,id,title,mode});}}}
    finally{processing.current=false;if(active.current)setWorking(null);}
  }
  const openPreview=(kind:ReceiptKind,id:string,title:string)=>documentAction(kind,id,title,'preview');
  const share=(kind:ReceiptKind,id:string)=>documentAction(kind,id,'Comprobante','share');

  function historyCard(kind:ReceiptKind,page:Page<ReceiptHistoryRow>|null,offset:number){
    if(!page)return null;
    const heading=kind==='purchases'?'Compras':'Ventas';
    return <AppCard title={heading}>
      <Text style={styles.help}>{page.total} operaciones · Página {Math.floor(offset/20)+1}</Text>
      {page.items.length?page.items.map(item=>{
        const title=`${kind==='purchases'?'Compra':'Venta'} ${item.occurredOn}`;const available=item.state==='confirmed';
        return <View key={item.id} style={[styles.row,width<760&&styles.rowPhone]}><View style={[styles.copy,width<760&&styles.copyPhone]}><Text style={styles.title}>{item.occurredOn} · {formatMoney(item.amountCents)}</Text><Text style={styles.help}>{item.counterpartyName??'Sin contraparte disponible'} · Referencia {item.reference.slice(0,8)} · {available?'Vigente':'Comprobante invalidado'}</Text></View><View style={styles.actions}><AppButton disabled={Boolean(working)||!available} label={working===`preview-${item.id}`?'Abriendo…':'Vista previa'} onPress={()=>void openPreview(kind,item.id,title)} tone="secondary"/><AppButton disabled={Boolean(working)||!available} label={working===`share-${item.id}`?'Preparando…':'Compartir'} onPress={()=>void share(kind,item.id)} tone="secondary"/></View></View>;
      }):<EmptyState title={offset?`Sin ${heading.toLocaleLowerCase()} en esta página`:`Sin ${heading.toLocaleLowerCase()}`} message="No hay operaciones para mostrar en esta página."/>}
      <AppButton label={`${heading} anteriores`} tone="secondary" disabled={Boolean(working)||offset===0} onPress={()=>changePage(kind,Math.max(0,offset-20))}/>
      <AppButton label={`${heading} siguientes`} tone="secondary" disabled={Boolean(working)||offset+page.items.length>=page.total} onPress={()=>changePage(kind,offset+20)}/>
    </AppCard>;
  }

  if (!session) return null;
  if (loading) return <AppScreen contentContainerStyle={styles.center} scrollable={false}><LoadingState label="Cargando comprobantes" /></AppScreen>;

  return (
    <>
      <AppScreen contentContainerStyle={styles.screen}>
        <ScreenHeader eyebrow="COMPROBANTES" title="Historial y documentos" description="Previsualiza el PDF vigente y compártelo mediante el panel seguro del dispositivo." />
        <View style={styles.top}><AppButton label="Actualizar" disabled={Boolean(working)} onPress={load} tone="secondary" /></View>
        {historyError?<FeedbackState actionLabel="Reintentar historial" onAction={load} title="Historial no disponible" message={historyError} tone="error"/>:null}
        {error?<FeedbackState actionLabel={failedAction?'Reintentar documento':undefined} onAction={failedAction?()=>void documentAction(failedAction.kind,failedAction.id,failedAction.title,failedAction.mode):undefined} title="Documento no disponible" message={error} tone="error"/>:null}
        {!historyError?<>{historyCard('purchases',purchases,purchaseOffset)}{historyCard('sales',sales,saleOffset)}</>:null}
      </AppScreen>
      <ReceiptPreview onClose={closePreview} title={preview?.title ?? 'Comprobante'} uri={preview?.uri ?? null} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { gap: spacing.xl }, center: { justifyContent: 'center' }, top: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  rowPhone:{flexDirection:"column",alignItems:"stretch"},copyPhone:{flex:0,flexBasis:'auto',flexShrink:0,minWidth:0,width:"100%"},
  row: { alignItems: 'center', borderBottomColor: color.border, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.md }, copy: { flex: 1, minWidth: 220 }, title: { color: color.textPrimary, ...typography.bodySmall, fontWeight: '700' }, help: { color: color.textSecondary, ...typography.bodySmall }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
