import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialIdentity1790208000001 implements MigrationInterface {
  name = 'InitialIdentity1790208000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "user_role" AS ENUM ('wholesaler', 'assistant')`,
    );
    await queryRunner.query(`
      CREATE TABLE "businesses" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "display_name" varchar(160) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_businesses" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid NOT NULL,
        "username" varchar(80) NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "role" "user_role" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_users" PRIMARY KEY ("id"),
        CONSTRAINT "fk_users_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_username_ci" ON "users" (lower("username"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_users_business" ON "users" ("business_id")`,
    );
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "token_hash" char(64) NOT NULL,
        "expires_at" timestamptz NOT NULL,
        "revoked_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "uq_sessions_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "fk_sessions_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_sessions_user" ON "sessions" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "ix_sessions_active" ON "sessions" ("expires_at") WHERE "revoked_at" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "businesses"`);
    await queryRunner.query(`DROP TYPE "user_role"`);
  }
}
