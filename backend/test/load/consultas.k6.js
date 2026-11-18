// Spec 012 (AC01, AC06): read load on the central API with k6.
//
// Twenty tablets consult the screens that read the most: the report board, the
// purchase and sale histories and the accounts. The thresholds are the measure
// of AC01: 95 % of the queries under 3 seconds and almost no failures.
//
// Run against a disposable database, never production:
//   k6 run -e K6_USERNAME=... -e K6_PASSWORD=... backend/test/load/consultas.k6.js
// Options: -e BASE_URL=http://127.0.0.1:3100/api/v1 -e VUS=40 -e HOLD=2m
//          -e SUMMARY=resultado.json
// The API must start with THROTTLE_LIMIT raised (see specs/012-load-testing).
import http from 'k6/http';
import { check, group, sleep } from 'k6';

const base = (__ENV.BASE_URL || 'http://127.0.0.1:3100/api/v1').replace(/\/+$/, '');
const users = Number(__ENV.VUS || 20);
const hold = __ENV.HOLD || '2m';
// PAUSA multiplies the think time between iterations; 0 sends without pause,
// to find how much one or two instances can serve (spec 016).
const pause = Number(__ENV.PAUSA ?? 1);

export const options = {
  stages: [
    { duration: '30s', target: users },
    { duration: hold, target: users },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    // AC01: 95 % of the central queries in less than 3 seconds.
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

// One sign-in for the whole run: the login is limited to five per minute and
// is not what this test measures.
export function setup() {
  if (!__ENV.K6_USERNAME || !__ENV.K6_PASSWORD) throw new Error('Faltan K6_USERNAME y K6_PASSWORD.');
  const response = http.post(`${base}/auth/sessions`, JSON.stringify({ password: __ENV.K6_PASSWORD, username: __ENV.K6_USERNAME }), { headers: { 'Content-Type': 'application/json' } });
  if (response.status !== 201) throw new Error(`Inicio de sesión: ${response.status}`);
  const today = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
  return { from: `${today.slice(0, 8)}01`, to: today, token: response.json('accessToken') };
}

export default function (data) {
  const params = { headers: { Accept: 'application/json', Authorization: `Bearer ${data.token}` } };
  const period = `from=${data.from}&to=${data.to}`;
  const read = (name, path) => {
    const response = http.get(`${base}${path}`, { ...params, tags: { name } });
    check(response, { [`${name} responde 200`]: (r) => r.status === 200 });
  };

  group('reportes', () => {
    read('resumen de compras', `/reports/operation-overview?operation=purchase&${period}`);
    read('resumen de ventas', `/reports/operation-overview?operation=sale&${period}`);
    read('compras por día', `/reports/rows?operation=purchase&${period}&report=daily&limit=20&offset=0`);
    read('ventas por variedad', `/reports/rows?operation=sale&${period}&report=variety&limit=20&offset=0`);
  });
  sleep(1 * pause);
  group('historiales', () => {
    read('historial de compras', `/purchases/history?${period}&limit=20&offset=0`);
    read('totales de compras', `/purchases/history/summary?${period}`);
    read('totales de ventas', `/sales/summary?${period}`);
  });
  sleep((1 + Math.random() * 2) * pause);
}

// Short text for the terminal and the whole data for the evidence file.
export function handleSummary(data) {
  const value = (metric, key) => data.metrics[metric]?.values?.[key];
  const ms = (number) => (number === undefined ? 'sin dato' : `${Math.round(number)} ms`);
  const passed = Object.values(data.metrics).every((metric) => Object.values(metric.thresholds || {}).every((threshold) => threshold.ok));
  const lines = [
    `Usuarios concurrentes: ${users}`,
    `Solicitudes: ${value('http_reqs', 'count')} (${(value('http_reqs', 'rate') || 0).toFixed(1)} por segundo)`,
    `Duración p95: ${ms(value('http_req_duration', 'p(95)'))} · mediana: ${ms(value('http_req_duration', 'med'))} · máxima: ${ms(value('http_req_duration', 'max'))}`,
    `Solicitudes fallidas: ${((value('http_req_failed', 'rate') || 0) * 100).toFixed(2)} %`,
    `Umbrales de AC01: ${passed ? 'cumplidos' : 'NO cumplidos'}`,
    '',
  ];
  const output = { stdout: lines.join('\n') };
  // k6 copies what setup() returned into the summary: the session token must
  // never reach the evidence file.
  const { setup_data: _session, ...evidence } = data;
  if (__ENV.SUMMARY) output[__ENV.SUMMARY] = JSON.stringify(evidence, null, 2);
  return output;
}
