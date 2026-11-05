import {loadWebPdf} from '@/services/receipts/pdfjs.web';
import {useEffect,useRef,useState} from 'react';
import {StyleSheet,Text,View,useWindowDimensions} from 'react-native';
import type {PDFDocumentLoadingTask,PDFDocumentProxy,RenderTask} from 'pdfjs-dist';
import {AppButton,FeedbackState,LoadingState} from '@/ui/components';
import {color,spacing,typography} from '@/ui/tokens';

export function WebPdfDocument({uri,documentKind='comprobante'}:{uri:string;documentKind?:'comprobante'|'reporte'}){
  const [attempt,setAttempt]=useState(0);
  return <CanvasDocument key={`${uri}:${attempt}`} uri={uri} documentKind={documentKind} onRetry={()=>setAttempt(value=>value+1)}/>;
}
function CanvasDocument({uri,onRetry,documentKind}:{uri:string;onRetry:()=>void;documentKind:'comprobante'|'reporte'}){
  const {width}=useWindowDimensions();const canvas=useRef<HTMLCanvasElement|null>(null);const container=useRef<HTMLDivElement|null>(null);
  const [pdf,setPdf]=useState<PDFDocumentProxy|null>(null);const [loading,setLoading]=useState(true);
  const [rendering,setRendering]=useState(true);const [error,setError]=useState<string|null>(null);
  const [pageNumber,setPageNumber]=useState(1);const [zoom,setZoom]=useState(1);const [text,setText]=useState('');
  useEffect(()=>{
    let active=true;let task:PDFDocumentLoadingTask|undefined;
    void loadWebPdf(uri).then(async loaded=>{
      task=loaded;if(!active){await task.destroy();return;}
      const document=await task.promise;if(active){setPdf(document);setLoading(false);}
    }).catch(()=>{if(active){setError('No se pudo cargar el PDF. Reintenta o descarga el archivo original.');setLoading(false);setRendering(false);}});
    return()=>{active=false;if(task)void task.destroy().catch(()=>undefined);};
  },[uri]);
  useEffect(()=>{
    if(!pdf)return;
    let active=true;let render:RenderTask|undefined;
    void Promise.resolve().then(async()=>{
      if(!active)return;setRendering(true);setText('');
      const page=await pdf.getPage(pageNumber);if(!active)return;
      const element=canvas.current;if(!element)throw new Error('Canvas unavailable');
      const context=element.getContext('2d');if(!context)throw new Error('Canvas context unavailable');
      const original=page.getViewport({scale:1});const fit=Math.min(1.5,Math.max(200,container.current?.clientWidth??width-2*spacing.md)/original.width);
      const viewport=page.getViewport({scale:fit*zoom});const ratio=Math.min(window.devicePixelRatio||1,2);
      element.width=Math.floor(viewport.width*ratio);element.height=Math.floor(viewport.height*ratio);
      element.style.width=`${Math.floor(viewport.width)}px`;element.style.height=`${Math.floor(viewport.height)}px`;
      render=page.render({canvas:element,canvasContext:context,viewport,transform:ratio===1?undefined:[ratio,0,0,ratio,0,0]});
      const results=await Promise.all([render.promise,page.getTextContent()]);
      if(active){setText(results[1].items.map(item=>'str' in item?`${item.str}${item.hasEOL?'\n':' '}`:'').join(''));setRendering(false);}
    }).catch(()=>{if(active){setError(`No se pudo mostrar esta página. Reintenta la lectura del ${documentKind}.`);setRendering(false);}});
    return()=>{active=false;render?.cancel();};
  },[pdf,pageNumber,zoom,width,documentKind]);
  const blocked=loading||rendering||Boolean(error);
  return <View style={styles.viewer}>
    {pdf?<><View style={styles.controls}><AppButton label="Anterior" accessibilityLabel="Página anterior" tone="secondary" disabled={blocked||pageNumber===1} onPress={()=>{setRendering(true);setPageNumber(value=>value-1);}}/><Text accessibilityLabel={`Página ${pageNumber} de ${pdf.numPages}`} style={styles.text}>{pageNumber} / {pdf.numPages}</Text><AppButton label="Siguiente" accessibilityLabel="Página siguiente" tone="secondary" disabled={blocked||pageNumber===pdf.numPages} onPress={()=>{setRendering(true);setPageNumber(value=>value+1);}}/></View><View style={styles.controls}><AppButton label="Alejar" accessibilityLabel="Alejar PDF" tone="secondary" disabled={blocked||zoom<=0.5} onPress={()=>{setRendering(true);setZoom(value=>Math.max(0.5,value-0.25));}}/><Text style={styles.text}>{Math.round(zoom*100)} %</Text><AppButton label="Ampliar" accessibilityLabel="Ampliar PDF" tone="secondary" disabled={blocked||zoom>=3} onPress={()=>{setRendering(true);setZoom(value=>Math.min(3,value+0.25));}}/></View></>:null}
    {loading||rendering&&!error?<LoadingState label={loading?'Cargando documento PDF':`Mostrando página del ${documentKind}`}/>:null}
    {error?<FeedbackState title="PDF no disponible" message={error} tone="error" actionLabel="Reintentar lectura PDF" onAction={onRetry}/>:null}
    <div ref={container} style={{scrollbarGutter:'stable',flex:1,minHeight:0,minWidth:0,overflow:'auto',width:'100%',backgroundColor:color.surfaceRaised}}>
      <canvas ref={canvas} role="img" aria-label={`Página ${pageNumber} del ${documentKind}`} style={{display:error?'none':'block',visibility:loading||rendering?'hidden':'visible',margin:'0 auto'}}/>
    </div>
    {text&&!error?<details style={{fontFamily:'system-ui, sans-serif',fontSize:typography.bodySmall.fontSize,color:color.textPrimary,maxHeight:200,overflow:'auto'}}><summary style={{padding:spacing.sm,cursor:'pointer'}}>Leer texto de esta página</summary><pre style={{whiteSpace:'pre-wrap',fontFamily:'inherit',fontSize:typography.bodySmall.fontSize,lineHeight:1.5,margin:spacing.sm}}>{text}</pre></details>:null}
  </View>;
}
const styles=StyleSheet.create({viewer:{flex:1,minHeight:0,gap:spacing.sm},controls:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'center',gap:spacing.sm},text:{color:color.textPrimary,...typography.bodySmall}});
