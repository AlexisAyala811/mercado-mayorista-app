import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
const output = new URL('../../tmp/report-rows-http-20261019.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const call = (path, options = {}) => fetch(`http://127.0.0.1:3000/api/v1${path}`, { ...options, signal: AbortSignal.timeout(15000) });
const suffix = 'from=2026-10-01&to=2026-10-19';
let token;
try {
  assert.equal((await call(`/reports/rows?operation=sale&report=detail&${suffix}`)).status, 401);
  const login = await call('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201); token = (await login.json()).accessToken;
  const headers = { Authorization: `Bearer ${token}` };
  const results = [];
  for (const operation of ['purchase', 'sale']) for (const report of ['detail', 'variety']) {
    const query = `/reports/rows?operation=${operation}&report=${report}&${suffix}`;
    const firstResponse = await call(`${query}&limit=1&offset=0`, { headers }); assert.equal(firstResponse.status, 200);
    assert.equal(firstResponse.headers.get('cache-control'), 'private, no-store');
    const first = await firstResponse.json(); assert.equal(first.limit, 1); assert.equal(first.offset, 0);
    assert.equal(first.operation, operation); assert.equal(first.report, report); assert.match(first.total, /^\d+$/);
    assert.ok(Number.isFinite(Date.parse(first.generatedAt))); assert.ok(first.items.length <= 1);
    const all = await (await call(`${query}&limit=100&offset=0`, { headers })).json();
    assert.deepEqual(first.items, all.items.slice(0, 1));
    const beyond = await (await call(`${query}&limit=1&offset=999`, { headers })).json();
    assert.equal(beyond.total, all.total); assert.deepEqual(beyond.items, []);
    results.push({ operation, report, total: all.total, firstPageMatches: true, emptyPageRetainsCount: true });
  }
  for (const query of ['report=summary', 'report=detail&limit=101', 'report=detail&offset=-1', 'report=detail&offset=0.5']) {
    assert.equal((await call(`/reports/rows?operation=sale&${suffix}&${query}`, { headers })).status, 400);
  }
  assert.equal((await call('/auth/session', { method: 'DELETE', headers })).status, 204); token = undefined;
  await writeFile(output, JSON.stringify({ passed: true, at: new Date().toISOString(), anonymousRejected: true, invalidPaginationRejected: true, commercialMutations: false, results }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, results }));
} finally { if (token) await call('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); }
