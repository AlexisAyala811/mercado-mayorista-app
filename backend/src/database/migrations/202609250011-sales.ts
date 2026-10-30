import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Sales1790294400011 implements MigrationInterface {
  name = 'Sales1790294400011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "buyers" ADD COLUMN "credit_limit_cents" bigint`,
    );
    await queryRunner.query(`
      ALTER TABLE "buyers" ADD CONSTRAINT "ck_buyers_credit_limit" CHECK ("credit_limit_cents" IS NULL OR "credit_limit_cents" >= 0)
    `);
    await queryRunner.query(
      `CREATE TYPE "sale_state" AS ENUM ('confirmed', 'voided')`,
    );
    await queryRunner.query(`
      CREATE TABLE "sales" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "buyer_id" uuid NOT NULL,
        "destination_department" varchar(160) NOT NULL, "vehicle_id" uuid, "driver_name" varchar(160),
        "state" "sale_state" NOT NULL, "gross_amount_cents" bigint NOT NULL,
        "freight_basis" "calculation_basis", "freight_rate_cents" bigint, "freight_amount_cents" bigint NOT NULL,
        "freight_included_in_total" boolean NOT NULL, "discounts_cents" bigint NOT NULL,
        "total_amount_cents" bigint NOT NULL, "payment_mode" "payment_mode" NOT NULL,
        "void_operation_id" uuid, "voided_at" timestamptz, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_sales" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sales_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_sales_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sales_buyer" FOREIGN KEY ("buyer_id") REFERENCES "buyers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sales_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sales_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_sales_destination_nonblank" CHECK (btrim("destination_department") <> ''),
        CONSTRAINT "ck_sales_driver_nonblank" CHECK ("driver_name" IS NULL OR btrim("driver_name") <> ''),
        CONSTRAINT "ck_sales_amounts" CHECK (
          "gross_amount_cents" >= 0 AND "freight_amount_cents" >= 0 AND "discounts_cents" >= 0 AND "total_amount_cents" >= 0
        ),
        CONSTRAINT "ck_sales_freight" CHECK (
          ("freight_basis" IS NULL AND "freight_rate_cents" IS NULL AND "freight_amount_cents" = 0)
          OR ("freight_basis" IS NOT NULL AND "freight_rate_cents" IS NOT NULL AND "freight_rate_cents" >= 0)
        ),
        CONSTRAINT "ck_sales_void" CHECK (
          ("state" = 'confirmed' AND "void_operation_id" IS NULL AND "voided_at" IS NULL)
          OR ("state" = 'voided' AND "void_operation_id" IS NOT NULL AND "voided_at" IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_sales_business_time" ON "sales" ("business_id", "created_at" DESC)`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_sales_void_operation"
      ON "sales" ("business_id", "void_operation_id") WHERE "void_operation_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "sale_lines" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "sale_id" uuid NOT NULL, "lot_id" uuid NOT NULL,
        "sacks" integer NOT NULL, "weight_kg" numeric(14,3) NOT NULL,
        "price_basis" "calculation_basis" NOT NULL, "unit_price_cents" bigint NOT NULL,
        "subtotal_cents" bigint NOT NULL, "lot_version" integer NOT NULL,
        CONSTRAINT "pk_sale_lines" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sale_lines_sale_lot" UNIQUE ("sale_id", "lot_id"),
        CONSTRAINT "fk_sale_lines_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_sale_lines_lot" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_sale_lines_values" CHECK (
          "sacks" > 0 AND "weight_kg" > 0 AND "unit_price_cents" > 0 AND "subtotal_cents" >= 0 AND "lot_version" >= 0
        )
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sale_lines"`);
    await queryRunner.query(`DROP TABLE "sales"`);
    await queryRunner.query(`DROP TYPE "sale_state"`);
    await queryRunner.query(
      `ALTER TABLE "buyers" DROP CONSTRAINT "ck_buyers_credit_limit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "buyers" DROP COLUMN "credit_limit_cents"`,
    );
  }
}
