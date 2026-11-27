// Spec 024: dated snapshot of the test results, for the sprint evidence.
//
//   node .github/scripts/test-snapshot.mjs [YYYY-MM-DD]
//
// Reads what `npm run test:report` (and test:report:e2e) left in each project
// and writes test-results/<date>/ at the repository root: one resumen.md for
// backend and app together, plus each JUnit file. Run the reports first.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const date = process.argv[2] ?? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Fecha no válida: ${date}`);

const sources = [
  { dir: 'backend/test-results/unit', junit: 'backend-unitarias-junit.xml' },
  { dir: 'backend/test-results/e2e', junit: 'backend-e2e-junit.xml' },
  { dir: 'app/test-results/unit', junit: 'app-junit.xml' },
];
const found = sources
  .map((source) => ({ ...source, summaryFile: path.join(root, source.dir, 'summary.json') }))
  .filter((source) => fs.existsSync(source.summaryFile))
  .map((source) => ({ ...source, summary: JSON.parse(fs.readFileSync(source.summaryFile, 'utf8')) }));
if (!found.length) {
  console.error('No hay resultados. Corre antes `npm run test:report` en backend/ y app/.');
  process.exit(1);
}

const out = path.join(root, 'test-results', date);
fs.mkdirSync(out, { recursive: true });
for (const source of found) fs.copyFileSync(path.join(root, source.dir, 'junit.xml'), path.join(out, source.junit));

const sum = (pick) => found.reduce((total, source) => total + pick(source.summary), 0);
const total = { failed: sum((s) => s.tests.failed), passed: sum((s) => s.tests.passed), skipped: sum((s) => s.tests.skipped), suites: sum((s) => s.suites.total), tests: sum((s) => s.tests.total) };
const allPassed = found.every((source) => source.summary.success);
const lima = (iso) => new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(iso));
const pct = (coverage, key) => (coverage ? `${coverage[key].pct} %` : '—');

const lines = [
  `# Resultados de pruebas · ${date}`,
  '',
  `> **Spec:** [024](../../specs/024-reporte-resultados-pruebas/spec.md) · **Commit:** \`${process.env.GITHUB_SHA?.slice(0, 7) ?? currentCommit()}\` · **Resultado:** ${allPassed ? '✅ todas las pruebas pasaron' : '❌ hay pruebas fallidas'}`,
  '',
  '## Resumen',
  '',
  '| Conjunto | Suites | Pruebas | Exitosas | Fallidas | Omitidas | Duración | Cobertura de líneas | Cobertura de ramas | Ejecutado |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  ...found.map(({ summary: s }) => `| ${s.title} | ${s.suites.total} | ${s.tests.total} | ${s.tests.passed} | ${s.tests.failed} | ${s.tests.skipped} | ${(s.durationMs / 1000).toFixed(1)} s | ${pct(s.coverage, 'lines')} | ${pct(s.coverage, 'branches')} | ${lima(s.generatedAt)} |`),
  `| **Total** | **${total.suites}** | **${total.tests}** | **${total.passed}** | **${total.failed}** | **${total.skipped}** | | | | |`,
  '',
  'Las pruebas e2e corren contra PostgreSQL 17 y no miden cobertura. La cobertura de cada conjunto cuenta todos los archivos fuente, tengan o no pruebas.',
];
const failures = found.flatMap(({ summary: s }) => s.failures.map((failure) => `- ${s.title}: \`${failure.file}\` · ${failure.test}`));
if (failures.length) lines.push('', '## Pruebas fallidas', '', ...failures);
lines.push('', '## Archivos', '', ...found.map((source) => `- [\`${source.junit}\`](${source.junit}): detalle de ${source.summary.title} en formato JUnit.`), '');
fs.writeFileSync(path.join(out, 'resumen.md'), lines.join('\n'));
console.log(`Foto escrita en ${path.relative(root, out)}: ${total.passed}/${total.tests} pruebas exitosas, ${total.failed} fallidas.`);

function currentCommit() {
  try {
    const head = fs.readFileSync(path.join(root, '.git', 'HEAD'), 'utf8').trim();
    if (!head.startsWith('ref: ')) return head.slice(0, 7);
    const ref = head.slice(5);
    const loose = path.join(root, '.git', ref);
    if (fs.existsSync(loose)) return fs.readFileSync(loose, 'utf8').trim().slice(0, 7);
    const packed = fs.readFileSync(path.join(root, '.git', 'packed-refs'), 'utf8').split('\n').find((line) => line.endsWith(` ${ref}`));
    return packed ? packed.slice(0, 7) : 'sin commit';
  } catch {
    return 'sin commit';
  }
}
