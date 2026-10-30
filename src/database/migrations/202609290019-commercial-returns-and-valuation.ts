import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CommercialReturnsAndValuation1790640000019
  implements MigrationInterface
{
  name = 'CommercialReturnsAndValuation1790640000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "inventory_lot_valuations" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "business_id" uuid NOT NULL,
      "lot_id" uuid NOT NULL,
      "purchase_settlement_id" uuid NOT NULL,
      "price_basis" "calculation_basis" NOT NULL,
      "unit_price_cents" bigint NOT NULL,
      "gross_cost_cents" bigint NOT NULL,
      "allocated_discount_cents" bigint NOT NULL,
      "net_cost_cents" bigint NOT NULL,
      "initial_sacks" integer NOT NULL,
      "initial_weight_kg" numeric(14,3) NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "pk_inventory_lot_valuations" PRIMARY KEY ("id"),
      CONSTRAINT "uq_inventory_lot_valuations_lot" UNIQUE ("lot_id"),
      CONSTRAINT "ck_inventory_lot_valuations_amounts" CHECK (
        unit_price_cents >= 0 AND gross_cost_cents >= 0 AND
        allocated_discount_cents >= 0 AND net_cost_cents = gross_cost_cents - allocated_discount_cents AND
        initial_sacks >= 0 AND initial_weight_kg >= 0
      ),
      CONSTRAINT "fk_inventory_lot_valuations_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
      CONSTRAINT "fk_inventory_lot_valuations_lot" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id"),
      CONSTRAINT "fk_inventory_lot_valuations_purchase" FOREIGN KEY ("purchase_settlement_id") REFERENCES "purchase_settlements"("id")
    )`);
    await queryRunner.query(`CREATE INDEX "ix_inventory_lot_valuations_business_purchase"
      ON "inventory_lot_valuations" ("business_id", "purchase_settlement_id")`);

    await queryRunner.query(`CREATE TABLE "sale_line_costs" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "business_id" uuid NOT NULL,
      "sale_id" uuid NOT NULL,
      "sale_line_id" uuid NOT NULL,
      "lot_id" uuid NOT NULL,
      "is_determinable" boolean NOT NULL,
      "gross_cost_cents" bigint,
      "allocated_purchase_discount_cents" bigint,
      "net_cost_cents" bigint,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "pk_sale_line_costs" PRIMARY KEY ("id"),
      CONSTRAINT "uq_sale_line_costs_line" UNIQUE ("sale_line_id"),
      CONSTRAINT "ck_sale_line_costs_consistency" CHECK (
        (is_determinable AND gross_cost_cents IS NOT NULL AND allocated_purchase_discount_cents IS NOT NULL AND net_cost_cents = gross_cost_cents - allocated_purchase_discount_cents) OR
        (NOT is_determinable AND gross_cost_cents IS NULL AND allocated_purchase_discount_cents IS NULL AND net_cost_cents IS NULL)
      ),
      CONSTRAINT "fk_sale_line_costs_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
      CONSTRAINT "fk_sale_line_costs_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id"),
      CONSTRAINT "fk_sale_line_costs_line" FOREIGN KEY ("sale_line_id") REFERENCES "sale_lines"("id"),
      CONSTRAINT "fk_sale_line_costs_lot" FOREIGN KEY ("lot_id") REFERENCES "inventory_lots"("id")
    )`);
    await queryRunner.query(`CREATE INDEX "ix_sale_line_costs_business_sale"
      ON "sale_line_costs" ("business_id", "sale_id")`);

    await queryRunner.query(`CREATE TABLE "sale_returns" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "business_id" uuid NOT NULL,
      "sale_id" uuid NOT NULL,
      "client_operation_id" uuid NOT NULL,
      "reason" varchar(240) NOT NULL,
      "merchandise_gross_cents" bigint NOT NULL,
      "allocated_sale_discount_cents" bigint NOT NULL,
      "net_merchandise_refund_cents" bigint NOT NULL,
      "freight_adjustment_cents" bigint NOT NULL,
      "total_refund_cents" bigint NOT NULL,
      "account_credit_cents" bigint NOT NULL,
      "cash_refund_cents" bigint NOT NULL,
      "sale_version_before" integer NOT NULL,
      "sale_version_after" integer NOT NULL,
      "created_by_user_id" uuid NOT NULL,
      "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      CONSTRAINT "pk_sale_returns" PRIMARY KEY ("id"),
      CONSTRAINT "uq_sale_returns_business_operation" UNIQUE ("business_id", "client_operation_id"),
      CONSTRAINT "ck_sale_returns_amounts" CHECK (
        merchandise_gross_cents > 0 AND allocated_sale_discount_cents >= 0 AND
        net_merchandise_refund_cents = merchandise_gross_cents - allocated_sale_discount_cents AND
        freight_adjustment_cents >= 0 AND total_refund_cents = net_merchandise_refund_cents + freight_adjustment_cents AND
        account_credit_cents >= 0 AND cash_refund_cents >= 0 AND
        total_refund_cents = account_credit_cents + cash_refund_cents AND
        sale_version_after = sale_version_before + 1
      ),
      CONSTRAINT "fk_sale_returns_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id"),
      CONSTRAINT "fk_sale_returns_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id"),
      CONSTRAINT "fk_sale_returns_user" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    )`);
    await queryRunner.query(`CREATE INDEX "ix_sale_returns_business_sale_time"
      ON "sale_returns" ("business_id", "sale_id", "created_at")`);

    await queryRunner.query(`CREATE TABLE "sale_return_lines" (
      "id" uuid NOT NULL DEFAULT gen_random_uuid(),
      "sale_return_id" uuid NOT NULL,
      "sale_line_id" uuid NOT NULL,
      "returned_sacks" integer NOT NULL,
      "returned_weight_kg" numeric(14,3) NOT NULL,
      "authorized_gross_cents" bigint NOT NULL,
      "allocated_sale_discount_cents" bigint NOT NULL,
      "net_refund_cents" bigint NOT NULL,
      "gross_cost_reduction_cents" bigint,
      "purchase_discount_reduction_cents" bigint,
      "net_cost_reduction_cents" bigint,
      CONSTRAINT "pk_sale_return_lines" PRIMARY KEY ("id"),
      CONSTRAINT "uq_sale_return_lines_return_line" UNIQUE ("sale_return_id", "sale_line_id"),
      CONSTRAINT "ck_sale_return_lines_amounts" CHECK (
        returned_sacks >= 0 AND returned_weight_kg >= 0 AND (returned_sacks > 0 OR returned_weight_kg > 0) AND
        authorized_gross_cents > 0 AND allocated_sale_discount_cents >= 0 AND
        net_refund_cents = authorized_gross_cents - allocated_sale_discount_cents AND
        ((gross_cost_reduction_cents IS NULL AND purchase_discount_reduction_cents IS NULL AND net_cost_reduction_cents IS NULL) OR
         (gross_cost_reduction_cents >= 0 AND purchase_discount_reduction_cents >= 0 AND net_cost_reduction_cents = gross_cost_reduction_cents - purchase_discount_reduction_cents))
      ),
      CONSTRAINT "fk_sale_return_lines_return" FOREIGN KEY ("sale_return_id") REFERENCES "sale_returns"("id"),
      CONSTRAINT "fk_sale_return_lines_line" FOREIGN KEY ("sale_line_id") REFERENCES "sale_lines"("id")
    )`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sale_return_lines"`);
    await queryRunner.query(`DROP INDEX "ix_sale_returns_business_sale_time"`);
    await queryRunner.query(`DROP TABLE "sale_returns"`);
    await queryRunner.query(`DROP INDEX "ix_sale_line_costs_business_sale"`);
    await queryRunner.query(`DROP TABLE "sale_line_costs"`);
    await queryRunner.query(`DROP INDEX "ix_inventory_lot_valuations_business_purchase"`);
    await queryRunner.query(`DROP TABLE "inventory_lot_valuations"`);
  }
}
