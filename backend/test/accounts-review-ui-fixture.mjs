import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.ok(process.env.MERCADO_TEST_USERNAME && process.env.MERCADO_TEST_PASSWORD);
const file = '../tmp/accounts-review-ui-fixture-2026-10-11.json';
const base = 'http://127.0.0.1:3000/api/v1';
let token;
async function api(path, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(`${base}${path}`, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000) });
  assert.ok(response.ok, `Unexpected HTTP ${response.status} at ${path}`);
  return response.status === 204 ? null : response.json();
}
try {
  token = (await api('/auth/sessions', { username: process.env.MERCADO_TEST_USERNAME, password: process.env.MERCADO_TEST_PASSWORD })).accessToken;
  let fixture;
  try { fixture = JSON.parse(await readFile(file, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (process.argv[2] === 'finish') {
    assert.ok(fixture?.accountId && fixture?.saleId);
    const before = await api(`/accounts/${fixture.accountId}`);
    assert.equal(before.payments.length, 0, 'Review-only scenario must not submit any payment.');
    if (!fixture.finished) {
      assert.equal(before.account.balanceCents, '5000');
      await api(`/sales/${fixture.saleId}/void`, { clientOperationId: fixture.voidOperationId, expectedSaleVersion: 0, reason: 'Cierre de escenario ficticio de consulta y cancelación de revisión de cuenta' });
      await api(`/catalog/buyers/${fixture.buyerId}`, undefined, 'DELETE');
    }
    const after = await api(`/accounts/${fixture.accountId}`);
    assert.equal(after.account.state, 'voided');
    assert.equal(after.account.balanceCents, '0');
    assert.equal(after.account.counterpartyName, fixture.buyerName);
    assert.equal(after.payments.length, 0);
    fixture.finished = true; fixture.reviewOnly = true; fixture.finalBalanceCents = after.account.balanceCents; fixture.historicalNameRetained = true;
    await writeFile(file, JSON.stringify(fixture, null, 2));
    console.log('Review-only UI fixture closed; no payments, zero remaining financial balance, historical name retained.');
  } else {
    assert.equal(process.argv[2], 'prepare');
    if (!fixture) {
      const buyerName = 'QA Cuenta Consulta 20261011';
      const buyer = await api('/catalog/buyers', { name: buyerName, destinationDepartment: 'Lima', creditLimitCents: 10000 });
      const varieties = await api('/catalog/varieties?limit=100&offset=0');
      const variety = varieties.items.find(item => item.isActive !== false);
      assert.ok(variety);
      const due = new Date(); due.setUTCDate(due.getUTCDate() + 7);
      fixture = { buyerId: buyer.id, buyerName, varietyId: variety.id, dueOn: due.toISOString().slice(0, 10), clientOperationId: randomUUID(), voidOperationId: randomUUID(), database: 'isolated-ui-test' };
      await writeFile(file, JSON.stringify(fixture, null, 2));
    }
    assert.equal(fixture.finished, undefined, 'This scenario is already closed.');
    const sale = await api('/sales', { clientOperationId: fixture.clientOperationId, buyerId: fixture.buyerId, destinationDepartment: 'Lima', driverName: fixture.buyerName, discountsCents: 0, freightIncludedInTotal: false, paymentMode: 'credit', installments: [{ dueOn: fixture.dueOn, amountCents: 5000 }], lines: [{ varietyId: fixture.varietyId, sacks: 1, weightKg: '10.000', priceBasis: 'kilogram', unitPriceCents: 500 }] });
    fixture.saleId = sale.id;
    const accounts = await api('/accounts?limit=100&offset=0');
    const account = accounts.items.find(item => item.sourceId === sale.id);
    assert.ok(account); assert.equal(account.balanceCents, '5000'); assert.equal(account.counterpartyName, fixture.buyerName);
    fixture.accountId = account.id;
    await writeFile(file, JSON.stringify(fixture, null, 2));
    console.log('Isolated review-only account prepared; S/50.00, one due date, no initial cash payment.');
  }
} finally {
  if (token) await api('/auth/session', undefined, 'DELETE');
}
