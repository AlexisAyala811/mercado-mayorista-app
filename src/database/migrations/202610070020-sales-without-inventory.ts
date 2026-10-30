import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SalesWithoutInventory1791331200020 implements MigrationInterface {
  name = 'SalesWithoutInventory1791331200020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sale_lines ADD COLUMN variety_id uuid`,
    );
    await queryRunner.query(`
      UPDATE sale_lines sl SET variety_id = l.variety_id
      FROM inventory_lots l, sales s, potato_varieties v
      WHERE sl.lot_id = l.id AND sl.sale_id = s.id
        AND l.business_id = s.business_id AND v.id = l.variety_id
        AND v.business_id = s.business_id
    `);
    // Inconsistent historic relations must fail the transaction, never invent a variety.
    await queryRunner.query(`ALTER TABLE sale_lines
      ALTER COLUMN variety_id SET NOT NULL,
      ALTER COLUMN lot_id DROP NOT NULL,
      ALTER COLUMN lot_version DROP NOT NULL,
      ADD CONSTRAINT fk_sale_lines_variety FOREIGN KEY (variety_id)
        REFERENCES potato_varieties(id) ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE UNIQUE INDEX uq_sale_lines_sale_variety_new
      ON sale_lines(sale_id, variety_id) WHERE lot_id IS NULL`);
    await queryRunner.query(`ALTER TABLE sale_lines ADD CONSTRAINT ck_sale_lines_legacy_reference
      CHECK ((lot_id IS NULL AND lot_version IS NULL) OR
             (lot_id IS NOT NULL AND lot_version IS NOT NULL))`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const independent = await queryRunner.query(
      `SELECT id FROM sale_lines WHERE lot_id IS NULL LIMIT 1`,
      [],
      true,
    );
    if (independent.records.length)
      throw new Error(
        'No se puede revertir: existen ventas independientes sin lote.',
      );
    await queryRunner.query(`ALTER TABLE sale_lines
      ALTER COLUMN lot_id SET NOT NULL,
      ALTER COLUMN lot_version SET NOT NULL,
      DROP CONSTRAINT ck_sale_lines_legacy_reference,
      DROP CONSTRAINT fk_sale_lines_variety`);
    await queryRunner.query(`DROP INDEX uq_sale_lines_sale_variety_new`);
    await queryRunner.query(`ALTER TABLE sale_lines DROP COLUMN variety_id`);
  }
}
