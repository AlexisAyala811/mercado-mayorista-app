import type {MigrationInterface,QueryRunner} from 'typeorm';

export class OperationCharacteristics1791936000025 implements MigrationInterface {
  name='OperationCharacteristics1791936000025';
  async up(runner:QueryRunner):Promise<void>{
    for(const table of ['reception_sacks','sale_lines']){
      await runner.query(`ALTER TABLE ${table}
        ADD COLUMN quality_id uuid REFERENCES commercial_characteristics(id) ON DELETE RESTRICT,
        ADD COLUMN quality_name varchar(120),
        ADD COLUMN origin_id uuid REFERENCES commercial_characteristics(id) ON DELETE RESTRICT,
        ADD COLUMN origin_name varchar(120),
        ADD CONSTRAINT ck_${table}_quality_snapshot CHECK((quality_id IS NULL AND quality_name IS NULL) OR (quality_id IS NOT NULL AND quality_name IS NOT NULL AND length(btrim(quality_name))>0)),
        ADD CONSTRAINT ck_${table}_origin_snapshot CHECK((origin_id IS NULL AND origin_name IS NULL) OR (origin_id IS NOT NULL AND origin_name IS NOT NULL AND length(btrim(origin_name))>0))`);
    }
    await runner.query('DROP INDEX uq_sale_lines_sale_variety_new');
    await runner.query('CREATE UNIQUE INDEX uq_sale_lines_sale_characteristics_new ON sale_lines(sale_id,variety_id,quality_id,origin_id) NULLS NOT DISTINCT WHERE lot_id IS NULL');
  }
  async down(runner:QueryRunner):Promise<void>{
    for(const table of ['reception_sacks','sale_lines']){
      const rows=await runner.query(`SELECT id FROM ${table} WHERE quality_id IS NOT NULL OR origin_id IS NOT NULL LIMIT 1`,[],true);
      if(rows.records.length)throw new Error('No se puede revertir: existen características históricas conservadas.');
    }
    await runner.query('DROP INDEX uq_sale_lines_sale_characteristics_new');
    await runner.query('CREATE UNIQUE INDEX uq_sale_lines_sale_variety_new ON sale_lines(sale_id,variety_id) WHERE lot_id IS NULL');
    for(const table of ['reception_sacks','sale_lines'])await runner.query(`ALTER TABLE ${table} DROP CONSTRAINT ck_${table}_quality_snapshot,DROP CONSTRAINT ck_${table}_origin_snapshot,DROP COLUMN quality_id,DROP COLUMN quality_name,DROP COLUMN origin_id,DROP COLUMN origin_name`);
  }
}
