import type { MigrationInterface, QueryRunner } from 'typeorm';

// Spec 010: a purchase settlement may have one lot per variety and quality,
// each with its own basis and price, and the wholesaler may bear the freight.
// Existing settlements keep their single basis and price unchanged.
export class PurchaseSettlementLots1793750400029 implements MigrationInterface {
  name = 'PurchaseSettlementLots1793750400029';

  async up(runner: QueryRunner): Promise<void> {
    await runner.query(
      `CREATE TYPE "freight_charge_party" AS ENUM ('provider', 'wholesaler')`,
    );
    await runner.query(`
      ALTER TABLE "purchase_settlements"
        ADD COLUMN "freight_charged_to" "freight_charge_party" NOT NULL DEFAULT 'provider',
        ALTER COLUMN "price_basis" DROP NOT NULL,
        ALTER COLUMN "unit_price_cents" DROP NOT NULL,
        ADD CONSTRAINT "ck_purchase_settlements_single_price" CHECK (
          ("price_basis" IS NULL) = ("unit_price_cents" IS NULL)
        ),
        ADD CONSTRAINT "ck_purchase_settlements_freight_party" CHECK (
          "freight_basis" IS NOT NULL OR "freight_charged_to" = 'provider'
        )
    `);
    await runner.query(`
      CREATE TABLE "purchase_settlement_lots" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "settlement_id" uuid NOT NULL,
        "letter" varchar(2) NOT NULL,
        "name" varchar(60),
        "variety_id" uuid NOT NULL,
        "quality_id" uuid,
        "quality_name" varchar(120),
        "price_basis" "calculation_basis" NOT NULL,
        "unit_price_cents" bigint NOT NULL,
        "sacks" integer NOT NULL,
        "net_weight_kg" numeric(14,3) NOT NULL,
        "amount_cents" bigint NOT NULL,
        CONSTRAINT "pk_purchase_settlement_lots" PRIMARY KEY ("id"),
        CONSTRAINT "uq_purchase_settlement_lots_letter" UNIQUE ("settlement_id", "letter"),
        CONSTRAINT "uq_purchase_settlement_lots_group" UNIQUE NULLS NOT DISTINCT ("settlement_id", "variety_id", "quality_id"),
        CONSTRAINT "fk_purchase_settlement_lots_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchase_settlement_lots_settlement" FOREIGN KEY ("settlement_id") REFERENCES "purchase_settlements"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_purchase_settlement_lots_variety" FOREIGN KEY ("variety_id") REFERENCES "potato_varieties"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_purchase_settlement_lots_amounts" CHECK (
          "unit_price_cents" > 0 AND "sacks" > 0 AND "net_weight_kg" > 0 AND "amount_cents" >= 0
        )
      )
    `);
    await runner.query(
      `CREATE INDEX "ix_purchase_settlement_lots_business" ON "purchase_settlement_lots" ("business_id", "settlement_id")`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    // A settlement with lots cannot be expressed with a single price, and
    // settled purchases cannot be deleted, so the rollback refuses instead.
    const [{ lots }] = (await runner.query(
      `SELECT count(*)::int AS lots FROM "purchase_settlement_lots"`,
    )) as Array<{ lots: number }>;
    const [{ wholesaler }] = (await runner.query(
      `SELECT count(*)::int AS wholesaler FROM "purchase_settlements" WHERE "freight_charged_to" = 'wholesaler'`,
    )) as Array<{ wholesaler: number }>;
    if (lots > 0 || wholesaler > 0)
      throw new Error(
        'No se puede revertir: existen compras con lotes o con flete a cargo del Mayorista.',
      );
    await runner.query(`DROP TABLE "purchase_settlement_lots"`);
    await runner.query(`
      ALTER TABLE "purchase_settlements"
        DROP CONSTRAINT "ck_purchase_settlements_freight_party",
        DROP CONSTRAINT "ck_purchase_settlements_single_price",
        ALTER COLUMN "unit_price_cents" SET NOT NULL,
        ALTER COLUMN "price_basis" SET NOT NULL,
        DROP COLUMN "freight_charged_to"
    `);
    await runner.query(`DROP TYPE "freight_charge_party"`);
  }
}
