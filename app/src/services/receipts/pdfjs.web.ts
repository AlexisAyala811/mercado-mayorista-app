export async function loadWebPdf(uri:string,loadLibrary:()=>Promise<typeof import('pdfjs-dist')>=()=>import('pdfjs-dist')){
  if(!uri.startsWith('blob:'))throw new Error('The web viewer requires a locally downloaded PDF.');
  const library=await loadLibrary();
  const assets=new URL(`/pdfjs/${library.version}/`,window.location.origin).href;
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12_000);
  let workerUrl:string;
  try{
    const response=await fetch(`${assets}pdf.worker.min.mjs?v=${library.version}`,{signal:controller.signal,credentials:'omit',cache:'reload'});
    const mime=response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
    if(!response.ok||!['text/javascript','application/javascript','text/ecmascript','application/ecmascript'].includes(mime??''))throw new Error(`The local PDF worker is unavailable or has an invalid MIME type (${response.status}, ${mime??'missing'}).`);
    workerUrl=URL.createObjectURL(await response.blob());
  }finally{clearTimeout(timeout);}
  // Embedded browsers may route fetch correctly while direct module workers fail.
  // Use the same local, versioned worker bytes without a second network import.
  library.GlobalWorkerOptions.workerSrc=workerUrl;
  try{
    const task=library.getDocument({url:uri,standardFontDataUrl:`${assets}standard_fonts/`,cMapUrl:`${assets}cmaps/`,cMapPacked:true,wasmUrl:`${assets}wasm/`});
    const destroy=task.destroy.bind(task);let released=false;
    task.destroy=async()=>{try{await destroy();}finally{if(!released){released=true;URL.revokeObjectURL(workerUrl);}}};
    return task;
  }catch(cause){URL.revokeObjectURL(workerUrl);throw cause;}
}
