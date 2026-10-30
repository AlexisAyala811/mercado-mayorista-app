import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AnalyticsEvaluations1791763200021 implements MigrationInterface {
  name = 'AnalyticsEvaluations1791763200021';
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE analytics_evaluations (
      id uuid PRIMARY KEY, business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
      variety_id uuid NOT NULL REFERENCES potato_varieties(id) ON DELETE RESTRICT,
      client_operation_id uuid NOT NULL, as_of date NOT NULL,
      algorithm_version varchar(80) NOT NULL, inputs_hash char(64) NOT NULL,
      evidence jsonb NOT NULL, created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      retain_until timestamptz NOT NULL DEFAULT (now() + interval '5 years'),
      CONSTRAINT uq_analytics_evaluations_operation UNIQUE(business_id,client_operation_id),
      CONSTRAINT ck_analytics_evaluations_retention CHECK(retain_until >= created_at + interval '5 years'),
      CONSTRAINT ck_analytics_evaluations_hash CHECK(inputs_hash ~ '^[a-f0-9]{64}$'),
      CONSTRAINT ck_analytics_evaluations_evidence CHECK(jsonb_typeof(evidence)='object')
    )`);
    await queryRunner.query('CREATE INDEX ix_analytics_evaluations_business_variety ON analytics_evaluations(business_id,variety_id,created_at DESC,id DESC)');
    await queryRunner.query(`CREATE FUNCTION prevent_analytics_evaluation_mutation() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'analytics_evaluations are append-only'; END;
      $$ LANGUAGE plpgsql`);
    await queryRunner.query(`CREATE TRIGGER trg_analytics_evaluations_append_only BEFORE UPDATE OR DELETE
      ON analytics_evaluations FOR EACH ROW EXECUTE FUNCTION prevent_analytics_evaluation_mutation()`);
    await queryRunner.query(`CREATE TRIGGER trg_analytics_evaluations_no_truncate BEFORE TRUNCATE
      ON analytics_evaluations FOR EACH STATEMENT EXECUTE FUNCTION prevent_analytics_evaluation_mutation()`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await queryRunner.query('SELECT id FROM analytics_evaluations LIMIT 1', [], true);
    if (rows.records.length) throw new Error('No se puede revertir: existen evaluaciones conservadas.');
    await queryRunner.query('DROP TABLE analytics_evaluations');
    await queryRunner.query('DROP FUNCTION prevent_analytics_evaluation_mutation');
  }
}
