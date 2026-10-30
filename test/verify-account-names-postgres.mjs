import 'reflect-metadata';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { Client } from 'pg';
import { AccountsService } from '../dist/accounts/accounts.service.js';

assert.match(process.env.DATABASE_NAME ?? '', /^mercado_test_no_inventory_[a-f0-9]{32}$/);
const client = new Client({ host: '127.0.0.1', port: 55437, user: 'mercado_test', database: process.env.DATABASE_NAME, password: process.env.DATABASE_PASSWORD });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('CREATE TEMP TABLE accounts (id uuid PRIMARY KEY, business_id uuid, counterparty_type text, counterparty_id uuid) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE providers (id uuid PRIMARY KEY, business_id uuid, name text, is_active boolean) ON COMMIT DROP');
  await client.query('CREATE TEMP TABLE buyers (id uuid PRIMARY KEY, business_id uuid, name text, is_active boolean) ON COMMIT DROP');
  const a = randomUUID(), b = randomUUID(), p = randomUUID(), foreign = randomUUID(), buyer = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  await client.query('INSERT INTO providers VALUES ($1,$2,$3,false),($4,$5,$6,true)', [p,a,'Proveedor histórico QA',foreign,b,'Proveedor negocio B QA']);
  await client.query('INSERT INTO buyers VALUES ($1,$2,$3,false)', [buyer,a,'Compradora histórica QA']);
  await client.query('INSERT INTO accounts VALUES ($1,$5,\'provider\',$7),($2,$5,\'provider\',$8),($3,$5,\'buyer\',$9),($4,$6,\'provider\',$8)', [...ids,a,b,p,foreign,buyer]);
  const repository = {
    async findAndCount({where}) {
      const result = await client.query('SELECT id, business_id AS "businessId", counterparty_type AS "counterpartyType", counterparty_id AS "counterpartyId" FROM accounts WHERE business_id=$1 ORDER BY id', [where.businessId]);
      return [result.rows, result.rows.length];
    },
    async findOne({where}) {
      const result = await client.query('SELECT id, business_id AS "businessId", counterparty_type AS "counterpartyType", counterparty_id AS "counterpartyId" FROM accounts WHERE business_id=$1 AND id=$2', [where.businessId, where.id]);
      return result.rows[0] ?? null;
    },
  };
  const dataSource = { async query(sql, params) { return (await client.query(sql, params)).rows; } };
  const service = new AccountsService(dataSource, {}, repository, {find: async()=>[]}, {find:async()=>[]});
  const page = await service.list(a,{limit:20,offset:0});
  const byId = new Map(page.items.map(item=>[item.id,item.counterpartyName]));
  assert.equal(page.total,3);
  assert.equal(byId.get(ids[0]),'Proveedor histórico QA');
  assert.equal(byId.get(ids[1]),null,'An inconsistent cross-business link must not expose a name');
  assert.equal(byId.get(ids[2]),'Compradora histórica QA');
  assert.ok(!byId.has(ids[3]));
  assert.equal((await service.get(a,ids[0])).account.counterpartyName,'Proveedor histórico QA');
  await assert.rejects(service.get(a,ids[3]),/Cuenta no encontrada/);
  assert.equal((await service.list(b,{limit:20,offset:0})).items[0].counterpartyName,'Proveedor negocio B QA');
  await client.query('ROLLBACK');
  const evidence = {passed:true,method:'compiled AccountsService projection through PostgreSQL, temporary tables rolled back',historicalInactiveProvider:true,historicalInactiveBuyer:true,crossBusinessReferenceName:null,foreignAccountRejected:true,ownedForeignBusinessQueryAllowed:true,persistedRowsCreated:0,routeAuthorizationTested:false};
  await writeFile('../tmp/account-names-postgres-2026-10-11.json',JSON.stringify(evidence,null,2));
  console.log(JSON.stringify(evidence));
} finally {
  await client.query('ROLLBACK').catch(()=>undefined);
  await client.end();
}
