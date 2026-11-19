// Sprint 2: the same consultations as consultas.k6.js, raising the load step
// by step up to 2000 virtual users, to find where AC01 (p95 < 3 s) stops
// holding. Each request carries the stage it belongs to as a tag, so the
// summary gives the p95 of every step apart.
//   k6 run -e K6_USERNAME=... -e K6_PASSWORD=... -e SUMMARY=escalonada.json backend/test/load/escalonada.k6.js
// The API needs THROTTLE_LIMIT raised, as in consultas.k6.js.
import exec from 'k6/execution';
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = (__ENV.BASE_URL || 'http://127.0.0.1:3100/api/v1').replace(/\/+$/, '');
const hold = __ENV.HOLD || '1m';
const ramp = __ENV.RAMP || '30s';
const levels = (__ENV.NIVELES || '100,250,500,1000,1500,2000').split(',').map(Number);

const stages = levels.flatMap((target) => [
  { duration: ramp, target },
  { duration: hold, target },
]).concat([{ duration: '30s', target: 0 }]);

// A threshold per level makes k6 report that level's p95 and failure rate.
const thresholds = { http_req_duration: ['p(95)<3000'], http_req_failed: ['rate<0.01'] };
for (const level of levels) {
  thresholds[`http_req_duration{nivel:${level}}`] = ['p(95)<3000'];
  thresholds[`http_req_failed{nivel:${level}}`] = ['rate<0.01'];
  thresholds[`http_reqs{nivel:${level}}`] = ['count>=0'];
}

export const options = { stages, thresholds, summaryTrendStats: ['med', 'p(95)', 'max'] };

export function setup() {
  if (!__ENV.K6_USERNAME || !__ENV.K6_PASSWORD) throw new Error('Faltan K6_USERNAME y K6_PASSWORD.');
  const response = http.post(`${base}/auth/sessions`, JSON.stringify({ password: __ENV.K6_PASSWORD, username: __ENV.K6_USERNAME }), { headers: { 'Content-Type': 'application/json' } });
  if (response.status !== 201) throw new Error(`Inicio de sesión: ${response.status}`);
  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  return { from: `${today.slice(0, 8)}01`, to: today, token: response.json('accessToken') };
}

// The level whose hold period is running now; ramps count for the next level.
function currentLevel() {
  const seconds = (Date.now() - exec.scenario.startTime) / 1000;
  const parse = (text) => Number(text.replace(/[^0-9.]/g, '')) * (text.endsWith('m') ? 60 : 1);
  let elapsed = 0;
  for (const level of levels) {
    elapsed += parse(ramp) + parse(hold);
    if (seconds < elapsed) return level;
  }
  return levels.at(-1);
}

export default function (data) {
  const nivel = String(currentLevel());
  const params = (name) => ({ headers: { Accept: 'application/json', Authorization: `Bearer ${data.token}` }, tags: { name, nivel } });
  const period = `from=${data.from}&to=${data.to}`;
  const read = (name, path) => check(http.get(`${base}${path}`, params(name)), { 'responde 200': (r) => r.status === 200 });
  read('resumen de compras', `/reports/operation-overview?operation=purchase&${period}`);
  read('compras por día', `/reports/rows?operation=purchase&${period}&report=daily&limit=20&offset=0`);
  read('historial de compras', `/purchases/history?${period}&limit=20&offset=0`);
  read('totales de ventas', `/sales/summary?${period}`);
  read('proveedores', '/catalog/providers?limit=100&offset=0');
  sleep(2 + Math.random() * 2);
}

export function handleSummary(data) {
  const metric = (name) => data.metrics[name]?.values ?? {};
  const lines = ['Nivel  | Solicitudes | Mediana | p95 | Fallidas | AC01'];
  for (const level of levels) {
    const duration = metric(`http_req_duration{nivel:${level}}`);
    const failed = metric(`http_req_failed{nivel:${level}}`);
    const count = metric(`http_reqs{nivel:${level}}`).count ?? 0;
    const ok = (duration['p(95)'] ?? Infinity) < 3000 && (failed.rate ?? 1) < 0.01;
    lines.push(`${String(level).padStart(5)}  | ${String(count).padStart(11)} | ${Math.round(duration.med ?? 0)} ms | ${Math.round(duration['p(95)'] ?? 0)} ms | ${((failed.rate ?? 0) * 100).toFixed(2)} % | ${ok ? 'cumple' : 'NO cumple'}`);
  }
  const { setup_data: _session, ...evidence } = data;
  const output = { stdout: `${lines.join('\n')}\n` };
  if (__ENV.SUMMARY) output[__ENV.SUMMARY] = JSON.stringify(evidence, null, 2);
  return output;
}
