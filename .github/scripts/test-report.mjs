// Spec 024: runs Jest and leaves the result where anyone can read it.
//
//   node test-report.mjs --suite backend-unit --out test-results/unit
//     [--coverage coverage/coverage-summary.json] -- <jest command…>
//
// Writes in --out: jest-results.json (Jest itself), summary.json, junit.xml and
// resumen.md. In GitHub Actions it also appends the summary to the run page.
// Exits with Jest's own code, so a failed test still fails the command.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const separator = process.argv.indexOf('--');
if (separator < 0 || separator === process.argv.length - 1) {
  console.error('Uso: test-report.mjs --suite <backend-unit|backend-e2e|app> --out <carpeta> [--coverage <archivo>] -- <comando de Jest>');
  process.exit(2);
}
const options = parseOptions(process.argv.slice(2, separator));
const [command, ...args] = process.argv.slice(separator + 1);
const out = path.resolve(options.out ?? 'test-results');
fs.mkdirSync(out, { recursive: true });
const jsonFile = path.join(out, 'jest-results.json');
fs.rmSync(jsonFile, { force: true });

const started = Date.now();
const run = spawnSync(command, [...args, '--json', `--outputFile=${jsonFile}`], { stdio: 'inherit' });
const exitCode = run.status ?? 1;

if (!fs.existsSync(jsonFile)) {
  console.error(`Jest no dejó resultados en ${jsonFile} (código ${exitCode}).`);
  process.exit(exitCode || 1);
}

const jest = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
const coverage = readCoverage(options.coverage);
const titles = { app: 'App · pruebas unitarias y de pantallas', 'backend-e2e': 'Backend · pruebas e2e en PostgreSQL', 'backend-unit': 'Backend · pruebas unitarias' };
const summary = { suite: options.suite, ...summarize(jest, coverage, titles[options.suite] ?? options.suite ?? 'Pruebas', Date.now() - started) };
fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync(path.join(out, 'junit.xml'), junit(jest, summary.title));
const markdown = renderMarkdown(summary);
fs.writeFileSync(path.join(out, 'resumen.md'), markdown);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');

console.log(`\n${summary.title}: ${summary.tests.passed}/${summary.tests.total} pruebas exitosas, ${summary.tests.failed} fallidas. Resumen en ${path.relative(process.cwd(), path.join(out, 'resumen.md'))}`);
process.exit(exitCode);

function parseOptions(list) {
  const result = {};
  for (let index = 0; index < list.length; index += 2) {
    if (!list[index]?.startsWith('--')) throw new Error(`Opción inesperada: ${list[index]}`);
    result[list[index].slice(2)] = list[index + 1];
  }
  return result;
}

function readCoverage(file) {
  if (!file || !fs.existsSync(file)) return null;
  const total = JSON.parse(fs.readFileSync(file, 'utf8')).total;
  const pick = (key) => ({ covered: total[key].covered, pct: total[key].pct, total: total[key].total });
  return { branches: pick('branches'), functions: pick('functions'), lines: pick('lines'), statements: pick('statements') };
}

// Jest's --json uses assertionResults/name; a testResultsProcessor uses
// testResults/testFilePath. Both are accepted.
function files(jest) {
  return (jest.testResults ?? []).map((file) => ({
    cases: file.assertionResults ?? file.testResults ?? [],
    durationMs: Math.max(0, (file.endTime ?? file.perfStats?.end ?? 0) - (file.startTime ?? file.perfStats?.start ?? 0)),
    message: file.message ?? file.testExecError?.message ?? '',
    path: relative(file.name ?? file.testFilePath ?? ''),
    status: file.status,
  }));
}

function relative(file) {
  return file ? path.relative(process.cwd(), file).split(path.sep).join('/') : '';
}

