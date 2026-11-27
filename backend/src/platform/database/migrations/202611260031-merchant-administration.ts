import type { MigrationInterface, QueryRunner } from 'typeorm';

// Spec 023: the Administrator manages merchants (a business and its
// wholesaler) without seeing their operations. Adds only:
// - the "admin" role;
// - the kind of business ("merchant", or the single "platform" business that
//   holds the Administrator);
// - per user, the forced password change after a temporary password, the last
//   login and the recent failed attempts, for account support.
// - the record of each Administrator action, so a retried request with the
//   same clientOperationId returns the first result (project rule 6).
// Existing businesses become merchants and existing users keep working.
export class MerchantAdministration1795651200031 implements MigrationInterface {
  name = 'MerchantAdministration1795651200031';

  async up(runner: QueryRunner): Promise<void> {
    // PostgreSQL 12+ accepts this inside the migration transaction as long as
    // the new value is not used in it.
    await runner.query(
      `ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'admin'`,
    );
    await runner.query(
      `CREATE TYPE "business_kind" AS ENUM ('merchant', 'platform')`,
    );
    await runner.query(
      `ALTER TABLE "businesses" ADD COLUMN "kind" "business_kind" NOT NULL DEFAULT 'merchant'`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX "uq_businesses_single_platform" ON "businesses" ("kind") WHERE "kind" = 'platform'`,
    );
    await runner.query(`ALTER TABLE "users"
      ADD COLUMN "must_change_password" boolean NOT NULL DEFAULT false,
      ADD COLUMN "last_login_at" timestamptz NULL,
      ADD COLUMN "failed_login_attempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN "last_failed_login_at" timestamptz NULL,
      ADD CONSTRAINT "ck_users_failed_login_attempts" CHECK ("failed_login_attempts" >= 0)`);
    await runner.query(`CREATE TABLE "admin_operations" (
      "client_operation_id" uuid PRIMARY KEY,
      "admin_user_id" uuid NOT NULL REFERENCES "users"("id"),
      "action" varchar(40) NOT NULL,
      "merchant_business_id" uuid NOT NULL REFERENCES "businesses"("id"),
      "fingerprint" char(64) NOT NULL,
      "result" jsonb NOT NULL,
      "created_at" timestamptz NOT NULL DEFAULT now()
    )`);
    await runner.query(
      `CREATE INDEX "idx_admin_operations_merchant" ON "admin_operations" ("merchant_business_id", "created_at")`,
    );
  }

  async down(runner: QueryRunner): Promise<void> {
    await runner.query(`DROP TABLE IF EXISTS "admin_operations"`);
    await runner.query(`ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "ck_users_failed_login_attempts",
      DROP COLUMN IF EXISTS "last_failed_login_at",
      DROP COLUMN IF EXISTS "failed_login_attempts",
      DROP COLUMN IF EXISTS "last_login_at",
      DROP COLUMN IF EXISTS "must_change_password"`);
    await runner.query(`DROP INDEX IF EXISTS "uq_businesses_single_platform"`);
    await runner.query(`ALTER TABLE "businesses" DROP COLUMN IF EXISTS "kind"`);
    await runner.query(`DROP TYPE IF EXISTS "business_kind"`);
    // PostgreSQL cannot remove a value from an enum; "admin" stays unused.
  }
}
