import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SaleVersion1790294400015 implements MigrationInterface {
  name = 'SaleVersion1790294400015';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" ADD COLUMN "version" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "sales" ADD CONSTRAINT "ck_sales_version" CHECK ("version" >= 0)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sales" DROP CONSTRAINT "ck_sales_version"`,
    );
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN "version"`);
  }
}
