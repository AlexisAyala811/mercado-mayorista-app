import 'reflect-metadata';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { operationOverview } from '../dist/reports/operation-overview.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1');
assert.equal(process.env.DATABASE_PORT, '55437');
const output = new URL('../../tmp/operation-overview-counts-20261019.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const at = '2026-10-01T05:00:00Z';
const before = '2026-10-01T04:59:59Z';
const fixtures = {
  receptions: [{ id: 'r', business_id: 'b', provider_id: 'provider' }],
  purchases: [
    { id: 'p', reception_id: 'r', business_id: 'b', state: 'confirmed', created_at: at, liquid_amount_cents: '10000' },
    { id: 'old', reception_id: 'old', business_id: 'b', state: 'confirmed', created_at: before, liquid_amount_cents: '90000' },
    { id: 'void', reception_id: 'void', business_id: 'b', state: 'voided', created_at: at, liquid_amount_cents: '80000' },
    { id: 'foreign', reception_id: 'foreign', business_id: 'other', state: 'confirmed', created_at: at, liquid_amount_cents: '70000' },
  ],
  sacks: [
    { reception_id: 'r', business_id: 'b', net_weight_kg: '10.125', voided_at: null, variety_id: 'v1' },
    { reception_id: 'r', business_id: 'b', net_weight_kg: '20.875', voided_at: null, variety_id: 'v1' },
    { reception_id: 'r', business_id: 'b', net_weight_kg: '999', voided_at: at, variety_id: 'voided-variety' },
    { reception_id: 'r', business_id: 'other', net_weight_kg: '999', voided_at: null, variety_id: 'foreign-variety' },
  ],
  sales: [{ id: 's', business_id: 'b', state: 'confirmed', created_at: at, total_amount_cents: '2500', buyer_id: 'buyer' }],
  lines: [{ sale_id: 's', sacks: 1, weight_kg: '4.250', variety_id: 'v1' }, { sale_id: 's', sacks: 2, weight_kg: '5.750', variety_id: 'v2' }],
  accounts: [
    { source_id: 'p', business_id: 'b', source_type: 'purchase-settlement', kind: 'payable', state: 'open', balance_cents: '7000' },
    { source_id: 'p', business_id: 'b', source_type: 'purchase-settlement', kind: 'payable', state: 'paid', balance_cents: '0' },
    { source_id: 'p', business_id: 'other', source_type: 'purchase-settlement', kind: 'payable', state: 'open', balance_cents: '9000' },
    { source_id: 'old', business_id: 'b', source_type: 'purchase-settlement', kind: 'payable', state: 'open', balance_cents: '11000' },
    { source_id: 's', business_id: 'b', source_type: 'sale', kind: 'receivable', state: 'open', balance_cents: '500' },
  ],
  returns: [
    { business_id: 'b', created_at: at, total_refund_cents: '1250' },
    { business_id: 'other', created_at: at, total_refund_cents: '9999' },
    { business_id: 'b', created_at: before, total_refund_cents: '9999' },
  ],
};
const relations = [
  ['purchase_settlements', 'purchases', 'id text,reception_id text,business_id text,state text,created_at timestamptz,liquid_amount_cents bigint'],
  ['receptions', 'receptions', 'id text,business_id text,provider_id text'],
  ['reception_sacks', 'sacks', 'reception_id text,business_id text,net_weight_kg numeric,voided_at timestamptz,variety_id text'],
  ['sales', 'sales', 'id text,business_id text,state text,created_at timestamptz,total_amount_cents bigint,buyer_id text'],
  ['sale_lines', 'lines', 'sale_id text,sacks integer,weight_kg numeric,variety_id text'],
  ['accounts', 'accounts', 'source_id text,business_id text,source_type text,kind text,state text,balance_cents bigint'],
  ['sale_returns', 'returns', 'business_id text,created_at timestamptz,total_refund_cents bigint'],
];
const prefix = 'WITH ' + relations.map(([table, key, columns]) => `${table} AS (SELECT * FROM jsonb_to_recordset($6::jsonb->'${key}') AS x(${columns}))`).join(', ') + ', selected AS (';
const client = new pg.Client({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD });
try {
  await client.connect(); await client.query('BEGIN READ ONLY');
  assert.equal((await client.query('SHOW transaction_read_only')).rows[0].transaction_read_only, 'on');
  const source = { query: async (sql, args) => {
    assert.match(sql, /WITH selected AS \(/);
    return (await client.query(sql.replace('WITH selected AS (', prefix), [...args, JSON.stringify(fixtures)])).rows;
  } };
  const period = { from: '2026-10-01', to: '2026-10-01' };
  const purchase = await operationOverview(source, 'b', { ...period, operation: 'purchase' });
  assert.equal(purchase.operationCount, '1'); assert.equal(purchase.totalAmountCents, '10000');
  assert.equal(purchase.sacks, '2'); assert.equal(Number(purchase.weightKg), 31);
  assert.equal(purchase.currentBalanceCents, '7000'); assert.equal(purchase.openAccountCount, '1');
  assert.equal(purchase.returnCount, '0');
  assert.equal(purchase.counterpartyCount, '1'); assert.equal(purchase.varietyCount, '1');
  const sale = await operationOverview(source, 'b', { ...period, operation: 'sale' });
  assert.equal(sale.counterpartyCount, '1'); assert.equal(sale.varietyCount, '2');
  assert.equal(sale.operationCount, '1'); assert.equal(sale.totalAmountCents, '2500');
  assert.equal(sale.sacks, '3'); assert.equal(Number(sale.weightKg), 10);
  assert.equal(sale.currentBalanceCents, '500'); assert.equal(sale.returnAmountCents, '1250'); assert.equal(sale.returnCount, '1');
  const empty = await operationOverview(source, 'missing', { ...period, operation: 'sale' });
  for (const key of ['operationCount', 'counterpartyCount', 'varietyCount', 'totalAmountCents', 'sacks', 'currentBalanceCents', 'openAccountCount', 'returnCount', 'returnAmountCents']) assert.equal(empty[key], '0');
  await assert.rejects(operationOverview(source, 'b', { operation: 'sale', from: '2026-11-01', to: '2026-10-01' }));
  await client.query('ROLLBACK');
  const evidence = { checkedAt: new Date().toISOString(), productionQueryUsed: true, readOnly: true, commercialWrites: 0, purchase, sale, emptyBusinessIsZero: true, limaBoundaryChecked: true, separateReturns: true, accountScopeAndNoMultiplication: true };
  await writeFile(output, JSON.stringify(evidence, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ checkedAt: evidence.checkedAt, passed: true, commercialWrites: 0 }));
} finally { await client.end(); }

