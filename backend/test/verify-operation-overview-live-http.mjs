import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
const output = new URL('../../tmp/operation-overview-live-http-20261017.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const base = 'http://127.0.0.1:3000/api/v1';
const call = (path, options = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
let token;
try {
  assert.equal((await call('/health/ready')).status, 200);
  const suffix = 'from=2026-10-01&to=2026-10-17';
  assert.equal((await call(`/reports/operation-overview?operation=purchase&${suffix}`)).status, 401);
  const login = await call('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201); token = (await login.json()).accessToken;
  assert.equal(typeof token, 'string');
  const headers = { Authorization: `Bearer ${token}` };
  const summaryResponse = await call(`/reports/commercial-summary?${suffix}`, { headers });
  assert.equal(summaryResponse.status, 200); const summary = await summaryResponse.json();
  const results = [];
  for (const operation of ['purchase', 'sale']) {
    const response = await call(`/reports/operation-overview?operation=${operation}&${suffix}`, { headers });
    assert.equal(response.status, 200); const body = await response.json();
    assert.equal(body.operation, operation); assert.deepEqual(body.period, { from: '2026-10-01', to: '2026-10-17' });
    assert.equal(body.balanceScope, 'current-for-period-operations');
    assert.equal(body.returnsScope, 'confirmed-in-period');
    for (const key of ['operationCount', 'totalAmountCents', 'sacks', 'currentBalanceCents', 'openAccountCount', 'returnCount', 'returnAmountCents']) assert.match(body[key], /^\d+$/);
    assert.match(body.weightKg, /^\d+(\.\d+)?$/);
    assert.ok(Number.isFinite(Date.parse(body.generatedAt)));
    const previous = operation === 'purchase' ? summary.purchases : summary.sales;
    assert.equal(body.operationCount, String(previous.count));
    assert.equal(body.totalAmountCents, operation === 'purchase' ? previous.liquidAmountCents : previous.totalAmountCents);
    assert.ok(BigInt(body.currentBalanceCents) <= BigInt(operation === 'purchase' ? summary.accounts.payableBalanceCents : summary.accounts.receivableBalanceCents));
    results.push(body);
  }
  assert.equal((await call(`/reports/operation-overview?operation=all&${suffix}`, { headers })).status, 400);
  assert.equal((await call('/reports/operation-overview?operation=sale&from=2026-02-30&to=2026-03-01', { headers })).status, 400);
  assert.equal((await call('/reports/operation-overview?operation=sale&from=2026-10-17&to=2026-10-01', { headers })).status, 422);
  assert.equal((await call('/auth/session', { method: 'DELETE', headers })).status, 204); token = undefined;
  const evidence = { checkedAt: new Date().toISOString(), authenticatedOverview: true, anonymousRejected: true, invalidOperationAndDatesRejected: true, matchesExistingSummary: true, commercialMutationsExecuted: false, sessionClosed: true, results };
  await writeFile(output, JSON.stringify(evidence, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ checkedAt: evidence.checkedAt, passed: true, commercialMutationsExecuted: false }));
} finally { if (token) assert.equal((await call('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 204); }
