import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionWeighing1790294400009 implements MigrationInterface {
  name = 'ReceptionWeighing1790294400009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "reception_state" RENAME TO "reception_state_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "reception_state" AS ENUM ('draft', 'weighing', 'weighed', 'settled', 'voided')`,
    );
    await queryRunner.query(`
      ALTER TABLE "receptions" ALTER COLUMN "state" TYPE "reception_state"
      USING "state"::text::"reception_state"
    `);
    await queryRunner.query(`DROP TYPE "reception_state_old"`);
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "version" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "close_operation_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "receptions" ADD COLUMN "closed_at" timestamptz`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_receptions_close_operation"
      ON "receptions" ("business_id", "close_operation_id") WHERE "close_operation_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "reception_sacks" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "reception_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL,
        "sequence" integer NOT NULL,
        "variety_id" uuid NOT NULL,
        "gross_weight_kg" numeric(12,3) NOT NULL,
        "tare_kg" numeric(12,3) NOT NULL,
        "net_weight_kg" numeric(12,3) NOT NULL,
        "corrected_from_sack_id" uuid,
        "voided_at" timestamptz,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_reception_sacks" PRIMARY KEY ("id"),
        CONSTRAINT "uq_reception_sacks_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_reception_sacks_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reception_sacks_reception" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reception_sacks_variety" FOREIGN KEY ("variety_id") REFERENCES "potato_varieties"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reception_sacks_correction" FOREIGN KEY ("corrected_from_sack_id") REFERENCES "reception_sacks"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_reception_sacks_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_reception_sacks_sequence" CHECK ("sequence" > 0),
        CONSTRAINT "ck_reception_sacks_weights" CHECK (
          "gross_weight_kg" > 0 AND "tare_kg" >= 0 AND "net_weight_kg" > 0
          AND "net_weight_kg" = "gross_weight_kg" - "tare_kg"
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_reception_sacks_reception" ON "reception_sacks" ("reception_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_reception_sacks_active_sequence"
      ON "reception_sacks" ("reception_id", "sequence") WHERE "voided_at" IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reception_sacks"`);
    await queryRunner.query(`DROP INDEX "uq_receptions_close_operation"`);
    await queryRunner.query(`ALTER TABLE "receptions" DROP COLUMN "closed_at"`);
    await queryRunner.query(
      `ALTER TABLE "receptions" DROP COLUMN "close_operation_id"`,
    );
    await queryRunner.query(`ALTER TABLE "receptions" DROP COLUMN "version"`);
    await queryRunner.query(
      `UPDATE "receptions" SET "state" = 'draft' WHERE "state" <> 'draft'`,
    );
    await queryRunner.query(
      `ALTER TYPE "reception_state" RENAME TO "reception_state_new"`,
    );
    await queryRunner.query(`CREATE TYPE "reception_state" AS ENUM ('draft')`);
    await queryRunner.query(`
      ALTER TABLE "receptions" ALTER COLUMN "state" TYPE "reception_state"
      USING "state"::text::"reception_state"
    `);
    await queryRunner.query(`DROP TYPE "reception_state_new"`);
  }
}
