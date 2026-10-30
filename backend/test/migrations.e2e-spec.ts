import type { DataSource } from 'typeorm';
import { registerAccountDatabaseScenarios } from './accounts-database-scenarios.js';
import { registerCommercialDatabaseScenarios } from './commercial-database-scenarios.js';
import { registerAuthorizationHttpScenarios } from './authorization-http-scenarios.js';

describe('PostgreSQL migrations (e2e)', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    if (
      process.env.NODE_ENV !== 'test' ||
      !process.env.DATABASE_NAME?.toLocaleLowerCase().includes('test')
    ) {
      throw new Error(
        'Database E2E requires NODE_ENV=test and a DATABASE_NAME containing "test".',
      );
    }
    const module = await import('../src/database/data-source.js');
    dataSource = module.default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
  });

  it('applies every registered migration and creates the critical tables', async () => {
    const migrations = (await dataSource.query(
      'SELECT name FROM migrations ORDER BY id',
    )) as Array<{ name: string }>;
    // Compare with the registered list so a new migration does not need a test edit.
    const registered = dataSource.migrations.map((migration) => migration.name);
    expect(migrations.map((migration) => migration.name)).toEqual(registered);
    expect(registered.at(-1)).toBe('Messaging1792972800026');

    const tables = (await dataSource.query(
      `SELECT table_name AS name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])`,
      [
        [
          'users',
          'delegations',
          'receptions',
          'reception_sacks',
          'purchase_settlements',
          'inventory_lots',
          'inventory_movements',
          'sales',
          'accounts',
          'stowage_entries',
          'audit_events',
          'receipt_documents',
          'freight_entries',
          'freight_settlements',
          'inventory_lot_valuations',
          'sale_line_costs',
          'sale_returns',
          'sale_return_lines',
        ],
      ],
    )) as Array<{ name: string }>;
    expect(new Set(tables.map((table) => table.name))).toEqual(
      new Set([
        'users',
        'delegations',
        'receptions',
        'reception_sacks',
        'purchase_settlements',
        'inventory_lots',
        'inventory_movements',
        'sales',
        'accounts',
        'stowage_entries',
        'audit_events',
        'receipt_documents',
        'freight_entries',
        'freight_settlements',
        'inventory_lot_valuations',
        'sale_line_costs',
        'sale_returns',
        'sale_return_lines',
      ]),
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  registerAccountDatabaseScenarios(() => dataSource);
  registerCommercialDatabaseScenarios(() => dataSource);
  registerAuthorizationHttpScenarios(() => dataSource);
});
