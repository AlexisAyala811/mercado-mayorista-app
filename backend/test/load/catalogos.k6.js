// Spec 013: read load on the catalogs, to compare the API with the cache on
// (CATALOG_CACHE_TTL_SECONDS=60) and off (=0). Same rules as consultas.k6.js:
// disposable database, credentials by environment, THROTTLE_LIMIT raised.
//   k6 run -e K6_USERNAME=... -e K6_PASSWORD=... backend/test/load/catalogos.k6.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const base = (__ENV.BASE_URL || 'http://127.0.0.1:3100/api/v1').replace(/\/+$/, '');
const users = Number(__ENV.VUS || 20);

export const options = {
  stages: [
    { duration: '10s', target: users },
    { duration: __ENV.HOLD || '1m', target: users },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

export function setup() {
  if (!__ENV.K6_USERNAME || !__ENV.K6_PASSWORD) throw new Error('Faltan K6_USERNAME y K6_PASSWORD.');
  const response = http.post(`${base}/auth/sessions`, JSON.stringify({ password: __ENV.K6_PASSWORD, username: __ENV.K6_USERNAME }), { headers: { 'Content-Type': 'application/json' } });
  if (response.status !== 201) throw new Error(`Inicio de sesión: ${response.status}`);
  return { token: response.json('accessToken') };
}

export default function (data) {
  const params = { headers: { Accept: 'application/json', Authorization: `Bearer ${data.token}` } };
  for (const catalog of ['providers', 'varieties', 'buyers']) {
    const response = http.get(`${base}/catalog/${catalog}?limit=100&offset=0`, { ...params, tags: { name: catalog } });
    check(response, { [`${catalog} responde 200`]: (r) => r.status === 200 });
  }
  sleep(0.2);
}

export function handleSummary(data) {
  const value = (metric, key) => data.metrics[metric]?.values?.[key];
  const ms = (number) => (number === undefined ? 'sin dato' : `${number.toFixed(2)} ms`);
  const lines = [
    `Usuarios concurrentes: ${users}`,
    `Solicitudes: ${value('http_reqs', 'count')} (${(value('http_reqs', 'rate') || 0).toFixed(1)} por segundo)`,
    `Duración promedio: ${ms(value('http_req_duration', 'avg'))} · mediana: ${ms(value('http_req_duration', 'med'))} · p95: ${ms(value('http_req_duration', 'p(95)'))}`,
    `Solicitudes fallidas: ${((value('http_req_failed', 'rate') || 0) * 100).toFixed(2)} %`,
    '',
  ];
  const output = { stdout: lines.join('\n') };
  // The session token that setup() returned never reaches the evidence file.
  const { setup_data: _session, ...evidence } = data;
  if (__ENV.SUMMARY) output[__ENV.SUMMARY] = JSON.stringify(evidence, null, 2);
  return output;
}
