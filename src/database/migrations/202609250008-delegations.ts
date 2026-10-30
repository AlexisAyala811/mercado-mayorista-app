import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Delegations1790294400008 implements MigrationInterface {
  name = 'Delegations1790294400008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "delegations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "assistant_user_id" uuid NOT NULL,
        "authorized_by_user_id" uuid NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "reason" varchar(240),
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_delegations" PRIMARY KEY ("id"),
        CONSTRAINT "fk_delegations_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_delegations_assistant" FOREIGN KEY ("assistant_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_delegations_authorizer" FOREIGN KEY ("authorized_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "ck_delegations_window" CHECK ("expires_at" > "starts_at"),
        CONSTRAINT "ck_delegations_max_duration" CHECK ("expires_at" <= "starts_at" + interval '24 hours'),
        CONSTRAINT "ck_delegations_reason_nonblank" CHECK ("reason" IS NULL OR btrim("reason") <> '')
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_delegations_business_time" ON "delegations" ("business_id", "starts_at", "expires_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_delegations_assistant_time" ON "delegations" ("assistant_user_id", "starts_at", "expires_at")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "delegations"`);
  }
}
