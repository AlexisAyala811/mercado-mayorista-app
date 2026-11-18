// Spec 014: multiplies the operations of a disposable database to measure the
// API with real volume. Each copy repeats every purchase, sale, account and
// payment with new identifiers and dates moved back, so the figures stay
// coherent among themselves.
//
// Only runs on a database whose name contains "test" or "carga". Connection by
// the usual DATABASE_* variables; COPIES sets how many times (default 2000).
//   node backend/test/load/sembrar-volumen.mjs
import pg from 'pg';

const database = process.env.DATABASE_NAME ?? '';
if (!/test|carga/.test(database)) throw new Error('Solo en una base desechable (nombre con "test" o "carga").');
const copies = Number(process.env.COPIES ?? 2000);
const spreadDays = Number(process.env.SPREAD_DAYS ?? 730);

// In the order that their foreign keys need.
const tables = [
  'receptions', 'reception_expected_varieties', 'reception_sacks',
  'purchase_settlements', 'purchase_settlement_lots',
  'sales', 'sale_lines',
  'accounts', 'account_installments', 'account_payments', 'account_payment_allocations',
  'cash_movements', 'freight_entries',
];

const client = new pg.Client({
  database,
  host: process.env.DATABASE_HOST ?? '127.0.0.1',
  password: process.env.DATABASE_PASSWORD,
  port: Number(process.env.DATABASE_PORT ?? 5432),
  user: process.env.DATABASE_USER,
});
await client.connect();
const started = Date.now();
try {
  await client.query('begin');
  // Every identifier of a copied row, to tell them from references to
  // catalogs, users and the business, which stay as they are.
  await client.query('create temp table seed_ids (id uuid primary key) on commit drop');
  for (const table of tables) {
    await client.query(`create temp table seed_${table} on commit drop as select * from ${table}`);
    const { rows } = await client.query(`select 1 from information_schema.columns where table_schema = 'public' and table_name = $1 and column_name = 'id'`, [table]);
    if (rows.length) await client.query(`insert into seed_ids select id from seed_${table} on conflict do nothing`);
  }
  for (const table of tables) {
    const { rows: columns } = await client.query(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and table_name = $1 and is_generated = 'NEVER' order by ordinal_position`, [table]);
    const expressions = columns.map(({ column_name: name, data_type: type }) => {
      const column = `s."${name}"`;
      if (type === 'uuid') {
        // Operation identifiers must stay unique; references to copied rows follow their copy.
        const always = name.endsWith('operation_id');
        const moved = `md5(${column}::text || ':' || k)::uuid`;
        return always ? `case when ${column} is null then null else ${moved} end`
          : `case when ${column} in (select id from seed_ids) then ${moved} else ${column} end`;
      }
      if (type === 'date') return `(${column} - (k % ${spreadDays}))::date`;
      if (type.startsWith('timestamp')) return `${column} - make_interval(days => k % ${spreadDays})`;
      return column;
    });
    const names = columns.map(({ column_name: name }) => `"${name}"`).join(', ');
    const result = await client.query(`insert into ${table} (${names}) select ${expressions.join(', ')} from seed_${table} s cross join generate_series(1, $1::int) k`, [copies]);
    console.log(`${table}: +${result.rowCount}`);
  }
  await client.query('commit');
  await client.query('analyze');
  console.log(`Listo en ${((Date.now() - started) / 1000).toFixed(1)} s con ${copies} copias.`);
} catch (error) {
  await client.query('rollback').catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
