import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_TEST_USERNAME && process.env.MERCADO_TEST_PASSWORD);
assert.match(process.env.MERCADO_TEST_VARIETY ?? '', /^[a-f0-9-]{36}$/);
const base = 'http://127.0.0.1:3000/api/v1';
const variety = process.env.MERCADO_TEST_VARIETY;
const asOf = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
const cutoff = new Date(`${asOf}T00:00:00Z`);
cutoff.setUTCDate(cutoff.getUTCDate() + 1);
const future = cutoff.toISOString().slice(0, 10);
let token;
const request = (path, options = {}) => fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(30000) });
try {
  const login = await request('/auth/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD }) });
  assert.equal(login.status, 201);
  token = (await login.json()).accessToken;
  assert.equal(typeof token, 'string');
  const headers = { Authorization: `Bearer ${token}` };
  const anonymous = await request(`/analytics/readiness?asOf=${asOf}&varietyId=${variety}`);
  assert.equal(anonymous.status, 401);
  const readinessResponse = await request(`/analytics/readiness?asOf=${asOf}&varietyId=${variety}`, { headers });
  assert.equal(readinessResponse.status, 200);
  const result = await readinessResponse.json();
  assert.equal(result.timeZone, 'America/Lima');
  assert.equal(result.weeks.length, 26);
  assert.equal(result.window.minimumSalesPerWeek, 5);
  assert.equal(result.predictionAvailable, false);
  assert.equal(result.weeks.every(week => week.weekEnd < asOf), true);
  assert.equal(result.criteria.find(criterion => criterion.id === 'evaluation').status, 'pending');
  assert.equal(result.criteria.find(criterion => criterion.id === 'review').status, 'pending');
  const futureResponse = await request(`/analytics/readiness?asOf=${future}&varietyId=${variety}`, { headers });
  assert.equal(futureResponse.status, 422);
  const invalidResponse = await request(`/analytics/readiness?asOf=${asOf}&varietyId=invalid`, { headers });
  assert.equal(invalidResponse.status, 400);
  const evidence = { verifiedAt: new Date().toISOString(), database: 'isolated-ui-test', authenticatedMayorista: true, anonymousStatus: anonymous.status, readinessStatus: readinessResponse.status, futureStatus: futureResponse.status, invalidVarietyStatus: invalidResponse.status, window: result.window, sufficientWeeks: result.sufficientWeeks, dataSufficient: result.dataSufficient, predictionAvailable: result.predictionAvailable, assistantAuthorizationTested: false, actualModelEvaluationTested: false, commercialMutations: false };
  await writeFile('../tmp/analytics-readiness-http-2026-10-11.json', JSON.stringify(evidence, null, 2));
  console.log('Analytical readiness HTTP checks passed; no predictions published or commercial operations changed.');
} finally {
  if (token) {
    const logout = await request('/auth/session', { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    assert.equal(logout.status, 204);
  }
}
