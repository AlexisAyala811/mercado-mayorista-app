import 'reflect-metadata';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { loadReportExport } from '../dist/reports/report-export-data.js';
import { readReportRows } from '../dist/reports/report-page.js';
assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1'); assert.equal(process.env.DATABASE_PORT, '55437');
const output = new URL('../../tmp/report-rows-readonly-20261019.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const client = new pg.Client({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), database: process.env.DATABASE_NAME, user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD });
const checks = [];
try {
  await client.connect();
  const source = { transaction: async (level, callback) => {
    assert.equal(level, 'REPEATABLE READ'); await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try { return await callback({ query: async (sql, args) => (await client.query(sql, args)).rows }); }
    finally { await client.query('ROLLBACK'); }
  } };
  const result = await client.query('SELECT business_id FROM users WHERE username=$1', ['mayorista_visual']); assert.equal(result.rowCount, 1);
  const businessId = result.rows[0].business_id;
  for (const operation of ['purchase', 'sale']) for (const report of ['detail', 'variety']) {
    const period = { operation, from: '2026-01-01', to: '2026-10-19' };
    const full = await loadReportExport(source, businessId, period, report);
    const items = report === 'detail' ? full.rows : full.varieties;
    const collected = [];
    for (let offset = 0; offset <= items.length; offset++) {
      const page = await loadReportExport(source, businessId, period, report, { limit: 1, offset });
      assert.equal(page.total, String(items.length));
      const rows = report === 'detail' ? page.rows : page.varieties;
      assert.deepEqual(rows, items.slice(offset, offset + 1)); collected.push(...rows);
    }
    assert.deepEqual(collected, items);
    const foreign = await loadReportExport(source, '00000000-0000-4000-8000-000000000000', period, report, { limit: 20, offset: 0 });
    assert.equal(foreign.total, '0');
    checks.push({ operation, report, total: full.total, matchesFullExport: true, foreignBusinessEmpty: true });
  }
  await source.transaction('REPEATABLE READ', async manager => {
    const sql = `SELECT n::text AS id, '2026-10-19'::text AS date, $1::text AS business, $2::text AS start, $3::text AS finish FROM generate_series(1,135) n`;
    const args = ['synthetic', '2026-10-01', '2026-10-19'];
    const all = await readReportRows(manager, sql, args, 'date, id');
    const ids = [];
    for (let offset = 0; offset < 160; offset += 20) {
      const page = await readReportRows(manager, sql, args, 'date, id', { limit: 20, offset });
      assert.equal(page.total, '135'); ids.push(...page.items.map(row => row.id));
    }
    assert.equal(ids.length, 135); assert.equal(new Set(ids).size, 135);
    assert.deepEqual([...ids].sort(), all.items.map(row => row.id).sort());
  });
  await writeFile(output, JSON.stringify({ at: new Date().toISOString(), passed: true, readOnly: true, syntheticRows: 135, checks }, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ passed: true, syntheticRows: 135, checks }));
} finally { await client.end(); }
