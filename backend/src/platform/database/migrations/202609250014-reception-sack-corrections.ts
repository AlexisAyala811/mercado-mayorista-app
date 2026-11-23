import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionSackCorrections1790294400014 implements MigrationInterface {
  name = 'ReceptionSackCorrections1790294400014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reception_sacks" ADD COLUMN "void_operation_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "reception_sacks" ADD COLUMN "correction_reason" varchar(240)`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_reception_sacks_void_operation"
      ON "reception_sacks" ("business_id", "void_operation_id") WHERE "void_operation_id" IS NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "reception_sacks" ADD CONSTRAINT "ck_reception_sacks_correction_reason"
      CHECK ("correction_reason" IS NULL OR btrim("correction_reason") <> '')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "reception_sacks" DROP CONSTRAINT "ck_reception_sacks_correction_reason"`,
    );
    await queryRunner.query(`DROP INDEX "uq_reception_sacks_void_operation"`);
    await queryRunner.query(
      `ALTER TABLE "reception_sacks" DROP COLUMN "correction_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reception_sacks" DROP COLUMN "void_operation_id"`,
    );
  }
}
