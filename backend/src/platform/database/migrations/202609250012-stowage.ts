import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Stowage1790294400012 implements MigrationInterface {
  name = 'Stowage1790294400012';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "stowage_operation_type" AS ENUM ('purchase', 'sale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "stowage_activity" AS ENUM ('load', 'unload')`,
    );
    await queryRunner.query(
      `CREATE TYPE "stowage_entry_state" AS ENUM ('pending', 'settled')`,
    );
    await queryRunner.query(`
      CREATE TABLE "work_groups" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL, "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_work_groups" PRIMARY KEY ("id"),
        CONSTRAINT "fk_work_groups_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_work_groups_name_nonblank" CHECK (btrim("name") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_work_groups_business" ON "work_groups" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_work_groups_active_name"
      ON "work_groups" ("business_id", lower("name")) WHERE "is_active"
    `);
    await queryRunner.query(`
      CREATE TABLE "stowage_settlements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "settled_on" date NOT NULL,
        "total_amount_cents" bigint NOT NULL, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_stowage_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "uq_stowage_settlements_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_stowage_settlements_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_stowage_settlements_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_stowage_settlements_amount" CHECK ("total_amount_cents" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "stowage_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "work_group_id" uuid NOT NULL,
        "operation_type" "stowage_operation_type" NOT NULL, "operation_id" uuid NOT NULL,
        "activity" "stowage_activity" NOT NULL, "amount_cents" bigint NOT NULL,
        "occurred_on" date NOT NULL, "state" "stowage_entry_state" NOT NULL,
        "settlement_id" uuid, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_stowage_entries" PRIMARY KEY ("id"),
        CONSTRAINT "uq_stowage_entries_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_stowage_entries_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_stowage_entries_group" FOREIGN KEY ("work_group_id") REFERENCES "work_groups"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_stowage_entries_settlement" FOREIGN KEY ("settlement_id") REFERENCES "stowage_settlements"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_stowage_entries_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_stowage_entries_amount" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_stowage_entries_settlement_state" CHECK (
          ("state" = 'pending' AND "settlement_id" IS NULL)
          OR ("state" = 'settled' AND "settlement_id" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_stowage_entries_business_state_date"
      ON "stowage_entries" ("business_id", "state", "occurred_on")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "stowage_entries"`);
    await queryRunner.query(`DROP TABLE "stowage_settlements"`);
    await queryRunner.query(`DROP TABLE "work_groups"`);
    await queryRunner.query(`DROP TYPE "stowage_entry_state"`);
    await queryRunner.query(`DROP TYPE "stowage_activity"`);
    await queryRunner.query(`DROP TYPE "stowage_operation_type"`);
  }
}
