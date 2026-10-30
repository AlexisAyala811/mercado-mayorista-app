import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
const output = new URL('../../tmp/report-export-http-20261019.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const call = (path, options = {}) => fetch(`http://127.0.0.1:3000/api/v1${path}`, { ...options, signal: AbortSignal.timeout(15000) });
const suffix = 'from=2026-10-01&to=2026-10-19';
let token;
try {
  assert.equal((await call(`/reports/export?operation=purchase&report=summary&${suffix}`)).status, 401);
  const login = await call('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201); token = (await login.json()).accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const results = [];
  for (const operation of ['purchase', 'sale']) for (const report of ['summary', 'detail', 'counterparty', 'variety']) {
    const response = await call(`/reports/export?operation=${operation}&report=${report}&${suffix}`, { headers });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const excel = report === 'detail' || report === 'variety';
    assert.ok(response.headers.get('content-type').startsWith(excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf'));
    assert.match(response.headers.get('content-disposition'), /^attachment; filename="reporte-/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.subarray(0, excel ? 2 : 4).toString(), excel ? 'PK' : '%PDF');
    results.push({ operation, report, bytes: bytes.length });
  }
  assert.equal((await call(`/reports/export?operation=sale&report=unknown&${suffix}`, { headers })).status, 400);
  assert.equal((await call('/reports/export?operation=sale&report=summary&from=2026-10-19&to=2026-10-01', { headers })).status, 422);
  assert.equal((await call('/auth/session', { method: 'DELETE', headers })).status, 204); token = undefined;
  await writeFile(output, JSON.stringify({ passed: true, at: new Date().toISOString(), anonymousRejected: true, invalidRequestsRejected: true, commercialMutations: false, results }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, exports: results.length, commercialMutations: false }));
} finally { if (token) await call('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); }
