// Spec 015: serves the web export in dist/ for the end-to-end tests. Each
// route has its own HTML file (home.html for /home); anything else falls back
// to index.html, as a static host would.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'dist');
const port = Number(process.env.E2E_WEB_PORT ?? 8090);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mjs': 'text/javascript', '.wasm': 'application/wasm' };

function locate(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^[/\\]+/, '');
  const candidates = [clean, `${clean}.html`, join(clean, 'index.html')];
  for (const candidate of candidates) {
    const full = resolve(root, candidate);
    if (!full.startsWith(root)) return null;
    if (existsSync(full) && statSync(full).isFile()) return full;
  }
  return resolve(root, 'index.html');
}

createServer((request, response) => {
  const file = locate(new URL(request.url ?? '/', 'http://localhost').pathname);
  if (!file) { response.writeHead(400).end(); return; }
  response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => console.log(`dist en http://127.0.0.1:${port}`));
