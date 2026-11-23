import type { MigrationInterface, QueryRunner } from 'typeorm';

export class LogisticsCatalogs1790208000003 implements MigrationInterface {
  name = 'LogisticsCatalogs1790208000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "carriers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "phone" varchar(32),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_carriers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_carriers_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_carriers_business" ON "carriers" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_carriers_active_name_ci"
      ON "carriers" ("business_id", lower("name")) WHERE "is_active" = true
    `);
    await queryRunner.query(`
      CREATE TABLE "vehicles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "plate" varchar(20) NOT NULL,
        "carrier_id" uuid,
        "description" varchar(160),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "fk_vehicles_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_vehicles_carrier" FOREIGN KEY ("carrier_id") REFERENCES "carriers"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_vehicles_business" ON "vehicles" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_vehicles_active_plate_ci"
      ON "vehicles" ("business_id", lower("plate")) WHERE "is_active" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "carriers"`);
  }
}
