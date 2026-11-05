import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const configured=process.env.EXPO_PUBLIC_API_URL?.trim();
let valid=false;
try{
  const url=new URL(configured??'');
  valid=['http:','https:'].includes(url.protocol)&&!url.username&&!url.password&&!url.search&&!url.hash&&url.pathname.replace(/\/+$/,'')==='/api/v1';
}catch{/* Report configuration failure without exposing the supplied value. */}
if(!configured||!valid){
  console.error('Define EXPO_PUBLIC_API_URL explícitamente antes de exportar: URL HTTP/HTTPS del backend con /api/v1, sin credenciales, parámetros ni fragmento.');
  process.exit(1);
}
const result=spawnSync(process.execPath,[fileURLToPath(new URL('../node_modules/expo/bin/cli',import.meta.url)),'export','--platform','web'],{cwd:root,env:{...process.env,EXPO_PUBLIC_API_URL:configured},stdio:'inherit'});
if(result.error){console.error('No se pudo iniciar la exportación web.');process.exit(1);}
process.exit(result.status??1);
