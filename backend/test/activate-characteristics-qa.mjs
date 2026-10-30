import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import dataSource from '../dist/database/data-source.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1');
assert.equal(process.env.DATABASE_PORT, '55437');
const mode = process.argv[2]; assert.ok(['preflight', 'apply', 'verify'].includes(mode));
const evidenceFile = new URL('../../tmp/characteristics-qa-activation-20261014.json', import.meta.url);
const expected = ['CommercialCharacteristics1791936000024', 'OperationCharacteristics1791936000025'];
const tables = ['purchase_settlements', 'receptions', 'reception_sacks', 'sales', 'sale_lines', 'sale_line_costs', 'sale_returns', 'sale_return_lines', 'accounts', 'account_installments', 'account_payments', 'account_payment_allocations', 'cash_movements', 'receipt_documents'];
await dataSource.initialize();
try {
  async function snapshot() {
    const result = {};
    for (const table of tables) {
      // The added nullable metadata is the sole allowed row-shape difference.
      const rows = await dataSource.query(`SELECT (to_jsonb(t) - 'quality_id' - 'quality_name' - 'origin_id' - 'origin_name')::text AS row FROM public.${table} t ORDER BY id`);
      result[table] = { count: rows.length, sha256: createHash('sha256').update(JSON.stringify(rows)).digest('hex') };
    }
    return result;
  }
  const applied = (await dataSource.query('SELECT name FROM migrations ORDER BY id')).map(row => row.name);
  const pending = dataSource.migrations.filter(migration => !applied.includes(migration.name)).map(migration => migration.name);
  if (mode === 'preflight') {
    assert.deepEqual(pending, expected);
    const before = await snapshot();
    const receiptHashes = await dataSource.query("SELECT COUNT(*)::int AS count FROM receipt_documents WHERE sha256 <> encode(sha256(content),'hex')");
    assert.equal(receiptHashes[0].count, 0);
    await writeFile(evidenceFile, JSON.stringify({ before: { checkedAt: new Date().toISOString(), applied, pending, tables: before, storedPdfHashesValid: true } }, null, 2));
    console.log(JSON.stringify({ mode, pending, preservedTables: tables.length, storedPdfHashesValid: true }));
  } else {
    const evidence = JSON.parse(await readFile(evidenceFile, 'utf8'));
    assert.deepEqual(await snapshot(), evidence.before.tables, 'Commercial facts changed since preflight; inspect before proceeding.');
    if (mode === 'apply') {
      assert.deepEqual(pending, expected);
      const migrations = await dataSource.runMigrations({ transaction: 'all' });
      assert.deepEqual(migrations.map(item => item.name), expected);
      assert.deepEqual(await snapshot(), evidence.before.tables);
      assert.equal((await dataSource.query('SELECT COUNT(*)::int AS count FROM commercial_characteristics'))[0].count, 0);
      evidence.applied = { checkedAt: new Date().toISOString(), migrations: migrations.map(item => item.name), allCommercialFactsAndPdfBytesUnchanged: true };
    } else {
      assert.deepEqual(pending, []);
      assert.ok(evidence.applied);
      evidence.verified = { checkedAt: new Date().toISOString(), allCommercialFactsAndPdfBytesUnchanged: true };
    }
    await writeFile(evidenceFile, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ mode, allCommercialFactsAndPdfBytesUnchanged: true }));
  }
} finally { await dataSource.destroy(); }
