import 'reflect-metadata';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import source from '../dist/database/data-source.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1');
assert.equal(process.env.DATABASE_PORT, '55437');
assert.equal(source.options.synchronize, false);
assert.ok(!source.options.migrationsTransactionMode || source.options.migrationsTransactionMode === 'all');
const artifact = new URL('../../tmp/messaging-ui-qa-migration-20261026.json', import.meta.url);
try { await access(artifact); throw new Error('Preserve previous migration evidence'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const tables=['purchase_settlements','receptions','reception_sacks','sales','sale_lines','sale_line_costs','sale_returns','sale_return_lines','accounts','account_installments','account_payments','account_payment_allocations','cash_movements','receipt_documents'];
async function fingerprints() {
  const result={};
  for (const table of tables) {
    const [row]=await source.query(`SELECT count(*)::int AS count, md5(COALESCE(string_agg(digest, '' ORDER BY digest), '')) AS hash FROM (SELECT md5(row_to_json(t)::text) AS digest FROM "${table}" t) rows`);
    result[table]=row;
  }
  return result;
}
await source.initialize();
try {
  const before=await fingerprints();
  const history=await source.query('SELECT name FROM migrations ORDER BY timestamp, id');
  const applied=new Set(history.map(row=>row.name));
  const pending=source.migrations.filter(migration=>!applied.has(migration.name ?? migration.constructor.name)).map(migration=>migration.name ?? migration.constructor.name);
  assert.ok(pending.length===0 || (pending.length===1 && pending[0]==='Messaging1792972800026'), 'Only reviewed migration 026 may run');
  assert.ok(source.migrations.some(migration=>(migration.name ?? migration.constructor.name)==='Messaging1792972800026'));
  await writeFile(artifact,JSON.stringify({phase:'preflight',at:new Date().toISOString(),pending,before},null,2),{flag:'wx'});
  if(pending.length) await source.runMigrations();
  const after=await fingerprints(); assert.deepEqual(after,before);
  const [table]=await source.query("SELECT to_regclass('public.message_share_attempts')::text AS name");
  assert.equal(table.name,'message_share_attempts');
  const [{count}]=await source.query("SELECT count(*)::int AS count FROM migrations WHERE name='Messaging1792972800026'");assert.equal(count,1);
  const [{rows}]=await source.query('SELECT count(*)::int AS rows FROM message_share_attempts');
  const evidence={phase:'verified',passed:true,at:new Date().toISOString(),pendingBefore:pending,applied026ExactlyOnce:true,commercialTablesUnchanged:tables.length,shareAttempts:rows,before,after};
  await writeFile(artifact,JSON.stringify(evidence,null,2));
  console.log(JSON.stringify({passed:true,applied:pending.length,tablesPreserved:tables.length,shareAttempts:rows}));
} finally { await source.destroy(); }
