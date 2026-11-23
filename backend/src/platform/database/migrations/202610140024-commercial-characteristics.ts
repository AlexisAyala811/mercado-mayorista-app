import type {MigrationInterface,QueryRunner} from 'typeorm';

export class CommercialCharacteristics1791936000024 implements MigrationInterface {
  name='CommercialCharacteristics1791936000024';
  async up(runner:QueryRunner):Promise<void>{
    await runner.query(`CREATE TABLE commercial_characteristics (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT,
      kind varchar(16) NOT NULL CHECK(kind IN ('quality','origin')),
      name varchar(120) NOT NULL CHECK(length(btrim(name))>0 AND name=btrim(name)),
      is_active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_commercial_characteristics_scope UNIQUE(business_id,id,kind)
    )`);
    await runner.query('CREATE INDEX ix_commercial_characteristics_business_kind ON commercial_characteristics(business_id,kind)');
    await runner.query('CREATE UNIQUE INDEX uq_commercial_characteristics_active_name ON commercial_characteristics(business_id,kind,lower(name)) WHERE is_active');
  }
  async down(runner:QueryRunner):Promise<void>{
    const rows=await runner.query('SELECT id FROM commercial_characteristics LIMIT 1',[],true);
    if(rows.records.length)throw new Error('No se puede revertir: existen características comerciales conservadas.');
    await runner.query('DROP TABLE commercial_characteristics');
  }
}
