import type { MigrationInterface, QueryRunner } from 'typeorm';

export class PurchasesInventoryAccounts1790294400010 implements MigrationInterface {
  name = 'PurchasesInventoryAccounts1790294400010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "calculation_basis" AS ENUM ('kilogram', 'sack')`,
    );
    await queryRunner.query(
      `CREATE TYPE "payment_mode" AS ENUM ('cash', 'credit')`,
    );
    await queryRunner.query(
      `CREATE TYPE "inventory_lot_state" AS ENUM ('pending', 'available', 'depleted', 'blocked', 'voided')`,
    );
    await queryRunner.query(
      `CREATE TYPE "inventory_movement_type" AS ENUM ('purchase_in', 'sale_out', 'return_in', 'loss_out', 'adjustment', 'reversal')`,
    );
    await queryRunner.query(
      `CREATE TYPE "account_kind" AS ENUM ('payable', 'receivable')`,
    );
    await queryRunner.query(
      `CREATE TYPE "account_state" AS ENUM ('open', 'paid', 'voided')`,
    );
    await queryRunner.query(
      `CREATE TYPE "installment_state" AS ENUM ('open', 'paid')`,
    );
    await queryRunner.query(
      `CREATE TYPE "cash_direction" AS ENUM ('in', 'out')`,
    );

    await queryRunner.query(`
      CREATE TABLE "purchase_settlements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL, "reception_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "price_basis" "calculation_basis" NOT NULL,
        "unit_price_cents" bigint NOT NULL, "gross_amount_cents" bigint NOT NULL,
        "freight_basis" "calculation_basis", "freight_rate_cents" bigint, "freight_amount_cents" bigint NOT NULL,
        "advances_cents" bigint NOT NULL, "discounts_cents" bigint NOT NULL, "liquid_amount_cents" bigint NOT NULL,
        "payment_mode" "payment_mode" NOT NULL, "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_purchase_settlements" PRIMARY KEY ("id"),
        CONSTRAINT "uq_purchase_settlements_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "uq_purchase_settlements_reception" UNIQUE ("reception_id"),
        CONSTRAINT "fk_purchase_settlements_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchase_settlements_reception" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchase_settlements_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_purchase_settlements_amounts" CHECK (
          "unit_price_cents" > 0 AND "gross_amount_cents" >= 0 AND "freight_amount_cents" >= 0
          AND "advances_cents" >= 0 AND "discounts_cents" >= 0 AND "liquid_amount_cents" >= 0
        ),
        CONSTRAINT "ck_purchase_settlements_freight" CHECK (
          ("freight_basis" IS NULL AND "freight_rate_cents" IS NULL AND "freight_amount_cents" = 0)
          OR ("freight_basis" IS NOT NULL AND "freight_rate_cents" IS NOT NULL AND "freight_rate_cents" >= 0)
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "inventory_lots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL, "reception_id" uuid NOT NULL,
        "variety_id" uuid NOT NULL, "state" "inventory_lot_state" NOT NULL,
        "initial_sacks" integer NOT NULL, "available_sacks" integer NOT NULL,
        "initial_weight_kg" numeric(14,3) NOT NULL, "available_weight_kg" numeric(14,3) NOT NULL,
        "version" integer NOT NULL DEFAULT 0, "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_inventory_lots" PRIMARY KEY ("id"),
        CONSTRAINT "uq_inventory_lots_reception_variety" UNIQUE ("reception_id", "variety_id"),
        CONSTRAINT "fk_inventory_lots_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_lots_reception" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_lots_variety" FOREIGN KEY ("variety_id") REFERENCES "potato_varieties"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_inventory_lots_values" CHECK (
          "initial_sacks" > 0 AND "available_sacks" >= 0 AND "available_sacks" <= "initial_sacks"
          AND "initial_weight_kg" > 0 AND "available_weight_kg" >= 0 AND "available_weight_kg" <= "initial_weight_kg"
          AND "version" >= 0
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_inventory_lots_business_state" ON "inventory_lots" ("business_id", "state")`,
    );

    await queryRunner.query(`
      CREATE TABLE "inventory_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL, "lot_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "type" "inventory_movement_type" NOT NULL,
        "sack_delta" integer NOT NULL, "weight_delta_kg" numeric(14,3) NOT NULL,
        "source_type" varchar(80) NOT NULL, "source_id" uuid NOT NULL, "reason" varchar(240),
        "created_by_user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_inventory_movements" PRIMARY KEY ("id"),
        CONSTRAINT "uq_inventory_movements_operation_lot_type" UNIQUE ("business_id", "client_operation_id", "lot_id", "type"),
        CONSTRAINT "fk_inventory_movements_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_movements_lot" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_inventory_movements_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_inventory_movements_nonzero" CHECK ("sack_delta" <> 0 OR "weight_delta_kg" <> 0),
        CONSTRAINT "ck_inventory_movements_source_nonblank" CHECK (btrim("source_type") <> ''),
        CONSTRAINT "ck_inventory_movements_reason_nonblank" CHECK ("reason" IS NULL OR btrim("reason") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_inventory_movements_lot_time" ON "inventory_movements" ("lot_id", "created_at" DESC)`,
    );

    await queryRunner.query(`
      CREATE TABLE "accounts" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "kind" "account_kind" NOT NULL, "state" "account_state" NOT NULL,
        "source_type" varchar(80) NOT NULL, "source_id" uuid NOT NULL,
        "counterparty_type" varchar(80) NOT NULL, "counterparty_id" uuid NOT NULL,
        "initial_amount_cents" bigint NOT NULL, "balance_cents" bigint NOT NULL, "version" integer NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(), "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_accounts" PRIMARY KEY ("id"),
        CONSTRAINT "uq_accounts_source" UNIQUE ("business_id", "source_type", "source_id"),
        CONSTRAINT "fk_accounts_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_accounts_amounts" CHECK (
          "initial_amount_cents" >= 0 AND "balance_cents" >= 0 AND "balance_cents" <= "initial_amount_cents" AND "version" >= 0
        ),
        CONSTRAINT "ck_accounts_types_nonblank" CHECK (btrim("source_type") <> '' AND btrim("counterparty_type") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_accounts_business_kind_state" ON "accounts" ("business_id", "kind", "state")`,
    );

    await queryRunner.query(`
      CREATE TABLE "account_installments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "account_id" uuid NOT NULL, "due_on" date NOT NULL,
        "initial_amount_cents" bigint NOT NULL, "balance_cents" bigint NOT NULL, "state" "installment_state" NOT NULL,
        CONSTRAINT "pk_account_installments" PRIMARY KEY ("id"),
        CONSTRAINT "fk_account_installments_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_account_installments_amounts" CHECK (
          "initial_amount_cents" > 0 AND "balance_cents" >= 0 AND "balance_cents" <= "initial_amount_cents"
        )
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_account_installments_due" ON "account_installments" ("account_id", "due_on")`,
    );

    await queryRunner.query(`
      CREATE TABLE "account_payments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL, "account_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "amount_cents" bigint NOT NULL, "is_reversal" boolean NOT NULL DEFAULT false,
        "reversed_payment_id" uuid,
        "reason" varchar(240), "created_by_user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_account_payments" PRIMARY KEY ("id"),
        CONSTRAINT "uq_account_payments_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_account_payments_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_account_payments_account" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_account_payments_reversal" FOREIGN KEY ("reversed_payment_id") REFERENCES "account_payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_account_payments_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_account_payments_amount" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_account_payments_reason_nonblank" CHECK ("reason" IS NULL OR btrim("reason") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_account_payments_account_time" ON "account_payments" ("account_id", "created_at" DESC)`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_account_payments_single_reversal"
      ON "account_payments" ("reversed_payment_id") WHERE "reversed_payment_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE "account_payment_allocations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "payment_id" uuid NOT NULL, "installment_id" uuid NOT NULL,
        "amount_cents" bigint NOT NULL,
        CONSTRAINT "pk_account_payment_allocations" PRIMARY KEY ("id"),
        CONSTRAINT "uq_account_payment_allocations" UNIQUE ("payment_id", "installment_id"),
        CONSTRAINT "fk_account_payment_allocations_payment" FOREIGN KEY ("payment_id") REFERENCES "account_payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_account_payment_allocations_installment" FOREIGN KEY ("installment_id") REFERENCES "account_installments"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_account_payment_allocations_amount" CHECK ("amount_cents" > 0)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "cash_movements" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL, "direction" "cash_direction" NOT NULL,
        "category" varchar(80) NOT NULL, "amount_cents" bigint NOT NULL,
        "source_type" varchar(80) NOT NULL, "source_id" uuid NOT NULL,
        "created_by_user_id" uuid NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_cash_movements" PRIMARY KEY ("id"),
        CONSTRAINT "uq_cash_movements_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_cash_movements_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_cash_movements_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_cash_movements_amount" CHECK ("amount_cents" > 0),
        CONSTRAINT "ck_cash_movements_types_nonblank" CHECK (btrim("category") <> '' AND btrim("source_type") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_cash_movements_business_time" ON "cash_movements" ("business_id", "created_at" DESC)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "cash_movements"`);
    await queryRunner.query(`DROP TABLE "account_payment_allocations"`);
    await queryRunner.query(`DROP TABLE "account_payments"`);
    await queryRunner.query(`DROP TABLE "account_installments"`);
    await queryRunner.query(`DROP TABLE "accounts"`);
    await queryRunner.query(`DROP TABLE "inventory_movements"`);
    await queryRunner.query(`DROP TABLE "inventory_lots"`);
    await queryRunner.query(`DROP TABLE "purchase_settlements"`);
    await queryRunner.query(`DROP TYPE "cash_direction"`);
    await queryRunner.query(`DROP TYPE "installment_state"`);
    await queryRunner.query(`DROP TYPE "account_state"`);
    await queryRunner.query(`DROP TYPE "account_kind"`);
    await queryRunner.query(`DROP TYPE "inventory_movement_type"`);
    await queryRunner.query(`DROP TYPE "inventory_lot_state"`);
    await queryRunner.query(`DROP TYPE "payment_mode"`);
    await queryRunner.query(`DROP TYPE "calculation_basis"`);
  }
}
