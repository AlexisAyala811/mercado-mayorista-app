import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AuditEvents1790208000004 implements MigrationInterface {
  name = 'AuditEvents1790208000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "business_id" uuid,
        "actor_user_id" uuid,
        "action" varchar(100) NOT NULL,
        "resource_type" varchar(80) NOT NULL,
        "resource_id" uuid,
        "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "occurred_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_audit_events" PRIMARY KEY ("id"),
        CONSTRAINT "fk_audit_events_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_audit_events_actor" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_audit_events_business_time" ON "audit_events" ("business_id", "occurred_at" DESC)
    `);
    await queryRunner.query(
      `CREATE INDEX "ix_audit_events_resource" ON "audit_events" ("resource_type", "resource_id")`,
    );
    await queryRunner.query(`
      CREATE FUNCTION "prevent_audit_event_mutation"() RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_events are append-only';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_audit_events_append_only"
      BEFORE UPDATE OR DELETE ON "audit_events"
      FOR EACH ROW EXECUTE FUNCTION "prevent_audit_event_mutation"()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "audit_events"`);
    await queryRunner.query(`DROP FUNCTION "prevent_audit_event_mutation"`);
  }
}
