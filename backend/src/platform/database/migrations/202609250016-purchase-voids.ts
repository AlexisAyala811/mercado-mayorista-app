import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchaseVoids1790294400016 implements MigrationInterface {
  name = 'PurchaseVoids1790294400016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "purchase_settlement_state" AS ENUM ('confirmed', 'voided')`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD COLUMN "state" "purchase_settlement_state" NOT NULL DEFAULT 'confirmed'`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD COLUMN "version" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD COLUMN "void_operation_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD COLUMN "void_reason" varchar(240)`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD COLUMN "voided_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "void_operation_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "void_reason" varchar(240)`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "voided_at" timestamptz`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_purchase_settlements_void_operation" ON "purchase_settlements" ("business_id", "void_operation_id") WHERE "void_operation_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_receptions_void_operation" ON "receptions" ("business_id", "void_operation_id") WHERE "void_operation_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD CONSTRAINT "ck_purchase_settlements_version" CHECK ("version" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" ADD CONSTRAINT "ck_purchase_settlements_void" CHECK (("state" = 'confirmed' AND "void_operation_id" IS NULL AND "void_reason" IS NULL AND "voided_at" IS NULL) OR ("state" = 'voided' AND "void_operation_id" IS NOT NULL AND "void_reason" IS NOT NULL AND btrim("void_reason") <> '' AND "voided_at" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD CONSTRAINT "ck_receptions_void" CHECK (("state" <> 'voided' AND "void_operation_id" IS NULL AND "void_reason" IS NULL AND "voided_at" IS NULL) OR ("state" = 'voided' AND "void_operation_id" IS NOT NULL AND "void_reason" IS NOT NULL AND btrim("void_reason") <> '' AND "voided_at" IS NOT NULL))`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP CONSTRAINT "ck_receptions_void"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP CONSTRAINT "ck_purchase_settlements_void"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP CONSTRAINT "ck_purchase_settlements_version"`,
    );
    await queryRunner.query(`DROP INDEX "uq_receptions_void_operation"`);
    await queryRunner.query(
      `DROP INDEX "uq_purchase_settlements_void_operation"`,
    );
    await queryRunner.query(`ALTER TABLE "receptions" DROP COLUMN "voided_at"`);
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "void_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "void_operation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP COLUMN "voided_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP COLUMN "void_reason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP COLUMN "void_operation_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchase_settlements" DROP COLUMN "state"`,
    );
    await queryRunner.query(`DROP TYPE "purchase_settlement_state"`);
  }
}
