import type { MigrationInterface, QueryRunner } from 'typeorm';

const constraints = [
  [
    'businesses',
    'ck_businesses_display_name_nonblank',
    'btrim("display_name") <> \'\'',
  ],
  ['users', 'ck_users_username_nonblank', 'btrim("username") <> \'\''],
  ['providers', 'ck_providers_name_nonblank', 'btrim("name") <> \'\''],
  [
    'providers',
    'ck_providers_phone_nonblank',
    '"phone" IS NULL OR btrim("phone") <> \'\'',
  ],
  [
    'potato_varieties',
    'ck_potato_varieties_name_nonblank',
    'btrim("name") <> \'\'',
  ],
  ['carriers', 'ck_carriers_name_nonblank', 'btrim("name") <> \'\''],
  [
    'carriers',
    'ck_carriers_phone_nonblank',
    '"phone" IS NULL OR btrim("phone") <> \'\'',
  ],
  ['vehicles', 'ck_vehicles_plate_nonblank', 'btrim("plate") <> \'\''],
  [
    'vehicles',
    'ck_vehicles_description_nonblank',
    '"description" IS NULL OR btrim("description") <> \'\'',
  ],
  ['buyers', 'ck_buyers_name_nonblank', 'btrim("name") <> \'\''],
  [
    'buyers',
    'ck_buyers_phone_nonblank',
    '"phone" IS NULL OR btrim("phone") <> \'\'',
  ],
  [
    'buyers',
    'ck_buyers_destination_department_nonblank',
    '"destination_department" IS NULL OR btrim("destination_department") <> \'\'',
  ],
  [
    'receptions',
    'ck_receptions_driver_name_nonblank',
    'btrim("driver_name") <> \'\'',
  ],
  [
    'receptions',
    'ck_receptions_provider_phone_nonblank',
    '"provider_phone" IS NULL OR btrim("provider_phone") <> \'\'',
  ],
] as const;

export class TextIntegrity1790294400007 implements MigrationInterface {
  name = 'TextIntegrity1790294400007';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name, expression] of constraints) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" CHECK (${expression})`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, name] of [...constraints].reverse()) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${name}"`,
      );
    }
  }
}
