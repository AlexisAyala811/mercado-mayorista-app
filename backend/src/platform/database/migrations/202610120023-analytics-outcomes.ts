import type { MigrationInterface,QueryRunner } from 'typeorm';
export class AnalyticsOutcomes1791763200023 implements MigrationInterface {
  name='AnalyticsOutcomes1791763200023';
  async up(runner:QueryRunner):Promise<void>{
    await runner.query('ALTER TABLE analytics_publications ADD CONSTRAINT uq_analytics_publication_outcome_reference UNIQUE(business_id,id)');
    await runner.query(`CREATE TABLE analytics_outcomes (
      id uuid PRIMARY KEY,business_id uuid NOT NULL,publication_id uuid NOT NULL,client_operation_id uuid NOT NULL,
      evidence jsonb NOT NULL,created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),retain_until timestamptz NOT NULL DEFAULT(now()+interval '5 years'),
      CONSTRAINT uq_analytics_outcomes_operation UNIQUE(business_id,client_operation_id),
      CONSTRAINT fk_analytics_outcome_publication FOREIGN KEY(business_id,publication_id) REFERENCES analytics_publications(business_id,id) ON DELETE RESTRICT,
      CONSTRAINT ck_analytics_outcome_retention CHECK(retain_until>=created_at+interval '5 years'),
      CONSTRAINT ck_analytics_outcome_evidence CHECK(jsonb_typeof(evidence)='object')
    )`);
    await runner.query('CREATE INDEX ix_analytics_outcomes_publication ON analytics_outcomes(business_id,publication_id,created_at DESC,id DESC)');
    await runner.query(`CREATE FUNCTION prevent_analytics_outcome_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'analytics_outcomes are append-only'; END; $$ LANGUAGE plpgsql`);
    await runner.query('CREATE TRIGGER trg_analytics_outcomes_append_only BEFORE UPDATE OR DELETE ON analytics_outcomes FOR EACH ROW EXECUTE FUNCTION prevent_analytics_outcome_mutation()');
    await runner.query('CREATE TRIGGER trg_analytics_outcomes_no_truncate BEFORE TRUNCATE ON analytics_outcomes FOR EACH STATEMENT EXECUTE FUNCTION prevent_analytics_outcome_mutation()');
  }
  async down(runner:QueryRunner):Promise<void>{
    const rows=await runner.query('SELECT id FROM analytics_outcomes LIMIT 1',[],true);
    if(rows.records.length)throw new Error('No se puede revertir: existen comparaciones conservadas.');
    await runner.query('DROP TABLE analytics_outcomes');await runner.query('DROP FUNCTION prevent_analytics_outcome_mutation');
    await runner.query('ALTER TABLE analytics_publications DROP CONSTRAINT uq_analytics_publication_outcome_reference');
  }
}
