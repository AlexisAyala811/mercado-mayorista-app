// Fails when production dependencies have a high or critical advisory, like
// `npm audit --omit=dev --audit-level=high`, except the advisories listed in
// .github/audit-excepciones.json while their date has not passed. An expired
// exception fails again, so it cannot stay forgotten.
// Run from the package folder: node ../.github/scripts/audit-high.mjs
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const levels = new Set(['high', 'critical']);
const today = new Date().toISOString().slice(0, 10);
const exceptions = JSON.parse(readFileSync(new URL('../audit-excepciones.json', import.meta.url), 'utf8'));
const shape = /^GHSA(-[23456789cfghjmpqrvwx]{4}){3}$/;
for (const item of exceptions) {
  if (!shape.test(item.aviso) || !/^\d{4}-\d{2}-\d{2}$/.test(item.vence) || !item.paquete || !item.motivo)
    throw new Error(`Excepción mal escrita: ${JSON.stringify(item)}`);
}

let output;
try {
  output = execSync('npm audit --omit=dev --json', { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (error) {
  // npm audit exits with 1 when it finds anything; the JSON is still on stdout.
  output = error.stdout;
  if (!output) throw error;
}
const report = JSON.parse(output);
if (report.error) throw new Error(`npm audit no respondió: ${report.error.summary ?? JSON.stringify(report.error)}`);

const advisories = new Map();
for (const [name, entry] of Object.entries(report.vulnerabilities ?? {}))
  for (const via of entry.via)
    if (typeof via === 'object' && levels.has(via.severity))
      advisories.set(via.url, { id: via.url.split('/').pop(), name, severity: via.severity, title: via.title });

const blocking = [];
for (const advisory of advisories.values()) {
  const exception = exceptions.find((item) => item.aviso === advisory.id && item.paquete === advisory.name);
  if (!exception) blocking.push(`${advisory.severity} ${advisory.name} ${advisory.id}: ${advisory.title}`);
  else if (exception.vence < today) blocking.push(`${advisory.severity} ${advisory.name} ${advisory.id}: la excepción venció el ${exception.vence}`);
  else console.log(`Excepción vigente hasta el ${exception.vence}: ${advisory.name} ${advisory.id}`);
}
for (const item of exceptions)
  if (![...advisories.values()].some((advisory) => advisory.id === item.aviso))
    console.log(`La excepción ${item.aviso} ya no hace falta: puede quitarse.`);

if (blocking.length) {
  console.error(`Vulnerabilidades altas o críticas en producción:\n${blocking.map((line) => `- ${line}`).join('\n')}`);
  process.exit(1);
}
console.log(`Sin vulnerabilidades altas sin excepción (${advisories.size} aviso(s) alto(s) revisado(s)).`);
