import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {isAbsolute,join,relative,resolve,sep} from 'node:path';

const args=process.argv.slice(2);
if(args.length!==0&&(args.length!==2||args[0]!=='--export-root'))throw new Error('Usage: verify-pdfjs-assets.mjs [--export-root directory]');
const project=fileURLToPath(new URL('../',import.meta.url));
const exported=resolve(project,args[1]??'dist');
const withinWorkspace=relative(resolve(project,'..'),exported);
if(withinWorkspace==='..'||withinWorkspace.startsWith(`..${sep}`)||isAbsolute(withinWorkspace))throw new Error('Export root must be inside the project workspace.');
const roots=[['public',join(project,'public')],[relative(project,exported),exported]];

const installed=new URL('../node_modules/pdfjs-dist/',import.meta.url);
const {version}=JSON.parse(await readFile(new URL('package.json',installed),'utf8'));
if(version!=='6.4.299')throw new Error('Unexpected PDF.js version; review the adapter and asset copy script.');
const sources=[['build/pdf.worker.min.mjs','pdf.worker.min.mjs'],['LICENSE','LICENSE']];
async function collect(directory){
  for(const entry of await readdir(new URL(`${directory}/`,installed),{withFileTypes:true})){
    const relative=`${directory}/${entry.name}`;
    if(entry.isDirectory())await collect(relative);
    else if(entry.isFile())sources.push([relative,relative]);
    else throw new Error(`Unexpected non-file PDF.js resource: ${relative}`);
  }
}
for(const directory of ['standard_fonts','cmaps','wasm'])await collect(directory);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
for(const [source,destination] of sources){
  const expected=hash(await readFile(new URL(source,installed)));
  for(const [label,root] of roots){
    const actual=hash(await readFile(join(root,'pdfjs',version,destination)));
    if(actual!==expected)throw new Error(`PDF.js asset differs from installed package: ${label}/${destination}`);
  }
}
for(const [label,root] of roots){
  const manifest=JSON.parse(await readFile(join(root,'pdfjs',version,'asset-version.json'),'utf8'));
  if(manifest.package!=='pdfjs-dist'||manifest.version!==version)throw new Error(`Incorrect PDF.js manifest: ${label}`);
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),version,filesPerRoot:sources.length,roots:roots.map(([label])=>label),sha256MatchesInstalled:true},null,2));
