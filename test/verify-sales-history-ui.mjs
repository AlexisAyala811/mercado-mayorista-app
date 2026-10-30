import assert from 'node:assert/strict';
import {readFile, writeFile} from 'node:fs/promises';
import {Client} from 'pg';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
const fixture = JSON.parse(await readFile('../tmp/sales-history-ui-fixture-2026-10-07.json', 'utf8'));
const ids = fixture.operations.map(operation => operation.saleId);
assert.equal(ids.length, 21);
const client = new Client({host:'127.0.0.1',port:55437,user:'mercado_test',database:process.env.DATABASE_NAME,password:process.env.DATABASE_PASSWORD});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  const result = await client.query(`SELECT
    (SELECT count(*)::int FROM sales WHERE id=ANY($1::uuid[]) AND state='voided') AS voided_sales,
    (SELECT count(*)::int FROM cash_movements WHERE source_id=ANY($1::uuid[])) AS cash_movements,
    (SELECT sum(CASE WHEN direction='in' THEN amount_cents ELSE -amount_cents END)::text FROM cash_movements WHERE source_id=ANY($1::uuid[])) AS cash_net_cents,
    (SELECT count(*)::int FROM audit_events WHERE resource_id=ANY($1::uuid[]) AND action='sale.confirmed') AS confirmations,
    (SELECT count(*)::int FROM audit_events WHERE resource_id=ANY($1::uuid[]) AND action='sale.voided') AS reversals,
    (SELECT count(*)::int FROM inventory_movements WHERE source_id=ANY($1::uuid[])) AS inventory_movements,
    (SELECT is_active FROM buyers WHERE id=$2) AS buyer_active,
    (SELECT count(*)::int FROM sales WHERE id=ANY($1::uuid[]) AND (created_at AT TIME ZONE 'America/Lima')::date='2026-10-07'::date) AS lima_date_sales`, [ids, fixture.buyerId]);
  const expected = {voided_sales:21,cash_movements:42,cash_net_cents:'0',confirmations:21,reversals:21,inventory_movements:0,buyer_active:false,lima_date_sales:21};
  assert.deepEqual(result.rows[0], expected);
  await client.query('ROLLBACK');
  const evidence = {passed:true,environment:'isolated local UI test database',participant:fixture.buyerName,...result.rows[0]};
  await writeFile('../tmp/sales-history-financial-verification-2026-10-07.json', JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally { await client.end(); }
