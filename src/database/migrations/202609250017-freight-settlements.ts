import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FreightSettlements1790294400017 implements MigrationInterface {
  name = 'FreightSettlements1790294400017';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "freight_operation_type" AS ENUM ('purchase', 'sale')`,
    );
    await queryRunner.query(
      `CREATE TYPE "freight_entry_state" AS ENUM ('pending', 'settled', 'voided')`,
    );
    await queryRunner.query(`
      CREATE TABLE "freight_settlements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "settled_on" date NOT NULL,
        "total_amount_cents" bigint NOT NULL, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_freight_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "uq_freight_settlements_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_freight_settlements_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_freight_settlements_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_freight_settlements_amount" CHECK ("total_amount_cents" > 0)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "freight_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "operation_type" "freight_operation_type" NOT NULL, "operation_id" uuid NOT NULL,
        "carrier_id" uuid, "basis" "calculation_basis" NOT NULL, "rate_cents" bigint NOT NULL,
        "derived_sacks" integer NOT NULL, "derived_weight_kg" numeric(14,3) NOT NULL,
        "amount_cents" bigint NOT NULL, "state" "freight_entry_state" NOT NULL,
        "settlement_id" uuid, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_freight_entries" PRIMARY KEY ("id"),
        CONSTRAINT "uq_freight_entries_source" UNIQUE ("business_id", "operation_type", "operation_id"),
        CONSTRAINT "fk_freight_entries_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_freight_entries_carrier" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_freight_entries_settlement" FOREIGN KEY ("settlement_id") REFERENCES "freight_settlements"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_freight_entries_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_freight_entries_values" CHECK ("rate_cents" >= 0 AND "derived_sacks" > 0 AND "derived_weight_kg" > 0 AND "amount_cents" > 0),
        CONSTRAINT "ck_freight_entries_state" CHECK (
          ("state" = 'pending' AND "settlement_id" IS NULL)
          OR ("state" = 'settled' AND "settlement_id" IS NOT NULL)
          OR ("state" = 'voided' AND "settlement_id" IS NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_freight_entries_business_state" ON "freight_entries" ("business_id", "state", "created_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "freight_entries"`);
    await queryRunner.query(`DROP TABLE "freight_settlements"`);
    await queryRunner.query(`DROP TYPE "freight_entry_state"`);
    await queryRunner.query(`DROP TYPE "freight_operation_type"`);
  }
}
