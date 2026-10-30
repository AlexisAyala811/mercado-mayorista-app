import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';

const output = new URL('../../tmp/account-dates-live-http-20261016.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const base = 'http://127.0.0.1:3000/api/v1';
const call = (path, options = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(15000) });
let token;
try {
  assert.equal((await call('/health/ready')).status, 200);
  assert.equal((await call('/accounts')).status, 401);
  const login = await call('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201);
  token = (await login.json()).accessToken;
  assert.equal(typeof token, 'string');
  const headers = { Authorization: `Bearer ${token}` };
  const response = await call('/accounts?limit=100&offset=0', { headers });
  assert.equal(response.status, 200);
  const page = await response.json();
  const account = page.items.find(item => item.id === 'a2739d1a-dc81-43bf-8023-9ca55cb64bbb');
  assert.ok(account, 'Expected existing scoped QA account');
  assert.equal(account.state, 'voided');
  assert.equal(account.nextDueOn, null);
  assert.ok(account.version > 0);
  assert.equal(account.lastMovementAt, account.updatedAt);
  assert.ok(Number.isFinite(Date.parse(account.lastMovementAt)));
  const detailResponse = await call(`/accounts/${account.id}`, { headers });
  assert.equal(detailResponse.status, 200);
  const detail = await detailResponse.json();
  assert.equal(detail.account.nextDueOn, account.nextDueOn);
  assert.equal(detail.account.lastMovementAt, account.lastMovementAt);
  assert.equal(detail.account.version, account.version);
  const logout = await call('/auth/session', { method: 'DELETE', headers });
  assert.equal(logout.status, 204);
  token = undefined;
  const evidence = { checkedAt: new Date().toISOString(), ready: true, anonymousRejected: true, authenticatedListAndDetail: true, accountId: account.id, state: account.state, nextDueOn: account.nextDueOn, lastMovementAt: account.lastMovementAt, version: account.version, projectionConsistent: true, sessionClosed: true, commercialMutationsExecuted: false };
  await writeFile(output, JSON.stringify(evidence, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(evidence));
} finally {
  if (token) assert.equal((await call('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })).status, 204);
}
