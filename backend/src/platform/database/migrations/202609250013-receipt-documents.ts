import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceiptDocuments1790294400013 implements MigrationInterface {
  name = 'ReceiptDocuments1790294400013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "receipt_documents" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(), "business_id" uuid NOT NULL,
        "source_type" varchar(40) NOT NULL, "source_id" uuid NOT NULL,
        "source_version" varchar(120) NOT NULL, "filename" varchar(220) NOT NULL,
        "mime_type" varchar(80) NOT NULL, "content" bytea NOT NULL, "sha256" char(64) NOT NULL,
        "retention_until" timestamptz NOT NULL, "invalidated_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "pk_receipt_documents" PRIMARY KEY ("id"),
        CONSTRAINT "fk_receipt_documents_business" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT,
        CONSTRAINT "uq_receipt_documents_source_version" UNIQUE ("business_id", "source_type", "source_id", "source_version"),
        CONSTRAINT "ck_receipt_documents_source_nonblank" CHECK (btrim("source_type") <> '' AND btrim("source_version") <> ''),
        CONSTRAINT "ck_receipt_documents_filename_nonblank" CHECK (btrim("filename") <> ''),
        CONSTRAINT "ck_receipt_documents_mime" CHECK ("mime_type" = 'application/pdf'),
        CONSTRAINT "ck_receipt_documents_sha256" CHECK ("sha256" ~ '^[0-9a-f]{64}$'),
        CONSTRAINT "ck_receipt_documents_retention" CHECK ("retention_until" >= "created_at" + interval '5 years')
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "ix_receipt_documents_business_source"
      ON "receipt_documents" ("business_id", "source_type", "source_id")
    `);
    await queryRunner.query(`
      CREATE FUNCTION "protect_retained_receipt_document"() RETURNS trigger AS $$
      BEGIN
        IF OLD."retention_until" > now() THEN
          RAISE EXCEPTION 'receipt document is inside its retention period';
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER "trg_receipt_documents_retention"
      BEFORE DELETE ON "receipt_documents"
      FOR EACH ROW EXECUTE FUNCTION "protect_retained_receipt_document"()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "receipt_documents"`);
    await queryRunner.query(
      `DROP FUNCTION "protect_retained_receipt_document"`,
    );
  }
}
