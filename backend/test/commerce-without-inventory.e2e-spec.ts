import type { DataSource } from 'typeorm';
import { registerCommercialDatabaseScenarios } from './commercial-database-scenarios.js';
import { SalesWithoutInventory1791331200020 } from '../src/database/migrations/202610070020-sales-without-inventory.js';

describe('Commerce without inventory (PostgreSQL)', () => {
  let dataSource: DataSource;
  beforeAll(async () => {
    const module = await import('../src/database/data-source.js');
    dataSource = module.default;
    await dataSource.initialize();
    await dataSource.runMigrations({ transaction: 'all' });
  });
  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });
  registerCommercialDatabaseScenarios(() => dataSource);

  it('backfills historical varieties without changing lot references and refuses destructive reversal', async () => {
    const runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      await runner.query(`
        CREATE TEMP TABLE potato_varieties(id uuid PRIMARY KEY, business_id uuid);
        CREATE TEMP TABLE inventory_lots(id uuid PRIMARY KEY, variety_id uuid, business_id uuid);
        CREATE TEMP TABLE sales(id uuid PRIMARY KEY, business_id uuid);
        CREATE TEMP TABLE sale_lines(id uuid PRIMARY KEY, sale_id uuid, lot_id uuid NOT NULL, lot_version int NOT NULL);
        INSERT INTO potato_varieties VALUES ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
        INSERT INTO sales VALUES ('33333333-3333-4333-8333-333333333333','22222222-2222-4222-8222-222222222222');
        INSERT INTO inventory_lots VALUES ('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
        INSERT INTO sale_lines VALUES ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444',7);
      `);
      const migration = new SalesWithoutInventory1791331200020();
      await migration.up(runner);
      const migrated = await runner.query(
        'SELECT variety_id, lot_id, lot_version FROM sale_lines',
        [],
        true,
      );
      expect(migrated.records[0]).toEqual({
        variety_id: '11111111-1111-4111-8111-111111111111',
        lot_id: '44444444-4444-4444-8444-444444444444',
        lot_version: 7,
      });
      await runner.query(
        `INSERT INTO sale_lines(id,sale_id,variety_id) VALUES ('66666666-6666-4666-8666-666666666666','33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111')`,
      );
      await expect(migration.down(runner)).rejects.toThrow(
        'existen ventas independientes',
      );
    } finally {
      await runner.rollbackTransaction();
      await runner.release();
    }
  });
});
