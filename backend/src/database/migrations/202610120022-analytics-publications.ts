import type { MigrationInterface,QueryRunner } from 'typeorm';
export class AnalyticsPublications1791763200022 implements MigrationInterface {
  name='AnalyticsPublications1791763200022';
  async up(runner:QueryRunner):Promise<void>{
    await runner.query('ALTER TABLE analytics_evaluations ADD CONSTRAINT uq_analytics_evaluation_publication_reference UNIQUE(business_id,variety_id,id)');
    await runner.query(`CREATE TABLE analytics_publications (
      id uuid PRIMARY KEY,business_id uuid NOT NULL,variety_id uuid NOT NULL,evaluation_id uuid NOT NULL,
      client_operation_id uuid NOT NULL,forecast jsonb NOT NULL,reviewed_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      reviewed_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),retain_until timestamptz NOT NULL DEFAULT(now()+interval '5 years'),
      CONSTRAINT uq_analytics_publications_operation UNIQUE(business_id,client_operation_id),
      CONSTRAINT fk_analytics_publication_evaluation FOREIGN KEY(business_id,variety_id,evaluation_id) REFERENCES analytics_evaluations(business_id,variety_id,id) ON DELETE RESTRICT,
      CONSTRAINT ck_analytics_publication_retention CHECK(retain_until>=created_at+interval '5 years'),
      CONSTRAINT ck_analytics_publication_forecast CHECK(jsonb_typeof(forecast)='object')
    )`);
    await runner.query('CREATE INDEX ix_analytics_publications_business_variety ON analytics_publications(business_id,variety_id,created_at DESC,id DESC)');
    await runner.query(`CREATE FUNCTION prevent_analytics_publication_mutation() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'analytics_publications are append-only'; END; $$ LANGUAGE plpgsql`);
    await runner.query('CREATE TRIGGER trg_analytics_publications_append_only BEFORE UPDATE OR DELETE ON analytics_publications FOR EACH ROW EXECUTE FUNCTION prevent_analytics_publication_mutation()');
    await runner.query('CREATE TRIGGER trg_analytics_publications_no_truncate BEFORE TRUNCATE ON analytics_publications FOR EACH STATEMENT EXECUTE FUNCTION prevent_analytics_publication_mutation()');
  }
  async down(runner:QueryRunner):Promise<void>{
    const rows=await runner.query('SELECT id FROM analytics_publications LIMIT 1',[],true);
    if(rows.records.length)throw new Error('No se puede revertir: existen publicaciones conservadas.');
    await runner.query('DROP TABLE analytics_publications');await runner.query('DROP FUNCTION prevent_analytics_publication_mutation');
    await runner.query('ALTER TABLE analytics_evaluations DROP CONSTRAINT uq_analytics_evaluation_publication_reference');
  }
}
