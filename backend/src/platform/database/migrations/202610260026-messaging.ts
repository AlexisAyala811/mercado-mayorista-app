import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Messaging1792972800026 implements MigrationInterface {
  name = 'Messaging1792972800026';
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`CREATE TABLE message_share_attempts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id),
      actor_user_id uuid NOT NULL REFERENCES users(id), client_operation_id uuid NOT NULL,
      recipient_id uuid NOT NULL, recipient_kind varchar(16) NOT NULL CHECK (recipient_kind IN ('buyer','provider')),
      recipient_name varchar(160) NOT NULL, channel varchar(16) NOT NULL CHECK (channel IN ('whatsapp','email')),
      filename varchar(160) NOT NULL, mime_type varchar(100) NOT NULL,
      size_bytes integer NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
      state varchar(24) NOT NULL CHECK (state IN ('prepared','sharing_requested','failed')),
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT uq_message_share_operation UNIQUE (business_id,client_operation_id)
    )`);
  }
  async down(runner: QueryRunner): Promise<void> {
    const rows: { count: string }[] = await runner.query('SELECT COUNT(*)::text AS count FROM message_share_attempts');
    if (rows[0]?.count !== '0') throw new Error('Hay metadatos de compartición conservados. No se elimina su historial.');
    await runner.query('DROP TABLE message_share_attempts');
  }
}
