import 'reflect-metadata';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { loadReportExport } from '../dist/reports/report-export-data.js';
import { renderReportExport } from '../dist/reports/report-export.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1');
assert.equal(process.env.DATABASE_PORT, '55437');
const output = new URL('../../tmp/report-export-readonly-20261019.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const client = new pg.Client({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD });
const evidence = [];
try {
  await client.connect();
  const identities = await client.query("SELECT u.business_id, b.display_name FROM users u JOIN businesses b ON b.id=u.business_id WHERE u.username=$1", ['mayorista_visual']);
  assert.equal(identities.rowCount, 1);
  const identity = identities.rows[0];
  const source = { transaction: async (level, callback) => {
    assert.equal(level, 'REPEATABLE READ');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      return await callback({ query: async (sql, args) => (await client.query(sql, args)).rows });
    } finally { await client.query('ROLLBACK'); }
  } };
  for (const operation of ['purchase', 'sale']) {
    const period = { operation, from: '2026-01-01', to: '2026-10-19' };
    for (const kind of ['summary', 'detail', 'counterparty', 'variety']) {
      const data = await loadReportExport(source, identity.business_id, period, kind);
      if (kind === 'detail' || kind === 'counterparty') {
        assert.equal(String(data.rows.length), data.overview.operationCount);
        assert.equal(data.rows.reduce((sum, row) => sum + BigInt(row.amount), 0n).toString(), data.overview.totalAmountCents);
        assert.equal(data.rows.reduce((sum, row) => sum + BigInt(row.balance), 0n).toString(), data.overview.currentBalanceCents);
        assert.equal(data.rows.reduce((sum, row) => sum + BigInt(row.sacks), 0n).toString(), data.overview.sacks);
      }
      if (kind === 'variety') {
        assert.equal(data.varieties.reduce((sum, row) => sum + BigInt(row.sacks), 0n).toString(), data.overview.sacks);
        if (operation === 'purchase') assert.ok(data.varieties.every((row) => row.subtotal === null));
      }
      const file = await renderReportExport(data, identity.display_name, kind);
      assert.ok(file.buffer.length > 500);
      assert.equal(file.buffer.subarray(0, kind === 'summary' || kind === 'counterparty' ? 4 : 2).toString(), kind === 'summary' || kind === 'counterparty' ? '%PDF' : 'PK');
      await writeFile(new URL(`../../tmp/qa-${file.filename}`, import.meta.url), file.buffer, { flag: 'wx' });
      evidence.push({ operation, kind, operations: data.overview.operationCount, bytes: file.buffer.length, filename: file.filename });
    }
    const empty = await loadReportExport(source, '00000000-0000-4000-8000-000000000000', period, 'detail');
    assert.equal(empty.rows.length, 0); assert.equal(empty.overview.operationCount, '0');
  }
  await writeFile(output, JSON.stringify({ status: 'passed', at: new Date().toISOString(), readOnly: true, checks: evidence }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ status: 'passed', exports: evidence.length, output: output.pathname }));
} finally { await client.end(); }
