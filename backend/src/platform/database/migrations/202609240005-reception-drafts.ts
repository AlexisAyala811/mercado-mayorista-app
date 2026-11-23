import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceptionDrafts1790208000005 implements MigrationInterface {
  name = 'ReceptionDrafts1790208000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "reception_state" AS ENUM ('draft')`);
    await queryRunner.query(`
      CREATE TABLE "receptions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "client_operation_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "provider_phone" varchar(32),
        "vehicle_id" uuid,
        "driver_name" varchar(160) NOT NULL,
        "received_on" date NOT NULL,
        "state" "reception_state" NOT NULL,
        "created_by_user_id" uuid NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_receptions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_receptions_business_operation" UNIQUE ("business_id", "client_operation_id"),
        CONSTRAINT "fk_receptions_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_receptions_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_receptions_vehicle" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_receptions_creator" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_receptions_business_received" ON "receptions" ("business_id", "received_on" DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE "reception_expected_varieties" (
        "reception_id" uuid NOT NULL,
        "variety_id" uuid NOT NULL,
        CONSTRAINT "pk_reception_expected_varieties" PRIMARY KEY ("reception_id", "variety_id"),
        CONSTRAINT "fk_reception_expected_reception" FOREIGN KEY ("reception_id") REFERENCES "receptions"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_reception_expected_variety" FOREIGN KEY ("variety_id") REFERENCES "potato_varieties"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_reception_expected_variety" ON "reception_expected_varieties" ("variety_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "reception_expected_varieties"`);
    await queryRunner.query(`DROP TABLE "receptions"`);
    await queryRunner.query(`DROP TYPE "reception_state"`);
  }
}
