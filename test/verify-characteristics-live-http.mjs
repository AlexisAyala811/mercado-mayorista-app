import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const base = 'http://127.0.0.1:3000/api/v1';
let token;
const call = (path, options = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
try {
  const ready = await call('/health/ready'); assert.equal(ready.status, 200);
  assert.equal((await ready.json()).status, 'ok');
  const login = await call('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201); token = (await login.json()).accessToken; assert.equal(typeof token, 'string');
  const headers = { Authorization: `Bearer ${token}` };
  const catalogTotals = {};
  for (const route of ['/catalog/qualities', '/catalog/origins', '/analytics/filters/qualities', '/analytics/filters/origins']) {
    assert.equal((await call(route)).status, 401);
    const response = await call(`${route}?limit=100&offset=0`, { headers }); assert.equal(response.status, 200);
    const page = await response.json(); assert.equal(page.total, 0); assert.deepEqual(page.items, []); catalogTotals[route] = page.total;
  }
  const period = 'from=2026-10-01&to=2026-10-14';
  const allResponse = await call(`/analytics/series?${period}`, { headers }); assert.equal(allResponse.status, 200);
  const all = await allResponse.json(); assert.equal(all.filters.qualityId, null); assert.equal(all.filters.originId, null);
  const unknownResponse = await call(`/analytics/series?${period}&qualityId=unreported&originId=unreported`, { headers }); assert.equal(unknownResponse.status, 200);
  const unknown = await unknownResponse.json(); assert.deepEqual(unknown.points, all.points); assert.deepEqual(unknown.excluded, all.excluded);
  const knownResponse = await call(`/analytics/series?${period}&qualityId=${randomUUID()}`, { headers }); assert.equal(knownResponse.status, 200); assert.deepEqual((await knownResponse.json()).points, []);
  const invalid = await call(`/analytics/series?${period}&originId=all`, { headers }); assert.equal(invalid.status, 400);
  const evidence = { checkedAt: new Date().toISOString(), apiReady: true, realSessionLogin: true, catalogTotals, anonymousStatus: 401, validSeriesStatus: 200, invalidFilterStatus: 400, legacyUnknownEqualsUnfiltered: true, randomKnownFilterEmpty: true, commercialMutationsExecuted: false };
  await writeFile(new URL('../../tmp/characteristics-live-http-20261014.json', import.meta.url), JSON.stringify(evidence, null, 2)); console.log(JSON.stringify(evidence));
} finally {
  if (token) { const logout = await call('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); assert.equal(logout.status, 204); }
}