function summarize(jest, coverage, title, durationMs) {
  const failures = [];
  for (const file of files(jest)) {
    for (const test of file.cases) if (test.status === 'failed') failures.push({ file: file.path, test: [...(test.ancestorTitles ?? []), test.title].join(' › ') });
    if (file.status === 'failed' && file.cases.length === 0) failures.push({ file: file.path, test: 'La suite no pudo ejecutarse' });
  }
  return {
    coverage,
    durationMs,
    failures,
    generatedAt: new Date().toISOString(),
    success: Boolean(jest.success),
    suites: { failed: jest.numFailedTestSuites, passed: jest.numPassedTestSuites, total: jest.numTotalTestSuites },
    tests: { failed: jest.numFailedTests, passed: jest.numPassedTests, skipped: (jest.numPendingTests ?? 0) + (jest.numTodoTests ?? 0), total: jest.numTotalTests },
    title,
  };
}

function renderMarkdown(summary) {
  const lima = new Intl.DateTimeFormat('es-PE', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Lima' }).format(new Date(summary.generatedAt));
  const lines = [
    `## ${summary.title}`,
    '',
    `**Resultado:** ${summary.success ? '✅ todas las pruebas pasaron' : '❌ hay pruebas fallidas'} · **Fecha:** ${lima} (hora de Lima) · **Duración:** ${seconds(summary.durationMs)}`,
    '',
    '| | Total | Exitosas | Fallidas | Omitidas |',
    '| --- | ---: | ---: | ---: | ---: |',
    `| Suites | ${summary.suites.total} | ${summary.suites.passed} | ${summary.suites.failed} | — |`,
    `| Pruebas | ${summary.tests.total} | ${summary.tests.passed} | ${summary.tests.failed} | ${summary.tests.skipped} |`,
  ];
  if (summary.coverage) {
    const c = summary.coverage;
    lines.push('', '| Cobertura | Líneas | Sentencias | Funciones | Ramas |', '| --- | ---: | ---: | ---: | ---: |', `| % | ${c.lines.pct} | ${c.statements.pct} | ${c.functions.pct} | ${c.branches.pct} |`);
  }
  if (summary.failures.length) {
    lines.push('', '### Pruebas fallidas', '');
    for (const failure of summary.failures) lines.push(`- \`${failure.file}\` · ${failure.test}`);
  }
  return lines.join('\n') + '\n';
}

function seconds(ms) {
  return `${(ms / 1000).toFixed(1)} s`;
}

function junit(jest, title) {
  const escape = (text) => String(text ?? '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);
  const strip = (text) => String(text ?? '').replace(/\u001b\[[0-9;]*m/g, '');
  const suites = files(jest).map((file) => {
    const failed = file.cases.filter((test) => test.status === 'failed').length;
    const skipped = file.cases.filter((test) => test.status === 'pending' || test.status === 'todo' || test.status === 'skipped').length;
    const cases = file.cases.map((test) => {
      const name = [...(test.ancestorTitles ?? []), test.title].join(' › ');
      const open = `    <testcase classname="${escape(file.path)}" name="${escape(name)}" time="${((test.duration ?? 0) / 1000).toFixed(3)}"`;
      if (test.status === 'failed') return `${open}>\n      <failure message="${escape(strip(test.failureMessages?.[0]).split('\n')[0])}">${escape(strip((test.failureMessages ?? []).join('\n')))}</failure>\n    </testcase>`;
      if (test.status === 'pending' || test.status === 'todo' || test.status === 'skipped') return `${open}>\n      <skipped/>\n    </testcase>`;
      return `${open}/>`;
    });
    const errors = file.status === 'failed' && file.cases.length === 0 ? 1 : 0;
    const body = errors ? [`    <testcase classname="${escape(file.path)}" name="La suite no pudo ejecutarse" time="0">\n      <error message="La suite no pudo ejecutarse">${escape(strip(file.message))}</error>\n    </testcase>`] : cases;
    return `  <testsuite name="${escape(file.path)}" tests="${file.cases.length + errors}" failures="${failed}" errors="${errors}" skipped="${skipped}" time="${(file.durationMs / 1000).toFixed(3)}">\n${body.join('\n')}\n  </testsuite>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites name="${escape(title)}" tests="${jest.numTotalTests}" failures="${jest.numFailedTests}" errors="${jest.numRuntimeErrorTestSuites ?? 0}">\n${suites.join('\n')}\n</testsuites>\n`;
}
