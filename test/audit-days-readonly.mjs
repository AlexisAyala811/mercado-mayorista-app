import 'reflect-metadata';
import assert from 'node:assert/strict';
import { access, writeFile } from 'node:fs/promises';
import pg from 'pg';
import { AuditService } from '../dist/audit/audit.service.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_ui_test_[a-f0-9]{32}$/);
assert.equal(process.env.DATABASE_HOST, '127.0.0.1');
assert.equal(process.env.DATABASE_PORT, '55437');
const output = new URL('../../tmp/audit-days-readonly-20261026.json', import.meta.url);
await assert.rejects(access(output), { code: 'ENOENT' });
const business = '11111111-1111-4111-8111-111111111111';
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const row = (n, at, businessId = business) => ({ id: uuid(n), business_id: businessId, occurred_at: at, action: 'sale.created', resource_type: 'sale', actor_user_id: null, resource_id: null, details: {} });
const fixtures = [
  row(1, '2026-10-26T04:59:59.999999Z'),
  row(2, '2026-10-26T05:00:00Z'),
  row(3, '2026-10-27T04:59:59.999999Z'),
  row(4, '2026-10-27T05:00:00Z'),
  row(5, '2026-10-26T12:00:00Z', '22222222-2222-4222-8222-222222222222'),
  ...Array.from({ length: 42 }, (_, i) => row(i + 100, '2026-10-26T12:00:00Z')),
];
const client = new pg.Client({ host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT), user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD, database: process.env.DATABASE_NAME });
await client.connect();
try {
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  // Execute the production service's actual predicates against typed CTE rows.
  // This verifies PostgreSQL date/precision behavior without inserting fixtures.
  const repository = { createQueryBuilder() {
    const predicates = []; const parameters = {}; const ordering = []; let offset = 0; let limit = 20;
    const builder = {
      where(sql, values) { predicates.push(sql); Object.assign(parameters, values); return this; },
      andWhere(sql, values) { predicates.push(sql); Object.assign(parameters, values); return this; },
      orderBy(column, direction) { ordering.push(`${column} ${direction}`); return this; },
      addOrderBy(column, direction) { ordering.push(`${column} ${direction}`); return this; },
      skip(value) { offset = value; return this; }, take(value) { limit = value; return this; },
      async getManyAndCount() {
        const columns = { businessId: 'business_id', occurredAt: 'occurred_at', resourceType: 'resource_type' };
        const translate = sql => sql.replace(/event\.(businessId|occurredAt|resourceType)/g, (_, property) => `event.${columns[property]}`);
        const values = [JSON.stringify(fixtures)];
        const where = translate(predicates.join(' AND ')).replace(/(?<!:):([A-Za-z]\w*)\b/g, (_match, name) => { values.push(parameters[name]); return `$${values.length}`; });
        const cte = 'WITH event AS (SELECT * FROM jsonb_to_recordset($1::jsonb) AS e(id uuid, business_id uuid, occurred_at timestamptz, action text, resource_type text, actor_user_id uuid, resource_id uuid, details jsonb))';
        const { rows: count } = await client.query(`${cte} SELECT count(*)::int AS total FROM event WHERE ${where}`, values);
        const { rows } = await client.query(`${cte} SELECT * FROM event WHERE ${where} ORDER BY ${translate(ordering.join(', '))} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, limit, offset]);
        return [rows.map(item => ({ id: item.id, businessId: item.business_id, occurredAt: item.occurred_at, action: item.action, resourceType: item.resource_type, actorUserId: item.actor_user_id, resourceId: item.resource_id, details: item.details })), count[0].total];
      },
    };
    return builder;
  } };
  const service = new AuditService(repository, { getOrThrow: () => 5 });
  const query = { fromDay: '2026-10-26', toDay: '2026-10-26', limit: 20, offset: 0 };
  const pages = [];
  for (const offset of [0, 20, 40]) pages.push(await service.list(business, { ...query, offset }));
  assert.deepEqual(pages.map(page => page.items.length), [20, 20, 4]);
  assert.ok(pages.every(page => page.total === 44));
  const ids = pages.flatMap(page => page.items.map(item => item.id));
  assert.equal(new Set(ids).size, 44);
  assert.equal(ids[0], uuid(3)); assert.equal(ids.at(-1), uuid(2));
  for (const n of [1, 4, 5]) assert.ok(!ids.includes(uuid(n)));
  const beyond = await service.list(business, { ...query, offset: 999 });
  assert.equal(beyond.total, 44); assert.deepEqual(beyond.items, []);
  const empty = await service.list(business, { ...query, fromDay: '2026-11-01', toDay: '2026-11-01' });
  assert.equal(empty.total, 0);
  await client.query('ROLLBACK');
  const evidence = { passed: true, at: new Date().toISOString(), readonly: true, source: 'Production AuditService predicates with typed synthetic CTE rows', total: 44, pageSizes: [20, 20, 4], sameTimestampOrderStable: true, microsecondBeforeDayEndIncluded: true, dayStartIncluded: true, nextDayExcluded: true, foreignBusinessExcluded: true, emptyPageRetainsTotal: true };
  await writeFile(output, JSON.stringify(evidence, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(evidence));
} finally { await client.end(); }
