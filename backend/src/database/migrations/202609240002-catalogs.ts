import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Catalogs1790208000002 implements MigrationInterface {
  name = 'Catalogs1790208000002';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "phone" varchar(32),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_providers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_providers_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_providers_business" ON "providers" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_providers_active_name_ci"
      ON "providers" ("business_id", lower("name")) WHERE "is_active" = true
    `);
    await queryRunner.query(`
      CREATE TABLE "potato_varieties" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "name" varchar(120) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_potato_varieties" PRIMARY KEY ("id"),
        CONSTRAINT "fk_potato_varieties_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_potato_varieties_business" ON "potato_varieties" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_potato_varieties_active_name_ci"
      ON "potato_varieties" ("business_id", lower("name")) WHERE "is_active" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "potato_varieties"`);
    await queryRunner.query(`DROP TABLE "providers"`);
  }
}
