import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CashOperationScope1790294400018 implements MigrationInterface {
  name = 'CashOperationScope1790294400018';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "cash_movements"
      ADD CONSTRAINT "uq_cash_movements_business_category_operation"
      UNIQUE ("business_id", "category", "client_operation_id")`);
    await queryRunner.query(`ALTER TABLE "cash_movements"
      DROP CONSTRAINT "uq_cash_movements_business_operation"`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // Restore the stronger constraint first. PostgreSQL rejects the rollback
    // if valid cross-category UUID reuse exists; no financial rows are removed.
    await queryRunner.query(`ALTER TABLE "cash_movements"
      ADD CONSTRAINT "uq_cash_movements_business_operation"
      UNIQUE ("business_id", "client_operation_id")`);
    await queryRunner.query(`ALTER TABLE "cash_movements"
      DROP CONSTRAINT "uq_cash_movements_business_category_operation"`);
  }
}
