import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Buyers1790208000006 implements MigrationInterface {
  name = 'Buyers1790208000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "buyers" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "name" varchar(160) NOT NULL,
        "phone" varchar(32),
        "destination_department" varchar(160),
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_buyers" PRIMARY KEY ("id"),
        CONSTRAINT "fk_buyers_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_buyers_business" ON "buyers" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE UNIQUE INDEX "uq_buyers_active_name_ci"
      ON "buyers" ("business_id", lower("name")) WHERE "is_active" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "buyers"`);
  }
}
